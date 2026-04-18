use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;

#[derive(Serialize)]
struct Commit {
    hash: String,
    short_hash: String,
    author: String,
    email: String,
    date: String,
    subject: String,
    parents: Vec<String>,
}

#[derive(Serialize)]
struct Branch {
    name: String,
    is_current: bool,
    is_remote: bool,
}

#[derive(Serialize)]
struct RepoInfo {
    path: String,
    branch: String,
    commits: Vec<Commit>,
    branches: Vec<Branch>,
}

fn run_git(repo: &PathBuf, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        .output()
        .map_err(|e| format!("failed to run git: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
fn open_repo(path: String) -> Result<RepoInfo, String> {
    let repo = PathBuf::from(&path);

    run_git(&repo, &["rev-parse", "--is-inside-work-tree"])
        .map_err(|_| format!("'{path}' is not a git repository"))?;

    let branch = run_git(&repo, &["rev-parse", "--abbrev-ref", "HEAD"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "HEAD".into());

    // Use an uncommon separator so commit subjects don't collide.
    let sep = "\x1f";
    let format = format!("%H{sep}%h{sep}%an{sep}%ae{sep}%cI{sep}%P{sep}%s");

    let log = run_git(
        &repo,
        &[
            "log",
            "--max-count=200",
            "--all",
            "--date-order",
            &format!("--pretty=format:{format}"),
        ],
    )?;

    let commits = log
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(7, sep);
            let hash = parts.next()?.to_string();
            let short_hash = parts.next()?.to_string();
            let author = parts.next()?.to_string();
            let email = parts.next()?.to_string();
            let date = parts.next()?.to_string();
            let parents_str = parts.next()?;
            let subject = parts.next()?.to_string();
            let parents = parents_str
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();
            Some(Commit {
                hash,
                short_hash,
                author,
                email,
                date,
                subject,
                parents,
            })
        })
        .collect();

    let branches = list_branches(&repo).unwrap_or_default();

    Ok(RepoInfo {
        path: repo.to_string_lossy().to_string(),
        branch,
        commits,
        branches,
    })
}

#[derive(Serialize)]
struct GitAccount {
    id: String,
    name: String,
    host: String,
    username: Option<String>,
    signed_in: bool,
    builtin: bool,
}

const BUILTIN_PROVIDERS: &[(&str, &str, &str)] = &[
    ("github", "GitHub", "github.com"),
    ("gitlab", "GitLab", "gitlab.com"),
    ("bitbucket", "Bitbucket", "bitbucket.org"),
    ("azure", "Azure DevOps", "dev.azure.com"),
];

fn git_credential(
    action: &str,
    input: &str,
    forbid_interactive: bool,
    max_wait: Duration,
) -> Result<String, String> {
    let mut cmd = Command::new("git");
    if forbid_interactive {
        cmd.arg("-c")
            .arg("credential.interactive=false")
            .env("GCM_INTERACTIVE", "false");
    }
    let mut child = cmd
        .args(["credential", action])
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to run git: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| format!("failed to write credential input: {e}"))?;
    }

    let deadline = Instant::now() + max_wait;
    loop {
        if Instant::now() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(
                "Git Credential: Zeitüberschreitung oder Fenster geschlossen bevor die Anmeldung fertig war."
                    .into(),
            );
        }
        match child
            .try_wait()
            .map_err(|e| format!("Git Credential: {e}"))?
        {
            Some(status) => {
                let mut stdout_buf = Vec::new();
                let mut stderr_buf = Vec::new();
                if let Some(mut out) = child.stdout.take() {
                    let _ = out.read_to_end(&mut stdout_buf);
                }
                if let Some(mut err) = child.stderr.take() {
                    let _ = err.read_to_end(&mut stderr_buf);
                }
                if !status.success() {
                    let msg = String::from_utf8_lossy(&stderr_buf).trim().to_string();
                    if msg.is_empty() {
                        return Err(
                            "Git Credential abgebrochen (z. B. Credential-Manager geschlossen)."
                                .into(),
                        );
                    }
                    return Err(msg);
                }
                return Ok(String::from_utf8_lossy(&stdout_buf).to_string());
            }
            None => thread::sleep(Duration::from_millis(80)),
        }
    }
}

fn credential_lookup(host: &str) -> Option<String> {
    let input = format!("protocol=https\nhost={host}\n\n");
    let out = git_credential("fill", &input, true, Duration::from_secs(25))
        .ok()?;
    let mut username = None;
    let mut has_password = false;
    for line in out.lines() {
        if let Some(u) = line.strip_prefix("username=") {
            username = Some(u.to_string());
        } else if line.starts_with("password=") {
            has_password = true;
        }
    }
    if has_password {
        Some(username.unwrap_or_default())
    } else {
        None
    }
}

#[tauri::command]
fn list_git_accounts() -> Vec<GitAccount> {
    let handles: Vec<_> = BUILTIN_PROVIDERS
        .iter()
        .enumerate()
        .map(|(i, (id, name, host))| {
            let id = id.to_string();
            let name = name.to_string();
            let host = host.to_string();
            thread::spawn(move || {
                let username = credential_lookup(&host);
                (
                    i,
                    GitAccount {
                        id,
                        name,
                        host,
                        signed_in: username.is_some(),
                        username,
                        builtin: true,
                    },
                )
            })
        })
        .collect();
    let mut pairs: Vec<(usize, GitAccount)> = handles
        .into_iter()
        .map(|h| h.join().expect("credential lookup thread"))
        .collect();
    pairs.sort_by_key(|(i, _)| *i);
    pairs.into_iter().map(|(_, a)| a).collect()
}

#[tauri::command]
fn probe_git_account(id: String, name: String, host: String) -> GitAccount {
    let username = credential_lookup(&host);
    GitAccount {
        id,
        name,
        host,
        signed_in: username.is_some(),
        username,
        builtin: false,
    }
}

#[tauri::command]
fn git_sign_in(host: String, username: String, token: String) -> Result<(), String> {
    let host = host.trim();
    if host.is_empty() {
        return Err("Host darf nicht leer sein".into());
    }
    if username.trim().is_empty() {
        return Err("Benutzername darf nicht leer sein".into());
    }
    if token.is_empty() {
        return Err("Token darf nicht leer sein".into());
    }
    let input = format!("protocol=https\nhost={host}\nusername={username}\npassword={token}\n\n");
    git_credential("approve", &input, true, Duration::from_secs(45))?;
    Ok(())
}

#[tauri::command]
fn git_sign_in_via_credential_manager(host: String) -> Result<(), String> {
    let host = host.trim();
    if host.is_empty() {
        return Err("Host darf nicht leer sein".into());
    }
    let input = format!("protocol=https\nhost={host}\n\n");
    let filled = git_credential(
        "fill",
        &input,
        false,
        Duration::from_secs(180),
    )?;
    let mut has_password = false;
    for line in filled.lines() {
        if line.starts_with("password=") && line.len() > "password=".len() {
            has_password = true;
            break;
        }
    }
    if !has_password {
        return Err(
            "Keine Zugangsdaten erhalten. Bitte Anmeldung im Credential Manager abschließen oder abbrechen."
                .into(),
        );
    }
    git_credential("approve", &filled, true, Duration::from_secs(45))?;
    Ok(())
}

#[tauri::command]
fn git_sign_out(host: String, username: Option<String>) -> Result<(), String> {
    let mut input = format!("protocol=https\nhost={host}\n");
    if let Some(u) = username.filter(|u| !u.is_empty()) {
        input.push_str(&format!("username={u}\n"));
    }
    input.push('\n');
    git_credential("reject", &input, true, Duration::from_secs(45))?;
    Ok(())
}

#[tauri::command]
fn git_credential_helper() -> Option<String> {
    let out = Command::new("git")
        .args(["config", "--get", "credential.helper"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

#[tauri::command]
fn delete_branch(path: String, name: String, force: bool) -> Result<(), String> {
    let repo = PathBuf::from(&path);
    let flag = if force { "-D" } else { "-d" };
    run_git(&repo, &["branch", flag, &name])?;
    Ok(())
}

fn list_branches(repo: &PathBuf) -> Result<Vec<Branch>, String> {
    let sep = "\x1f";
    let format = format!("%(HEAD){sep}%(refname)");
    let out = run_git(
        repo,
        &[
            "for-each-ref",
            "--sort=-committerdate",
            &format!("--format={format}"),
            "refs/heads",
            "refs/remotes",
        ],
    )?;

    let branches = out
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(2, sep);
            let head = parts.next()?;
            let refname = parts.next()?;
            let is_current = head.trim() == "*";

            let (name, is_remote) = if let Some(rest) = refname.strip_prefix("refs/heads/") {
                (rest.to_string(), false)
            } else if let Some(rest) = refname.strip_prefix("refs/remotes/") {
                if rest.ends_with("/HEAD") {
                    return None;
                }
                (rest.to_string(), true)
            } else {
                return None;
            };

            Some(Branch {
                name,
                is_current,
                is_remote,
            })
        })
        .collect();

    Ok(branches)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            use tauri::menu::{MenuBuilder, SubmenuBuilder};

            let app_menu = SubmenuBuilder::new(app, "gitit")
                .text("nav-repo", "Repository")
                .text("nav-about", "About")
                .text("nav-settings", "Einstellungen");

            #[cfg(target_os = "macos")]
            let app_menu = app_menu.separator().quit();

            let app_menu = app_menu.build()?;

            let menu = MenuBuilder::new(app).items(&[&app_menu]).build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            use tauri::Emitter;

            let path = match event.id().as_ref() {
                "nav-repo" => Some("/"),
                "nav-about" => Some("/about"),
                "nav-settings" => Some("/settings"),
                _ => None,
            };

            if let Some(path) = path {
                let _ = app.emit("menu-navigate", path);
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_repo,
            delete_branch,
            list_git_accounts,
            probe_git_account,
            git_sign_in,
            git_sign_in_via_credential_manager,
            git_sign_out,
            git_credential_helper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
