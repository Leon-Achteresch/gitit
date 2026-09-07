use super::{run_git, run_git_merged_output, spawn_git};
use serde::Serialize;
use std::{collections::HashMap, path::PathBuf};

// ── Submodules ──────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct SubmoduleEntry {
    pub name: String,
    pub path: String,
    pub url: String,
    pub commit: String,
    pub status: String,
    pub description: Option<String>,
    pub branch: Option<String>,
    pub remote_commit: Option<String>,
    pub behind_count: Option<i32>,
    pub local_changes: Option<u32>,
    pub is_detached: bool,
    pub gitmodules_raw: String,
}

#[derive(Serialize, Clone)]
pub struct SubmoduleCommit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub is_pinned: bool,
}

fn extract_gitmodules_block(content: &str, name: &str) -> String {
    let header = format!("[submodule \"{name}\"]");
    let mut in_block = false;
    let mut lines: Vec<&str> = Vec::new();
    for line in content.lines() {
        if line.trim() == header.as_str() {
            in_block = true;
            lines.push(line);
        } else if in_block {
            if line.trim().starts_with('[') {
                break;
            }
            lines.push(line);
        }
    }
    lines.join("\n")
}

fn get_submodule_extra(sub_dir: &PathBuf) -> (bool, Option<String>, Option<i32>, Option<u32>) {
    if !sub_dir.join(".git").exists() && !sub_dir.join("HEAD").exists() {
        return (false, None, None, None);
    }

    let is_detached = run_git(sub_dir, &["symbolic-ref", "HEAD"]).is_err();

    let remote_commit = run_git(sub_dir, &["rev-parse", "--short", "@{u}"])
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let behind_count = if remote_commit.is_some() {
        run_git(sub_dir, &["rev-list", "--count", "HEAD..@{u}"])
            .ok()
            .and_then(|s| s.trim().parse::<i32>().ok())
    } else {
        None
    };

    let local_changes = run_git(sub_dir, &["status", "--porcelain"])
        .ok()
        .map(|s| s.lines().filter(|l| !l.trim().is_empty()).count() as u32);

    (is_detached, remote_commit, behind_count, local_changes)
}

fn parse_gitmodules(content: &str) -> Vec<(String, String, Option<String>, Option<String>)> {
    let mut entries: Vec<(String, String, Option<String>, Option<String>)> = Vec::new();
    let mut current_name: Option<String> = None;
    let mut current_path: Option<String> = None;
    let mut current_url: Option<String> = None;
    let mut current_branch: Option<String> = None;

    let flush = |name: Option<String>,
                 path: Option<String>,
                 url: Option<String>,
                 branch: Option<String>,
                 entries: &mut Vec<_>| {
        if let Some(n) = name {
            entries.push((n, path.unwrap_or_default(), url, branch));
        }
    };

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("[submodule") {
            flush(current_name.take(), current_path.take(), current_url.take(), current_branch.take(), &mut entries);
            if let (Some(s), Some(e)) = (line.find('"'), line.rfind('"')) {
                if s < e {
                    current_name = Some(line[s + 1..e].to_string());
                }
            }
        } else if let Some((k, v)) = line.split_once('=') {
            match k.trim() {
                "path" => current_path = Some(v.trim().to_string()),
                "url" => current_url = Some(v.trim().to_string()),
                "branch" => current_branch = Some(v.trim().to_string()),
                _ => {}
            }
        }
    }
    flush(current_name, current_path, current_url, current_branch, &mut entries);
    entries
}

#[tauri::command]
pub async fn list_submodules(path: String) -> Result<Vec<SubmoduleEntry>, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());

        let gitmodules_content = std::fs::read_to_string(repo.join(".gitmodules")).unwrap_or_default();
        let defs = parse_gitmodules(&gitmodules_content);

        let mut by_path: HashMap<String, (String, Option<String>, Option<String>)> = HashMap::new();
        for (name, mod_path, url, branch) in &defs {
            by_path.insert(mod_path.clone(), (name.clone(), url.clone(), branch.clone()));
        }

        let status_out = run_git(&repo, &["submodule", "status"]).unwrap_or_default();

        let mut entries: Vec<SubmoduleEntry> = Vec::new();
        for line in status_out.lines() {
            if line.is_empty() {
                continue;
            }
            let prefix = &line[..1];
            let rest = &line[1..];
            let mut parts = rest.splitn(3, ' ');
            let Some(commit) = parts.next() else { continue };
            let Some(sub_path) = parts.next() else { continue };
            let description = parts.next().map(|d| {
                let d = d.trim();
                if d.starts_with('(') && d.ends_with(')') {
                    d[1..d.len() - 1].to_string()
                } else {
                    d.to_string()
                }
            });

            let status = match prefix {
                "+" => "modified",
                "-" => "uninitialized",
                "U" => "conflict",
                _ => "initialized",
            }
            .to_string();

            let (name, url, branch) = by_path
                .get(sub_path)
                .cloned()
                .unwrap_or_else(|| (sub_path.to_string(), None, None));

            let sub_dir = repo.join(sub_path);
            let (is_detached, remote_commit, behind_count, local_changes) =
                if status != "uninitialized" {
                    get_submodule_extra(&sub_dir)
                } else {
                    (false, None, None, None)
                };

            let gitmodules_raw = extract_gitmodules_block(&gitmodules_content, &name);

            entries.push(SubmoduleEntry {
                name,
                path: sub_path.to_string(),
                url: url.unwrap_or_default(),
                commit: commit.to_string(),
                status,
                description,
                branch,
                remote_commit,
                behind_count,
                local_changes,
                is_detached,
                gitmodules_raw,
            });
        }

        if entries.is_empty() && !defs.is_empty() {
            for (name, mod_path, url, branch) in defs {
                let gitmodules_raw = extract_gitmodules_block(&gitmodules_content, &name);
                entries.push(SubmoduleEntry {
                    name,
                    path: mod_path,
                    url: url.unwrap_or_default(),
                    commit: String::new(),
                    status: "uninitialized".to_string(),
                    description: None,
                    branch,
                    remote_commit: None,
                    behind_count: None,
                    local_changes: None,
                    is_detached: false,
                    gitmodules_raw,
                });
            }
        }

        Ok(entries)
    }).await
}

#[tauri::command]
pub async fn get_submodule_commits(
    path: String,
    submodule_path: String,
    pinned_commit: String,
) -> Result<Vec<SubmoduleCommit>, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let sub_dir = repo.join(submodule_path.trim());

        let out = run_git(
            &sub_dir,
            &["log", "--format=%H|%h|%s|%an|%ar", "-10"],
        )?;

        let commits = out
            .lines()
            .filter(|l| !l.trim().is_empty())
            .map(|line| {
                let parts: Vec<&str> = line.splitn(5, '|').collect();
                let hash = parts.first().unwrap_or(&"").to_string();
                let short_hash = parts.get(1).unwrap_or(&"").to_string();
                let message = parts.get(2).unwrap_or(&"").to_string();
                let author = parts.get(3).unwrap_or(&"").to_string();
                let date = parts.get(4).unwrap_or(&"").to_string();
                let is_pinned = hash.starts_with(&pinned_commit)
                    || pinned_commit.starts_with(&hash)
                    || short_hash == pinned_commit
                    || pinned_commit.starts_with(&short_hash);
                SubmoduleCommit {
                    hash,
                    short_hash,
                    message,
                    author,
                    date,
                    is_pinned,
                }
            })
            .collect();

        Ok(commits)
    }).await
}

#[tauri::command]
pub async fn git_submodule_init(path: String, submodule_path: Option<String>) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let mut args = vec!["submodule", "init"];
        let sub = submodule_path.unwrap_or_default();
        if !sub.is_empty() {
            args.push("--");
            args.push(sub.as_str());
        }
        run_git_merged_output(&repo, &args)
    }).await
}

#[tauri::command]
pub async fn git_submodule_update(
    path: String,
    submodule_path: Option<String>,
    init: bool,
    recursive: bool,
) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let mut args = vec!["submodule", "update"];
        if init {
            args.push("--init");
        }
        if recursive {
            args.push("--recursive");
        }
        let sub = submodule_path.unwrap_or_default();
        if !sub.is_empty() {
            args.push("--");
            args.push(sub.as_str());
        }
        run_git_merged_output(&repo, &args)
    }).await
}

#[tauri::command]
pub async fn git_submodule_sync(
    path: String,
    submodule_path: Option<String>,
) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let mut args = vec!["submodule", "sync"];
        let sub = submodule_path.unwrap_or_default();
        if !sub.is_empty() {
            args.push("--");
            args.push(sub.as_str());
        }
        run_git_merged_output(&repo, &args)
    }).await
}

#[tauri::command]
pub async fn git_submodule_add(
    path: String,
    url: String,
    subpath: String,
    name: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let mut args: Vec<String> = vec!["submodule".into(), "add".into()];
        if let Some(b) = branch {
            if !b.is_empty() {
                args.push("-b".into());
                args.push(b);
            }
        }
        if let Some(n) = name {
            if !n.is_empty() {
                args.push("--name".into());
                args.push(n);
            }
        }
        args.push(url);
        args.push(subpath);
        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        run_git_merged_output(&repo, &arg_refs)
    }).await
}

#[tauri::command]
pub async fn git_submodule_deinit(
    path: String,
    submodule_path: String,
    force: bool,
) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let mut args = vec!["submodule", "deinit"];
        if force {
            args.push("--force");
        }
        args.push("--");
        args.push(submodule_path.as_str());
        run_git_merged_output(&repo, &args)
    }).await
}
