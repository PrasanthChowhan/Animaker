use serde::{Deserialize, Serialize};
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};

#[derive(Serialize, Deserialize, Debug)]
pub struct GeneratedCode {
    pub html: String,
    pub css: String,
    pub js: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LLMRequest {
    pub prompt: String,
    pub preset_id: String,
    pub width: u32,
    pub height: u32,
    pub duration: f64,
}

#[tauri::command]
pub async fn generate_clip_code(
    request: LLMRequest,
) -> Result<GeneratedCode, String> {
    let api_key = std::env::var("ANTHROPIC_API_KEY").unwrap_or_default();

    if api_key.is_empty() {
        // Return a mock response if no API key is present, to allow development without a key
        return Ok(GeneratedCode {
            html: format!(r#"<div class="ai-generated">{}</div>"#, request.prompt),
            css: r#"
.ai-generated {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    color: #22d3ee;
    font-family: sans-serif;
    background: linear-gradient(45deg, #111, #222);
}
"#.to_string(),
            js: r#"
gsap.from(".ai-generated", {
    duration: 1.5,
    opacity: 0,
    scale: 0.5,
    ease: "back.out(1.7)"
});
"#.to_string(),
        });
    }

    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", HeaderValue::from_str(&api_key).map_err(|e| e.to_string())?);
    headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

    let system_prompt = r#"
You are a Hyperframes expert. You generate deterministic HTML, CSS, and GSAP-based JS for video animations.
Return ONLY a JSON object with "html", "css", and "js" fields.
The animation must fit in the given width/height and duration.
Use GSAP for all animations. Ensure the animation starts at 0s.
"#;

    let user_message = format!(
        "Generate an animation for: '{}'. Preset: {}. Dimensions: {}x{}. Duration: {}s.",
        request.prompt, request.preset_id, request.width, request.height, request.duration
    );

    let body = serde_json::json!({
        "model": "claude-3-5-sonnet-20240620",
        "max_tokens": 2000,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": user_message
            }
        ]
    });

    let res = client.post("https://api.anthropic.com/v1/messages")
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    // Extract the JSON from Claude's response
    let content = json["content"][0]["text"].as_str().ok_or("Failed to get text from LLM response")?;
    
    // Try to parse the inner JSON from the text
    let code: GeneratedCode = serde_json::from_str(content).map_err(|e| {
        // Fallback: try to extract JSON if Claude wrapped it in markdown
        if let Some(start) = content.find('{') {
            if let Some(end) = content.rfind('}') {
                return serde_json::from_str(&content[start..=end]).map_err(|e2| e2.to_string());
            }
        }
        e.to_string()
    })?;

    Ok(code)
}
