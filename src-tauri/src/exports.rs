use std::path::PathBuf;

/// A user-selected JSON export. Credentials never pass through this command.
#[tauri::command]
pub async fn save_user_export(path: String, contents: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let target = PathBuf::from(path);
        if target.extension().and_then(|e| e.to_str()) != Some("json") || contents.len() > 2_000_000 {
            return Err("Export must be a JSON file smaller than 2 MB".into());
        }
        serde_json::from_str::<serde_json::Value>(&contents).map_err(|e| e.to_string())?;
        let parent = target.parent().ok_or("Missing export directory")?;
        let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e| e.to_string())?.as_nanos();
        let tmp = parent.join(format!(".l8git-export-{}-{stamp}.json", std::process::id()));
        let result = (|| {
            use std::io::Write;
            let mut options = std::fs::OpenOptions::new();
            options.write(true).create_new(true);
            #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
            let mut file = options.open(&tmp).map_err(|e| e.to_string())?;
            file.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
            std::fs::rename(&tmp, &target).map_err(|e| e.to_string())
        })();
        if result.is_err() { let _ = std::fs::remove_file(tmp); }
        result
    }).await.map_err(|e| e.to_string())?
}

#[derive(serde::Serialize)]
pub struct RuntimeDiagnostics {
    os: &'static str,
    arch: &'static str,
    git_version: Option<String>,
}

#[tauri::command]
pub async fn runtime_diagnostics() -> Result<RuntimeDiagnostics, String> {
    tokio::task::spawn_blocking(|| {
        let git_version = crate::cmd::git_command().arg("--version").output().ok()
            .filter(|out| out.status.success())
            .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string());
        RuntimeDiagnostics { os: std::env::consts::OS, arch: std::env::consts::ARCH, git_version }
    }).await.map_err(|e| e.to_string())
}
