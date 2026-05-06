use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, USER_AGENT, ACCEPT};
use std::env;
use base64::{Engine as _, engine::general_purpose};
use std::fs;

#[derive(Deserialize)]
pub struct FeedbackPayload {
    pub title: String,
    pub description: String,
    pub state_snapshot: String,
    pub image_path: Option<String>,
    pub image_base64: Option<String>,
    pub labels: Vec<String>,
}

#[derive(Deserialize, Serialize)]
pub struct GitHubIssueResponse {
    pub html_url: String,
}

#[derive(Serialize)]
struct CreateIssuePayload {
    title: String,
    body: String,
    labels: Vec<String>,
}

#[derive(Serialize)]
struct GitHubContentPayload {
    message: String,
    content: String,
    branch: String,
}

#[derive(Deserialize)]
struct GitHubContentResponse {
    content: GitHubContentInfo,
}

#[derive(Deserialize)]
struct GitHubContentInfo {
    download_url: String,
}

#[tauri::command]
pub async fn submit_feedback(payload: FeedbackPayload) -> Result<String, String> {
    let token = env::var("GITHUB_TOKEN")
        .or_else(|_| env::var("GITHUB_PAT")) // Support GITHUB_PAT as seen in memory
        .map_err(|_| "GITHUB_TOKEN or GITHUB_PAT not found in environment. Please add it to .env".to_string())?;

    let owner = "PrasanthChowhan";
    let repo = "Animaker"; // Updated repo name
    let client = reqwest::Client::new();

    let mut image_url = None;

    // 1. Determine base64 content
    let base64_content = if let Some(path) = payload.image_path {
        let image_data = fs::read(&path)
            .map_err(|e| format!("Failed to read screenshot file: {}", e))?;
        Some(general_purpose::STANDARD.encode(image_data))
    } else if let Some(base64_data) = payload.image_base64 {
        // Strip data:image/png;base64, prefix if present
        if base64_data.contains(",") {
            Some(base64_data.split(",").nth(1).unwrap_or(&base64_data).to_string())
        } else {
            Some(base64_data)
        }
    } else {
        None
    };

    // 2. Upload if content exists
    if let Some(content) = base64_content {
        let filename = format!("feedback_{}.png", uuid::Uuid::new_v4());
        // Storing in a public-accessible path in the repo
        // Note: This requires the repo to have a 'feedback-images' branch or similar if configured
        let upload_url = format!("https://api.github.com/repos/{}/{}/contents/assets/feedback/{}", owner, repo, filename);

        let upload_payload = GitHubContentPayload {
            message: format!("Upload feedback screenshot: {}", filename),
            content,
            branch: "main".to_string(), // Defaulting to main for simplicity, or we could use a dedicated branch
        };

        let headers = get_github_headers(&token)?;

        let response = client.put(&upload_url)
            .headers(headers)
            .json(&upload_payload)
            .send()
            .await
            .map_err(|e| format!("Request to upload image failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            // If main branch doesn't work, maybe try without branch or just fail gracefully
            return Err(format!("Failed to upload image to GitHub ({}): {}. Ensure GITHUB_TOKEN has 'contents:write' permissions.", status, error_text));
        }

        let json: GitHubContentResponse = response.json().await
            .map_err(|e| format!("Failed to parse GitHub content response: {}", e))?;

        image_url = Some(json.content.download_url);
    }

    // 2. Create the Issue
    let issues_url = format!("https://api.github.com/repos/{}/{}/issues", owner, repo);

    let mut body = format!(
        "{}\n\n---\n**Application State Snapshot:**\n```json\n{}\n```",
        payload.description,
        payload.state_snapshot
    );

    if let Some(url) = image_url {
        body = format!("{}\n\n---\n**Screenshot:**\n![Feedback Screenshot]({})", body, url);
    }

    let mut labels = vec!["feedback".to_string()];
    labels.extend(payload.labels);

    let issue_payload = CreateIssuePayload {
        title: payload.title,
        body,
        labels,
    };

    let response = client.post(&issues_url)
        .headers(get_github_headers(&token)?)
        .json(&issue_payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to GitHub: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("GitHub API error ({}): {}", status, error_text));
    }

    let json: GitHubIssueResponse = response.json().await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;

    Ok(json.html_url)
}

fn get_github_headers(token: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("token {}", token))
        .map_err(|e| e.to_string())?);
    headers.insert(USER_AGENT, HeaderValue::from_static("Animaker-App"));
    headers.insert(ACCEPT, HeaderValue::from_static("application/vnd.github.v3+json"));
    Ok(headers)
}
