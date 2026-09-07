use super::{run_git, spawn_git};
use serde::Serialize;
use std::{path::PathBuf, process::Stdio};
#[cfg(target_os = "windows")]
use std::path::Path;

// ── Git Hooks ────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct GitHookEntry {
    pub name: String,
    pub exists: bool,
    pub is_enabled: bool,
    pub content_size: u64,
}

fn resolve_hooks_dir(repo: &PathBuf) -> Result<PathBuf, String> {
    let git_dir = run_git(repo, &["rev-parse", "--git-dir"])
        .map(|s| s.trim().to_string())?;

    let custom = run_git(repo, &["config", "--get", "core.hooksPath"])
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if let Some(p) = custom {
        let abs = if std::path::Path::new(&p).is_absolute() {
            PathBuf::from(&p)
        } else {
            repo.join(&p)
        };
        return Ok(abs);
    }

    let git_dir_path = if std::path::Path::new(&git_dir).is_absolute() {
        PathBuf::from(&git_dir)
    } else {
        repo.join(&git_dir)
    };
    Ok(git_dir_path.join("hooks"))
}

const ALL_HOOKS: &[&str] = &[
    "pre-commit",
    "prepare-commit-msg",
    "commit-msg",
    "post-commit",
    "pre-merge-commit",
    "applypatch-msg",
    "pre-applypatch",
    "post-applypatch",
    "pre-rebase",
    "post-rewrite",
    "post-merge",
    "post-checkout",
    "reference-transaction",
    "pre-push",
    "pre-auto-gc",
    "post-index-change",
    "fsmonitor-watchman",
    "pre-receive",
    "update",
    "proc-receive",
    "post-receive",
    "post-update",
    "push-to-checkout",
];

#[tauri::command]
pub async fn list_git_hooks(path: String) -> Result<Vec<GitHookEntry>, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let hooks_dir = resolve_hooks_dir(&repo)?;
        let mut entries = Vec::new();
        for &name in ALL_HOOKS {
            let hook_path = hooks_dir.join(name);
            let exists = hook_path.exists();
            let content_size = if exists {
                std::fs::metadata(&hook_path).map(|m| m.len()).unwrap_or(0)
            } else {
                0
            };
            #[cfg(unix)]
            let is_enabled = {
                use std::os::unix::fs::PermissionsExt;
                if exists {
                    std::fs::metadata(&hook_path)
                        .map(|m| m.permissions().mode() & 0o111 != 0)
                        .unwrap_or(false)
                } else {
                    false
                }
            };
            #[cfg(not(unix))]
            let is_enabled = exists;
            entries.push(GitHookEntry {
                name: name.to_string(),
                exists,
                is_enabled,
                content_size,
            });
        }
        Ok(entries)
    }).await
}

#[tauri::command]
pub async fn get_git_hook_content(path: String, hook_name: String) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let name = hook_name.trim().to_string();
        if !ALL_HOOKS.contains(&name.as_str()) {
            return Err(format!("Unbekannter Hook-Name: {name}"));
        }
        let hook_path = resolve_hooks_dir(&repo)?.join(&name);
        if !hook_path.exists() {
            return Ok(String::new());
        }
        std::fs::read_to_string(&hook_path)
            .map_err(|e| format!("Fehler beim Lesen des Hooks: {e}"))
    }).await
}

#[tauri::command]
pub async fn save_git_hook(path: String, hook_name: String, content: String) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let name = hook_name.trim().to_string();
        if !ALL_HOOKS.contains(&name.as_str()) {
            return Err(format!("Unbekannter Hook-Name: {name}"));
        }
        let hooks_dir = resolve_hooks_dir(&repo)?;
        std::fs::create_dir_all(&hooks_dir)
            .map_err(|e| format!("Hooks-Verzeichnis konnte nicht erstellt werden: {e}"))?;
        let hook_path = hooks_dir.join(&name);
        std::fs::write(&hook_path, &content)
            .map_err(|e| format!("Fehler beim Schreiben des Hooks: {e}"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&hook_path)
                .map_err(|e| format!("{e}"))?
                .permissions();
            perms.set_mode(perms.mode() | 0o111);
            std::fs::set_permissions(&hook_path, perms)
                .map_err(|e| format!("Fehler beim Setzen der Ausführungsrechte: {e}"))?;
        }
        Ok(())
    }).await
}

#[tauri::command]
pub async fn delete_git_hook(path: String, hook_name: String) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let name = hook_name.trim().to_string();
        if !ALL_HOOKS.contains(&name.as_str()) {
            return Err(format!("Unbekannter Hook-Name: {name}"));
        }
        let hook_path = resolve_hooks_dir(&repo)?.join(&name);
        if !hook_path.exists() {
            return Ok(());
        }
        std::fs::remove_file(&hook_path)
            .map_err(|e| format!("Fehler beim Löschen des Hooks: {e}"))
    }).await
}

#[tauri::command]
pub async fn toggle_git_hook(path: String, hook_name: String, enabled: bool) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let name = hook_name.trim().to_string();
        if !ALL_HOOKS.contains(&name.as_str()) {
            return Err(format!("Unbekannter Hook-Name: {name}"));
        }
        let hook_path = resolve_hooks_dir(&repo)?.join(&name);
        if !hook_path.exists() {
            return Err(format!("Hook '{name}' ist nicht installiert."));
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&hook_path)
                .map_err(|e| format!("{e}"))?
                .permissions();
            if enabled {
                perms.set_mode(perms.mode() | 0o111);
            } else {
                perms.set_mode(perms.mode() & !0o111);
            }
            std::fs::set_permissions(&hook_path, perms)
                .map_err(|e| format!("Fehler beim Setzen der Berechtigungen: {e}"))?;
        }
        #[cfg(not(unix))]
        let _ = enabled;
        Ok(())
    }).await
}

#[derive(Serialize)]
pub struct HookRunResult {
    pub exit_code: i32,
    pub output: String,
}

/// Hooks are POSIX scripts. On Windows the interpreter ships inside Git itself
/// and is usually not on PATH, so derive it from `git --exec-path`.
fn hook_shell(repo: &PathBuf) -> String {
    #[cfg(target_os = "windows")]
    {
        if let Ok(exec) = run_git(repo, &["--exec-path"]) {
            // …/Git/mingw64/libexec/git-core → …/Git/usr/bin/sh.exe
            if let Some(root) = Path::new(exec.trim()).ancestors().nth(3) {
                let sh = root.join("usr").join("bin").join("sh.exe");
                if sh.exists() {
                    return sh.to_string_lossy().into_owned();
                }
            }
        }
    }
    let _ = repo;
    "sh".to_string()
}

#[tauri::command]
pub async fn run_git_hook(path: String, hook_name: String) -> Result<HookRunResult, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let name = hook_name.trim().to_string();
        if !ALL_HOOKS.contains(&name.as_str()) {
            return Err(format!("Unbekannter Hook-Name: {name}"));
        }
        let hook_path = resolve_hooks_dir(&repo)?.join(&name);
        if !hook_path.exists() {
            return Err(format!("Hook '{name}' ist nicht installiert."));
        }

        let mut cmd = crate::cmd::cli_command(hook_shell(&repo));
        cmd.current_dir(&repo)
            .stdin(Stdio::null())
            .arg(hook_path.to_string_lossy().replace('\\', "/"));

        // ponytail: message hooks need $1 — the last commit message is the
        // closest stand-in for a manual run. Other hooks run without args;
        // stdin-driven ones (pre-push, server hooks) just see EOF.
        let msg_file = matches!(
            name.as_str(),
            "commit-msg" | "prepare-commit-msg" | "applypatch-msg"
        )
        .then(|| {
            let msg = run_git(&repo, &["log", "-1", "--pretty=%B"]).unwrap_or_default();
            let file = std::env::temp_dir().join(format!("l8git-hook-msg-{}", std::process::id()));
            std::fs::write(&file, msg).ok()?;
            cmd.arg(file.to_string_lossy().replace('\\', "/"));
            Some(file)
        })
        .flatten();

        let output = cmd
            .output()
            .map_err(|e| format!("Hook konnte nicht gestartet werden: {e}"))?;
        if let Some(f) = msg_file {
            let _ = std::fs::remove_file(f);
        }

        let mut text = String::from_utf8_lossy(&output.stdout).into_owned();
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.trim().is_empty() {
            if !text.is_empty() && !text.ends_with('\n') {
                text.push('\n');
            }
            text.push_str(&stderr);
        }
        Ok(HookRunResult {
            exit_code: output.status.code().unwrap_or(-1),
            output: text.trim_end().to_string(),
        })
    })
    .await
}

#[cfg(test)]
mod hook_run_tests {
    use super::*;

    #[tokio::test]
    async fn runs_hook_and_reports_exit_code() {
        let dir = std::env::temp_dir().join(format!("l8git-hooktest-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        run_git(&dir, &["init"]).unwrap();
        let hooks = resolve_hooks_dir(&dir).unwrap();
        std::fs::create_dir_all(&hooks).unwrap();
        std::fs::write(
            hooks.join("pre-commit"),
            "#!/bin/sh\necho hallo-hook\nexit 3\n",
        )
        .unwrap();

        let res = run_git_hook(dir.to_string_lossy().into_owned(), "pre-commit".into())
            .await
            .unwrap();
        assert_eq!(res.exit_code, 3);
        assert!(res.output.contains("hallo-hook"), "output: {}", res.output);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
