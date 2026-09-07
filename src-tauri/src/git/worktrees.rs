use super::{run_git, run_git_merged_output, spawn_git};
use serde::Serialize;
use std::path::PathBuf;

// ── Worktrees ────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct WorktreeEntry {
    pub path: String,
    pub head: String,
    pub branch: Option<String>,
    pub is_main: bool,
    pub is_locked: bool,
    pub lock_reason: Option<String>,
    pub is_prunable: bool,
    pub prunable_reason: Option<String>,
}

fn parse_worktree_list(output: &str) -> Vec<WorktreeEntry> {
    let mut entries = Vec::new();
    let mut is_first = true;

    for block in output.split("\n\n") {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let mut wt_path = String::new();
        let mut head = String::new();
        let mut branch: Option<String> = None;
        let mut is_locked = false;
        let mut lock_reason: Option<String> = None;
        let mut is_prunable = false;
        let mut prunable_reason: Option<String> = None;

        for line in block.lines() {
            if let Some(v) = line.strip_prefix("worktree ") {
                wt_path = v.trim().to_string();
            } else if let Some(v) = line.strip_prefix("HEAD ") {
                let h = v.trim();
                head = h[..h.len().min(7)].to_string();
            } else if let Some(v) = line.strip_prefix("branch ") {
                let refname = v.trim();
                branch = Some(
                    refname
                        .strip_prefix("refs/heads/")
                        .unwrap_or(refname)
                        .to_string(),
                );
            } else if line.trim() == "detached" {
                branch = None;
            } else if line.trim() == "locked" {
                is_locked = true;
            } else if let Some(v) = line.strip_prefix("locked ") {
                is_locked = true;
                let r = v.trim();
                if !r.is_empty() {
                    lock_reason = Some(r.to_string());
                }
            } else if line.trim() == "prunable" {
                is_prunable = true;
            } else if let Some(v) = line.strip_prefix("prunable ") {
                is_prunable = true;
                let r = v.trim();
                if !r.is_empty() {
                    prunable_reason = Some(r.to_string());
                }
            }
        }

        if wt_path.is_empty() {
            continue;
        }

        entries.push(WorktreeEntry {
            path: wt_path,
            head,
            branch,
            is_main: is_first,
            is_locked,
            lock_reason,
            is_prunable,
            prunable_reason,
        });
        is_first = false;
    }
    entries
}

#[tauri::command]
pub async fn list_worktrees(path: String) -> Result<Vec<WorktreeEntry>, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let out = run_git(&repo, &["worktree", "list", "--porcelain"])?;
        Ok(parse_worktree_list(&out))
    }).await
}

#[tauri::command]
pub async fn git_worktree_add(
    path: String,
    worktree_path: String,
    branch: Option<String>,
    new_branch: Option<String>,
) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let wt = worktree_path.trim().to_string();
        if wt.is_empty() {
            return Err("Worktree-Pfad darf nicht leer sein".into());
        }
        let mut args: Vec<String> = vec!["worktree".into(), "add".into()];
        if let Some(nb) = new_branch.filter(|s| !s.trim().is_empty()) {
            args.push("-b".into());
            args.push(nb.trim().to_string());
        }
        args.push(wt);
        if let Some(b) = branch.filter(|s| !s.trim().is_empty()) {
            args.push(b.trim().to_string());
        }
        let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        run_git_merged_output(&repo, &refs)
    }).await
}

#[tauri::command]
pub async fn git_worktree_remove(
    path: String,
    worktree_path: String,
    force: bool,
) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let wt = worktree_path.trim().to_string();
        if wt.is_empty() {
            return Err("Worktree-Pfad darf nicht leer sein".into());
        }
        let mut args = vec!["worktree", "remove"];
        if force {
            args.push("--force");
        }
        args.push(wt.as_str());
        run_git(&repo, &args)?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn git_worktree_lock(
    path: String,
    worktree_path: String,
    reason: Option<String>,
) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let wt = worktree_path.trim().to_string();
        let mut args: Vec<String> = vec!["worktree".into(), "lock".into()];
        if let Some(r) = reason.filter(|s| !s.trim().is_empty()) {
            args.push("--reason".into());
            args.push(r.trim().to_string());
        }
        args.push(wt);
        let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        run_git(&repo, &refs)?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn git_worktree_unlock(path: String, worktree_path: String) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let wt = worktree_path.trim().to_string();
        run_git(&repo, &["worktree", "unlock", wt.as_str()])?;
        Ok(())
    }).await
}

#[tauri::command]
pub async fn git_worktree_prune(path: String) -> Result<String, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        run_git_merged_output(&repo, &["worktree", "prune", "--verbose"])
    }).await
}

#[tauri::command]
pub async fn git_worktree_move(
    path: String,
    worktree_path: String,
    new_path: String,
) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let wt = worktree_path.trim().to_string();
        let np = new_path.trim().to_string();
        if wt.is_empty() || np.is_empty() {
            return Err("Worktree-Pfad darf nicht leer sein".into());
        }
        run_git(&repo, &["worktree", "move", wt.as_str(), np.as_str()])?;
        Ok(())
    }).await
}
