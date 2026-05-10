mod project;
mod feedback;

use project::{ProjectState, file_system::FileSystemStore};
use feedback::submit_feedback;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let projects_dir = if let Ok(dir) = std::env::var("PROJECTS_DIR") {
                std::path::PathBuf::from(dir)
            } else {
                let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
                app_dir.join("projects")
            };
            
            println!("Loading projects from: {:?}", projects_dir);
            
            app.manage(ProjectState {
                store: Box::new(FileSystemStore::new(projects_dir)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            project::create_project,
            project::import_project,
            project::list_projects,
            project::save_project,
            project::llm::generate_clip_code,
            project::render::render_project,
            submit_feedback
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
