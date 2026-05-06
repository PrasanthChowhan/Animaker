use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::{Window, Emitter};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::fs;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RenderClip {
    pub id: String,
    pub track_index: i32,
    pub clip_type: String, // "media" or "animation"
    pub start: f32,
    pub duration: f32,
    pub content: Option<String>,
}

#[derive(Serialize, Clone)]
struct RenderProgress {
    percent: f32,
    message: String,
}

#[tauri::command]
pub async fn render_project(
    window: Window,
    project_path: String,
    index_html: String,
    clips: Vec<RenderClip>,
) -> Result<String, String> {
    let path = PathBuf::from(&project_path);
    let exports_dir = path.join("exports");
    
    // Ensure exports directory exists
    if !exports_dir.exists() {
        fs::create_dir_all(&exports_dir).map_err(|e| e.to_string())?;
    }

    // Identify if we have media tracks (track_index 0)
    let has_media = clips.iter().any(|c| c.clip_type == "media" && c.track_index == 0);

    if !has_media {
        // Simple case: just animations, render directly to final MP4
        return render_direct(&window, &path, &index_html, &exports_dir).await;
    }

    // Complex case: animations + media
    // 1. Render animations to a transparent WebM
    let animations_webm = render_animations_to_webm(&window, &path, &index_html, &exports_dir).await?;

    // 2. Composite with media clips using FFmpeg
    // For MVP: we just take the FIRST media clip on track 0 and overlay the animations
    // In a full implementation, we would concatenate multiple media clips
    let base_media = clips.iter().find(|c| c.clip_type == "media" && c.track_index == 0).unwrap();
    let base_media_path = base_media.content.as_ref().ok_or("Media clip missing source path")?;

    let final_output = exports_dir.join(format!("render_{}.mp4", chrono::Utc::now().timestamp()));
    let final_output_str = final_output.to_string_lossy().to_string();

    composite_overlay(&base_media_path, &animations_webm, &final_output_str).await?;

    Ok(final_output_str)
}

async fn render_direct(
    window: &Window,
    path: &PathBuf,
    index_html: &str,
    exports_dir: &PathBuf,
) -> Result<String, String> {
    let index_path = path.join("index.html");
    fs::write(&index_path, index_html).map_err(|e| e.to_string())?;

    let output_file = exports_dir.join(format!("render_{}.mp4", chrono::Utc::now().timestamp()));
    let output_file_str = output_file.to_string_lossy().to_string();

    run_hyperframes_render(window, path, &output_file_str, "mp4").await?;

    Ok(output_file_str)
}

async fn render_animations_to_webm(
    window: &Window,
    path: &PathBuf,
    index_html: &str,
    exports_dir: &PathBuf,
) -> Result<String, String> {
    let index_path = path.join("index.html");
    fs::write(&index_path, index_html).map_err(|e| e.to_string())?;

    let output_file = exports_dir.join(format!("temp_anim_{}.webm", chrono::Utc::now().timestamp()));
    let output_file_str = output_file.to_string_lossy().to_string();

    run_hyperframes_render(window, path, &output_file_str, "webm").await?;

    Ok(output_file_str)
}

async fn run_hyperframes_render(
    window: &Window,
    path: &PathBuf,
    output_path: &str,
    format: &str,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let mut child = Command::new("cmd")
        .args(["/C", "npx", "hyperframes", "render", "--output", output_path, "--format", format, "--quality", "standard"])
        .current_dir(path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start render: {}", e))?;

    #[cfg(not(target_os = "windows"))]
    let mut child = Command::new("npx")
        .args(["hyperframes", "render", "--output", output_path, "--format", format, "--quality", "standard"])
        .current_dir(path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start render: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        if let Ok(line) = line {
            if line.contains("%") {
                if let Some(pct_str) = line.split('%').next().and_then(|s| s.split_whitespace().last()) {
                    if let Ok(percent) = pct_str.parse::<f32>() {
                        window.emit("render-progress", RenderProgress {
                            percent,
                            message: line.clone(),
                        }).unwrap();
                    }
                }
            }
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("Hyperframes render failed".to_string())
    }
}

async fn composite_overlay(
    base_media: &str,
    overlay_webm: &str,
    output_path: &str,
) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .args([
            "-i", base_media,
            "-i", overlay_webm,
            "-filter_complex", "[0:v][1:v]overlay=shortest=1",
            "-c:a", "copy",
            "-y",
            output_path
        ])
        .status()
        .map_err(|e| format!("FFmpeg failed: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg composition failed".to_string())
    }
}
