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

    fn copy_dir_all(&self, src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
        fs::create_dir_all(&dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let ty = entry.file_type()?;
            if ty.is_dir() {
                self.copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
            } else {
                fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
            }
        }
        Ok(())
    }

    fn extract_attr(&self, content: &str, attr: &str) -> Option<String> {
        let pattern = format!("{}=\"([^\"]*)\"", attr);
        let re = regex::Regex::new(&pattern).ok()?;
        re.captures(content).and_then(|cap| cap.get(1)).map(|m| m.as_str().to_string())
    }

    fn extract_all_attrs(&self, content: &str, attr: &str) -> Vec<String> {
        let pattern = format!("{}=\"([^\"]*)\"", attr);
        let re = regex::Regex::new(&pattern).ok().unwrap();
        re.captures_iter(content)
            .map(|cap| cap.get(1).unwrap().as_str().to_string())
            .collect()
    }

    fn parse_clips_from_comp(&self, content: &str) -> Vec<super::Clip> {
        let mut clips = Vec::new();
        // Look for timed elements: data-start and data-duration/data-end
        let re = regex::Regex::new(r#"<([a-z0-9]+)[^>]*data-start="([\d\.]+)"[^>]*>"#).unwrap();
        
        for cap in re.captures_iter(content) {
            let tag = cap.get(1).unwrap().as_str();
            let start: f64 = cap.get(2).unwrap().as_str().parse().unwrap_or(0.0);
            
            // Try to find duration or end in the same element (rough parsing)
            let full_tag = cap.get(0).unwrap().as_str();
            let duration: f64 = self.extract_attr(full_tag, "data-duration")
                .and_then(|s| s.parse().ok())
                .or_else(|| {
                    self.extract_attr(full_tag, "data-end")
                        .and_then(|s| s.parse::<f64>().ok())
                        .map(|end| end - start)
                })
                .unwrap_or(5.0);

            let id = self.extract_attr(full_tag, "id")
                .unwrap_or_else(|| format!("clip_{}", uuid::Uuid::new_v4()));

            clips.push(super::Clip {
                id,
                clip_type: if tag == "video" || tag == "img" { "media" } else { "smart" }.to_string(),
                start,
                duration,
                content: tag.to_string(),
                metadata: serde_json::json!({
                    "imported": true,
                    "tag": tag
                }),
            });
        }
        clips
    }

    fn detect_project_at_path(&self, path: PathBuf) -> Option<Project> {
        let name = path.file_name()?.to_string_lossy().to_string();
        let config_path = path.join("project.json");
        
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(config_path) {
                if let Ok(mut project) = serde_json::from_str::<Project>(&content) {
                    if project.id.is_empty() {
                        project.id = project.name.to_lowercase().replace(" ", "-");
                    }
                    project.path = Some(path);
                    return Some(project);
                }
            }
        }

        // Detect HyperFrames project if project.json is missing
        let hf_manifest = path.join("hyperframes.json");
        let index_path = path.join("index.html");

        if hf_manifest.exists() {
            let mut width = 1920;
            let mut height = 1080;
            let mut duration = 10.0;
            
            if let Ok(content) = fs::read_to_string(&index_path) {
                width = self.extract_attr(&content, "data-width").and_then(|s| s.parse().ok()).unwrap_or(1920);
                height = self.extract_attr(&content, "data-height").and_then(|s| s.parse().ok()).unwrap_or(1080);
                duration = self.extract_attr(&content, "data-duration").and_then(|s| s.parse().ok()).unwrap_or(10.0);
            }

            let aspect_ratio = if width > height { "16:9" } else { "9:16" };
            let created_at = fs::metadata(&path).ok()
                .and_then(|m| m.created().ok())
                .and_then(|c| c.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64)
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

            return Some(Project {
                id: name.to_lowercase().replace(" ", "-"),
                name: name.clone(),
                aspect_ratio: aspect_ratio.to_string(),
                created_at,
                path: Some(path),
                width: Some(width),
                height: Some(height),
                fps: Some(30),
                duration: Some(duration),
                tracks: Some(vec![super::Track {
                    id: "v1".to_string(),
                    name: "V1".to_string(),
                    track_type: "animation".to_string(),
                    clips: vec![],
                }]),
            });
        }
        
        None
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

        let (width, height) = match aspect_ratio {
            "16:9" => (1920, 1080),
            "9:16" => (1080, 1920),
            "1:1" => (1080, 1080),
            _ => (1920, 1080),
        };

        let project = Project {
            id: name.to_lowercase().replace(" ", "-"),
            name: name.to_string(),
            aspect_ratio: aspect_ratio.to_string(),
            created_at: chrono::Utc::now().timestamp_millis(),
            path: Some(project_path.clone()),
            width: Some(width),
            height: Some(height),
            fps: Some(30),
            duration: Some(10.0),
            tracks: Some(vec![
                super::Track {
                    id: "v1".to_string(),
                    name: "V1".to_string(),
                    track_type: "animation".to_string(),
                    clips: vec![],
                },
                super::Track {
                    id: "v2".to_string(),
                    name: "V2".to_string(),
                    track_type: "animation".to_string(),
                    clips: vec![],
                }
            ]),
        };

        let project_json = serde_json::to_string_pretty(&project)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;
        fs::write(project_path.join("project.json"), project_json)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;

        Ok(project)
    }

    async fn import(&self, name: &str, external_path: PathBuf) -> Result<Project, ProjectError> {
        let project_path = self.base_path.join(name);

        if project_path.exists() {
            return Err(ProjectError::AlreadyExists(name.to_string()));
        }

        if !external_path.exists() {
            return Err(ProjectError::NotFound(external_path.to_string_lossy().to_string()));
        }

        // 1. Copy the whole directory
        self.copy_dir_all(&external_path, &project_path)
            .map_err(|e| ProjectError::StorageError(format!("Failed to copy project: {}", e)))?;

        // 2. Structure-aware detection
        let hf_manifest = project_path.join("hyperframes.json");
        let index_path = project_path.join("index.html");

        let mut width = 1920;
        let mut height = 1080;
        let mut duration = 10.0;
        let mut tracks = Vec::new();

        if hf_manifest.exists() {
            // It's a standard HyperFrames project
            if let Ok(content) = fs::read_to_string(&index_path) {
                width = self.extract_attr(&content, "data-width").and_then(|s| s.parse().ok()).unwrap_or(1920);
                height = self.extract_attr(&content, "data-height").and_then(|s| s.parse().ok()).unwrap_or(1080);
                duration = self.extract_attr(&content, "data-duration").and_then(|s| s.parse().ok()).unwrap_or(10.0);

                // Find compositions/blocks linked in index.html
                // Standard HF pattern: <div data-composition-src="compositions/scene.html">
                let comp_links = self.extract_all_attrs(&content, "data-composition-src");
                for (i, src) in comp_links.into_iter().enumerate() {
                    let track_id = format!("v{}", i + 1);
                    let track_name = format!("V{}", i + 1);
                    
                    // Try to extract clips from the linked composition file
                    let comp_path = project_path.join(&src);
                    let mut clips = Vec::new();
                    if comp_path.exists() {
                        if let Ok(comp_content) = fs::read_to_string(&comp_path) {
                            clips = self.parse_clips_from_comp(&comp_content);
                        }
                    }

                    tracks.push(super::Track {
                        id: track_id,
                        name: track_name,
                        track_type: "animation".to_string(),
                        clips,
                    });
                }
            }
        }

        // Fallback for empty tracks
        if tracks.is_empty() {
            tracks.push(super::Track {
                id: "v1".to_string(),
                name: "V1".to_string(),
                track_type: "animation".to_string(),
                clips: vec![],
            });
        }

        let aspect_ratio = if width > height { "16:9" } else { "9:16" };

        let project = Project {
            id: name.to_lowercase().replace(" ", "-"),
            name: name.to_string(),
            aspect_ratio: aspect_ratio.to_string(),
            created_at: chrono::Utc::now().timestamp_millis(),
            path: Some(project_path.clone()),
            width: Some(width),
            height: Some(height),
            fps: Some(30),
            duration: Some(duration),
            tracks: Some(tracks),
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
                    if let Some(project) = self.detect_project_at_path(path) {
                        projects.push(project);
                    }
                }
            }
        }

        projects.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(projects)
    }

    async fn save(&self, project: Project) -> Result<(), ProjectError> {
        let project_path = self.base_path.join(&project.name);
        if !project_path.exists() {
            return Err(ProjectError::NotFound(project.name));
        }

        let project_json = serde_json::to_string_pretty(&project)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;
        fs::write(project_path.join("project.json"), project_json)
            .map_err(|e| ProjectError::StorageError(e.to_string()))?;

        Ok(())
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
