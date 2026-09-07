use reqwest::{header::HeaderMap, StatusCode};
use std::time::{SystemTime, UNIX_EPOCH};

/// A small IPC error contract: only the earliest retry timestamp, never response bodies/tokens.
pub(crate) fn response_error(response: &reqwest::Response) -> Option<String> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    retry_at(response.status(), response.headers(), now)
        .map(|at| format!("__PROVIDER_RATE_LIMIT__:{at}"))
}

/// GitHub secondary limits can be a 403 with an explanatory body but no retry headers.
pub(crate) fn body_error(status: StatusCode, body: &str) -> Option<String> {
    let body = body.to_ascii_lowercase();
    if status == StatusCode::FORBIDDEN
        && (body.contains("secondary rate limit") || body.contains("rate limit exceeded"))
    {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        Some(format!("__PROVIDER_RATE_LIMIT__:{}", now.saturating_add(60)))
    } else { None }
}

fn retry_at(status: StatusCode, headers: &HeaderMap, now: u64) -> Option<u64> {
    let get = |key: &str| headers.get(key).and_then(|v| v.to_str().ok());
    let remaining = get("x-ratelimit-remaining").or_else(|| get("ratelimit-remaining"));
    let retry = get("retry-after");
    if status != StatusCode::TOO_MANY_REQUESTS
        && !(status == StatusCode::FORBIDDEN && (remaining == Some("0") || retry.is_some()))
    {
        return None;
    }
    let retry_after = retry.and_then(|value| {
        value.parse::<u64>().ok().map(|seconds| now.saturating_add(seconds))
            .or_else(|| httpdate::parse_http_date(value).ok()?.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs()))
    });
    let reset = if remaining == Some("0") {
        get("x-ratelimit-reset").or_else(|| get("ratelimit-reset")).and_then(|value| value.parse::<u64>().ok())
    } else { None };
    // Respect both limits if the provider supplies them. Missing/invalid headers use one minute.
    Some(retry_after.into_iter().chain(reset).max().unwrap_or_else(|| now.saturating_add(60))
        .max(now.saturating_add(1)).min(253_402_300_799))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn headers(values: &[(&'static str, &str)]) -> HeaderMap {
        values.iter().map(|(key, value)| (reqwest::header::HeaderName::from_static(key), value.parse().unwrap())).collect()
    }
    #[test]
    fn respects_retry_after_and_primary_reset() {
        let h = headers(&[("retry-after", "30"), ("x-ratelimit-remaining", "0"), ("x-ratelimit-reset", "1200")]);
        assert_eq!(retry_at(StatusCode::FORBIDDEN, &h, 1000), Some(1200));
        assert_eq!(retry_at(StatusCode::TOO_MANY_REQUESTS, &headers(&[("retry-after", "30")]), 1000), Some(1030));
    }
    #[test]
    fn accepts_http_date_and_gitlab_reset() {
        let date = httpdate::fmt_http_date(UNIX_EPOCH + std::time::Duration::from_secs(1500));
        assert_eq!(retry_at(StatusCode::TOO_MANY_REQUESTS, &headers(&[("retry-after", &date)]), 1000), Some(1500));
        assert_eq!(retry_at(StatusCode::TOO_MANY_REQUESTS, &headers(&[("ratelimit-remaining", "0"), ("ratelimit-reset", "1700")]), 1000), Some(1700));
    }
    #[test]
    fn ordinary_permissions_and_success_do_not_become_rate_limits() {
        assert_eq!(retry_at(StatusCode::FORBIDDEN, &HeaderMap::new(), 1000), None);
        assert_eq!(retry_at(StatusCode::OK, &headers(&[("x-ratelimit-remaining", "0")]), 1000), None);
        assert_eq!(retry_at(StatusCode::TOO_MANY_REQUESTS, &headers(&[("retry-after", "invalid")]), 1000), Some(1060));
    }
    #[test]
    fn secondary_limit_without_headers_gets_a_retry_deadline() {
        assert!(body_error(StatusCode::FORBIDDEN, r#"{"message":"You have exceeded a secondary rate limit."}"#).unwrap().starts_with("__PROVIDER_RATE_LIMIT__:"));
        assert!(body_error(StatusCode::FORBIDDEN, "SAML enforcement").is_none());
    }
}
