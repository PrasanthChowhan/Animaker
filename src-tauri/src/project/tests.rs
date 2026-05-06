use super::*;
use super::file_system::FileSystemStore;
use tempfile::tempdir;
use std::fs;

#[tokio::test]
async fn test_create_project_initializes_directory_and_metadata() {
    let tmp_dir = tempdir().unwrap();
    let store = FileSystemStore::new(tmp_dir.path().to_path_buf());

    let name = "Test Project";
    let ratio = "16:9";

    let project = store.create(name, ratio).await.unwrap();

    assert_eq!(project.name, name);
    assert_eq!(project.aspect_ratio, ratio);
    
    let project_dir = tmp_dir.path().join(name);
    assert!(project_dir.exists());
    assert!(project_dir.join("project.json").exists());
    assert!(project_dir.join("media").exists());
    assert!(project_dir.join("clips").exists());
}

#[tokio::test]
async fn test_list_projects_returns_sorted_projects() {
    let tmp_dir = tempdir().unwrap();
    let store = FileSystemStore::new(tmp_dir.path().to_path_buf());

    store.create("Project A", "16:9").await.unwrap();
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    store.create("Project B", "9:16").await.unwrap();

    let projects = store.list().await.unwrap();

    assert_eq!(projects.len(), 2);
    assert_eq!(projects[0].name, "Project B"); // Sorted by created_at desc
    assert_eq!(projects[1].name, "Project A");
}

#[tokio::test]
async fn test_create_duplicate_project_fails() {
    let tmp_dir = tempdir().unwrap();
    let store = FileSystemStore::new(tmp_dir.path().to_path_buf());

    store.create("Project X", "16:9").await.unwrap();
    let result = store.create("Project X", "1:1").await;

    assert!(matches!(result, Err(ProjectError::AlreadyExists(_))));
}

#[tokio::test]
async fn test_list_projects_ignores_corrupt_directories() {
    let tmp_dir = tempdir().unwrap();
    let store = FileSystemStore::new(tmp_dir.path().to_path_buf());

    // 1. Valid project
    store.create("Valid", "16:9").await.unwrap();

    // 2. Directory without project.json
    fs::create_dir_all(tmp_dir.path().join("MissingJson")).unwrap();

    // 3. Corrupt project.json
    let corrupt_dir = tmp_dir.path().join("CorruptJson");
    fs::create_dir_all(&corrupt_dir).unwrap();
    fs::write(corrupt_dir.join("project.json"), "{ invalid json }").unwrap();

    let projects = store.list().await.unwrap();

    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].name, "Valid");
}
