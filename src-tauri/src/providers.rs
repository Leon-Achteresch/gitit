use std::time::Duration;

use base64::Engine;
use serde::Serialize;
use serde_json::Value;

use crate::credentials::read_https_credential;

#[derive(Serialize)]
pub struct RemoteRepo {
    pub name: String,
    pub full_name: String,
    pub clone_url: String,
    pub description: Option<String>,
    pub private: bool,
    pub default_branch: Option<String>,
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP-Client: {e}"))
}

async fn github_list(host: &str) -> Result<Vec<RemoteRepo>, String> {
    let cred = read_https_credential(host)?;
    let client = http_client()?;
    let url = "https://api.github.com/user/repos?per_page=100&sort=updated";
    let res = client
        .get(url)
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "gitit")
        .header(
            "Authorization",
            format!("Bearer {}", cred.password),
        )
        .send()
        .await
        .map_err(|e| format!("GitHub: {e}"))?;
    if res.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(format!(
            "GitHub: 401. Bitte unter Einstellungen bei {host} anmelden."
        ));
    }
    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("GitHub: {}", body.trim()));
    }
    let arr: Vec<Value> = res.json().await.map_err(|e| format!("GitHub: {e}"))?;
    let mut out = Vec::new();
    for v in arr {
        let name = v["name"].as_str().unwrap_or("").to_string();
        let full_name = v["full_name"].as_str().unwrap_or("").to_string();
        let clone_url = v["clone_url"].as_str().unwrap_or("").to_string();
        if clone_url.is_empty() {
            continue;
        }
        let description = v["description"].as_str().map(|s| s.to_string());
        let private = v["private"].as_bool().unwrap_or(false);
        let default_branch = v["default_branch"].as_str().map(|s| s.to_string());
        out.push(RemoteRepo {
            name,
            full_name,
            clone_url,
            description,
            private,
            default_branch,
        });
    }
    Ok(out)
}

async fn gitlab_list(host: &str) -> Result<Vec<RemoteRepo>, String> {
    let cred = read_https_credential(host)?;
    let client = http_client()?;
    let base = format!("https://{host}");
    let url = format!(
        "{}/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at",
        base.trim_end_matches('/')
    );
    let res = client
        .get(&url)
        .header("User-Agent", "gitit")
        .header("PRIVATE-TOKEN", cred.password)
        .send()
        .await
        .map_err(|e| format!("GitLab: {e}"))?;
    if res.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(format!(
            "GitLab: 401. Bitte unter Einstellungen bei {host} anmelden."
        ));
    }
    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("GitLab: {}", body.trim()));
    }
    let arr: Vec<Value> = res.json().await.map_err(|e| format!("GitLab: {e}"))?;
    let mut out = Vec::new();
    for v in arr {
        let name = v["name"].as_str().unwrap_or("").to_string();
        let full_name = v["path_with_namespace"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let clone_url = v["http_url_to_repo"].as_str().unwrap_or("").to_string();
        if clone_url.is_empty() {
            continue;
        }
        let description = v["description"].as_str().map(|s| s.to_string());
        let private = v["visibility"].as_str() == Some("private");
        let default_branch = v["default_branch"].as_str().map(|s| s.to_string());
        out.push(RemoteRepo {
            name,
            full_name,
            clone_url,
            description,
            private,
            default_branch,
        });
    }
    Ok(out)
}

async fn bitbucket_list(host: &str) -> Result<Vec<RemoteRepo>, String> {
    let cred = read_https_credential(host)?;
    let user = cred
        .username
        .filter(|u| !u.is_empty())
        .ok_or_else(|| {
            format!(
                "Bitbucket: Benutzername fehlt. Bitte unter Einstellungen bei {host} mit Benutzername und App-Passwort anmelden."
            )
        })?;
    let client = http_client()?;
    let basic = base64::engine::general_purpose::STANDARD.encode(format!("{user}:{}", cred.password));
    let url = "https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100";
    let res = client
        .get(url)
        .header("User-Agent", "gitit")
        .header("Authorization", format!("Basic {basic}"))
        .send()
        .await
        .map_err(|e| format!("Bitbucket: {e}"))?;
    if res.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(format!(
            "Bitbucket: 401. Bitte unter Einstellungen bei {host} anmelden."
        ));
    }
    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Bitbucket: {}", body.trim()));
    }
    let root: Value = res.json().await.map_err(|e| format!("Bitbucket: {e}"))?;
    let values = root["values"].as_array().cloned().unwrap_or_default();
    let mut out = Vec::new();
    for v in values {
        let slug = v["slug"].as_str().unwrap_or("").to_string();
        let full_name = v["full_name"].as_str().unwrap_or("").to_string();
        let description = v["description"].as_str().map(|s| s.to_string());
        let private = v["is_private"].as_bool().unwrap_or(false);
        let default_branch = v["mainbranch"]["name"]
            .as_str()
            .map(|s| s.to_string());
        let mut clone_url = String::new();
        if let Some(clones) = v["links"]["clone"].as_array() {
            for c in clones {
                if c["name"].as_str() == Some("https") {
                    if let Some(h) = c["href"].as_str() {
                        clone_url = h.to_string();
                        break;
                    }
                }
            }
            if clone_url.is_empty() {
                if let Some(c) = clones.first() {
                    if let Some(h) = c["href"].as_str() {
                        clone_url = h.to_string();
                    }
                }
            }
        }
        if clone_url.is_empty() {
            continue;
        }
        out.push(RemoteRepo {
            name: slug,
            full_name,
            clone_url,
            description,
            private,
            default_branch,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn list_remote_repos(host: String) -> Result<Vec<RemoteRepo>, String> {
    let h = host.trim();
    if h.is_empty() {
        return Err("Host darf nicht leer sein".into());
    }
    let host_lc = h.to_ascii_lowercase();
    match host_lc.as_str() {
        "github.com" => github_list(h).await,
        "bitbucket.org" => bitbucket_list(h).await,
        "dev.azure.com" => Err(
            "Azure DevOps: Repo-Liste wird hier noch nicht unterstützt.".into(),
        ),
        _ => gitlab_list(h).await,
    }
}
