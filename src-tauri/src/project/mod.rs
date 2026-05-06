use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use async_trait::async_trait;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Project {
    pub name: String,
    pub aspect_ratio: String,
    pub created_at: i64,
    pub path: Option<PathBuf>,
}

#[derive(Debug, thiserror::Error, Serialize)]
pub enum ProjectError {
    #[error("Project already exists: {0}")]
    AlreadyExists(String),
    #[error("Project not found: {0}")]
    NotFound(String),
    #[error("Storage error: {0}")]
    StorageError(String),
    #[error("Invalid metadata: {0}")]
    InvalidMetadata(String),
}

#[async_trait]
pub trait ProjectStore: Send + Sync {
    async fn create(&self, name: &str, aspect_ratio: &str) -> Result<Project, ProjectError>;
    async fn list(&self) -> Result<Vec<Project>, ProjectError>;
    async fn delete(&self, name: &str) -> Result<(), ProjectError>;
}

pub mod file_system;
pub mod render;
#[cfg(test)]
mod tests;

pub struct ProjectState {
    pub store: Box<dyn ProjectStore>,
}

#[tauri::command]
pub async fn create_project(
    state: tauri::State<'_, ProjectState>,
    name: String,
    aspect_ratio: String,
) -> Result<Project, String> {
    state.store.create(&name, &aspect_ratio).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_projects(
    state: tauri::State<'_, ProjectState>,
) -> Result<Vec<Project>, String> {
    state.store.list().await.map_err(|e| e.to_string())
}
