use super::{run_git, run_git_merged_output, spawn_git};
use serde::Serialize;
use std::path::PathBuf;

// ── Git Bisect ────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct BisectStatus {
    pub active: bool,
    pub done: bool,
    pub current_hash: Option<String>,
    pub current_subject: Option<String>,
    pub steps_remaining: Option<i32>,
    pub log: String,
    pub result_hash: Option<String>,
    pub result_subject: Option<String>,
    pub marked_bad: Vec<String>,
    pub marked_good: Vec<String>,
}

fn bisect_parse_log_marks(log: &str) -> (Vec<String>, Vec<String>) {
    let mut bad: Vec<String> = Vec::new();
    let mut good: Vec<String> = Vec::new();
    for line in log.lines() {
        let line = line.trim();
        // Lines like: # bad: [abc1234] subject  or  # good: [abc1234] subject
        if let Some(rest) = line.strip_prefix("# bad: [") {
            if let Some(end) = rest.find(']') {
                let hash = rest[..end].to_string();
                if !bad.contains(&hash) {
                    bad.push(hash);
                }
            }
        } else if let Some(rest) = line.strip_prefix("# good: [") {
            if let Some(end) = rest.find(']') {
                let hash = rest[..end].to_string();
                if !good.contains(&hash) {
                    good.push(hash);
                }
            }
        }
    }
    (bad, good)
}

fn bisect_build_status(repo: &PathBuf) -> Result<BisectStatus, String> {
    let bisect_log_path = repo.join(run_git(repo, &["rev-parse", "--git-path", "BISECT_LOG"] )?.trim());
    if !bisect_log_path.exists() {
        return Ok(BisectStatus {
            active: false,
            done: false,
            current_hash: None,
            current_subject: None,
            steps_remaining: None,
            log: String::new(),
            result_hash: None,
            result_subject: None,
            marked_bad: vec![],
            marked_good: vec![],
        });
    }

    let log = std::fs::read_to_string(&bisect_log_path).unwrap_or_default();

    let steps_remaining = log
        .lines()
        .rev()
        .find_map(|l| {
            let l = l.trim();
            if let Some(pos) = l.find("roughly ") {
                let rest = &l[pos + 8..];
                rest.split_whitespace().next().and_then(|n| n.parse::<i32>().ok())
            } else {
                None
            }
        });

    let current_hash = run_git(repo, &["rev-parse", "HEAD"]).ok().map(|s| s.trim().to_string());
    let current_subject = current_hash.as_ref().and_then(|h| {
        run_git(repo, &["log", "-1", "--format=%s", h]).ok().map(|s| s.trim().to_string())
    });

    let (marked_bad, marked_good) = bisect_parse_log_marks(&log);

    Ok(BisectStatus {
        active: true,
        done: false,
        current_hash,
        current_subject,
        steps_remaining,
        log,
        result_hash: None,
        result_subject: None,
        marked_bad,
        marked_good,
    })
}

fn bisect_parse_output(repo: &PathBuf, output: &str) -> Result<BisectStatus, String> {
    if let Some(line) = output.lines().find(|l| l.contains("is the first bad commit")) {
        let result_hash = line.split_whitespace().next().map(|s| s.to_string());
        let result_subject = result_hash.as_ref().and_then(|h| {
            run_git(repo, &["log", "-1", "--format=%s", h]).ok().map(|s| s.trim().to_string())
        });
        // Read log marks even for the done state
        let log = std::fs::read_to_string(repo.join(run_git(repo, &["rev-parse", "--git-path", "BISECT_LOG"] )?.trim())).unwrap_or_default();
        let (marked_bad, marked_good) = bisect_parse_log_marks(&log);
        return Ok(BisectStatus {
            active: true,
            done: true,
            current_hash: result_hash.clone(),
            current_subject: result_subject.clone(),
            steps_remaining: None,
            log,
            result_hash,
            result_subject,
            marked_bad,
            marked_good,
        });
    }
    bisect_build_status(repo)
}

#[tauri::command]
pub async fn git_bisect_status(path: String) -> Result<BisectStatus, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        bisect_build_status(&repo)
    }).await
}

#[tauri::command]
pub async fn git_bisect_start(path: String, bad: String, good: String) -> Result<BisectStatus, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        run_git_merged_output(&repo, &["bisect", "start"])?;
        run_git_merged_output(&repo, &["bisect", "bad", bad.trim()])?;
        let out = run_git_merged_output(&repo, &["bisect", "good", good.trim()])?;
        bisect_parse_output(&repo, &out)
    }).await
}

#[tauri::command]
pub async fn git_bisect_mark(path: String, verdict: String) -> Result<BisectStatus, String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        let v = verdict.trim();
        if v != "good" && v != "bad" && v != "skip" {
            return Err(format!("Invalid verdict: {v}"));
        }
        let out = run_git_merged_output(&repo, &["bisect", v])?;
        bisect_parse_output(&repo, &out)
    }).await
}

#[tauri::command]
pub async fn git_bisect_reset(path: String) -> Result<(), String> {
    spawn_git(move || {
        let repo = PathBuf::from(path.trim());
        run_git_merged_output(&repo, &["bisect", "reset"])?;
        Ok(())
    }).await
}
