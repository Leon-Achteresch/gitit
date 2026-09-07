use super::*;

/// Filter before pagination so a branch never depends on the loaded all-refs window.
#[derive(Clone, Default, serde::Deserialize, serde::Serialize)]
#[serde(default)]
pub struct HistoryFilter {
    pub refs: Vec<String>,
    pub author: String,
    pub since: String,
    pub until: String,
    pub query: String,
    pub file: String,
}

#[tauri::command]
pub async fn repo_history_page(path: String, filter: HistoryFilter, skip: usize, limit: usize) -> Result<Vec<Commit>, String> {
    spawn_git(move || {
        let repo = PathBuf::from(&path);
        let mut args = vec!["log".to_string(), "-z".into(), "--date-order".into(),
            format!("--max-count={}", limit.clamp(1, 500)), format!("--skip={skip}"),
            "--format=%H%x1f%h%x1f%an%x1f%ae%x1f%cI%x1f%P%x1f%s%x1f%b".into()];
        for (flag, value) in [("--author", &filter.author), ("--since", &filter.since), ("--until", &filter.until), ("--grep", &filter.query)] {
            if !value.trim().is_empty() {
                let value = value.trim();
                // A date-only upper bound includes that whole local calendar day.
                let suffix = if value.len() == 10 && value.bytes().enumerate().all(|(i, b)| if i == 4 || i == 7 { b == b'-' } else { b.is_ascii_digit() }) {
                    if flag == "--until" { " 23:59:59" } else if flag == "--since" { " 00:00:00" } else { "" }
                } else { "" };
                args.push(format!("{flag}={value}{suffix}"));
            }
        }
        args.extend(["--fixed-strings".into(), "--regexp-ignore-case".into()]);
        if filter.refs.is_empty() { args.extend(["--exclude=refs/t3/*".into(), "--all".into()]); }
        for reference in &filter.refs {
            // Resolve to an object ID rather than passing user-controlled flags.
            if reference.starts_with('-') { return Err("Invalid revision".into()); }
            let hash = run_git(&repo, &["rev-parse", "--verify", &format!("{reference}^{{commit}}")])?;
            args.push(hash.trim().to_string());
        }
        args.push("--".into());
        if !filter.file.is_empty() { args.push(filter.file); }
        let raw = run_git(&repo, &args.iter().map(String::as_str).collect::<Vec<_>>())?;
        let mut commits = parse_commit_log(&raw);
        apply_tags(&mut commits, &tags_by_target(&repo));
        Ok(commits)
    }).await
}
