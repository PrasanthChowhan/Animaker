use super::{Project, ProjectError, ProjectStore};
use async_trait::async_trait;
use std::fs;
use std::path::PathBuf;

pub struct FileSystemStore {
    base_path: PathBuf,
}

impl FileSystemStore {
    pub fn new(base_path: PathBuf) -> Self {
        if !base_path.exists() {
            fs::create_dir_all(&base_path).expect("Failed to create base projects directory");
        }
        Self { base_path }
    }
}

#[async_trait]
impl ProjectStore for FileSystemStore {
    async fn create(&self, name: &str, aspect_ratio: &str) -> Result<Project, ProjectError> {
        let project_path = self.base_path.join(name);

        if project_path.exists() {
            return Err(ProjectError::AlreadyExists(name.to_string()));
        }

        fs::create_dir_all(&project_path)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;
        fs::create_dir_all(project_path.join("media"))
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;
        fs::create_dir_all(project_path.join("clips"))
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;

        let project = Project {
            name: name.to_string(),
            aspect_ratio: aspect_ratio.to_string(),
            created_at: chrono::Utc::now().timestamp_millis(),
            path: Some(project_path.clone()),
        };

        let project_json = serde_json::to_string_pretty(&project)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;
        fs::write(project_path.join("project.json"), project_json)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;

        Ok(project)
    }

    async fn list(&self) -> Result<Vec<Project>, ProjectError> {
        let mut projects = Vec::new();

        if let Ok(entries) = fs::read_dir(&self.base_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let config_path = path.join("project.json");
                    if config_path.exists() {
                        if let Ok(content) = fs::read_to_string(config_path) {
                            if let Ok(mut project) = serde_json::from_str::<Project>(&content) {
                                project.path = Some(path);
                                projects.push(project);
                            }
                        }
                    }
                }
            }
        }

        projects.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(projects)
    }

    async fn delete(&self, name: &str) -> Result<(), ProjectError> {
        let project_path = self.base_path.join(name);
        if !project_path.exists() {
            return Err(ProjectError::NotFound(name.to_string()));
        }

        fs::remove_dir_all(project_path)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;
        Ok(())
    }
}
