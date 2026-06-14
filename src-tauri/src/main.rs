// AquaNote Tauri + Axum REST API 后端
// 文件系统存储：安装根目录下的 workspaces/ 子文件夹

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;
use uuid::Uuid;

// ─── 数据结构 ──────────────────────────────────────────────

#[derive(Clone)]
struct AppState {
    data_dir: PathBuf,
}

#[derive(Serialize, Deserialize)]
struct Workspace {
    id: String,
    name: String,
    description: Option<String>,
    created_at: String,
    last_opened_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    tank_size: Option<TankSize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    glass_thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    filter_type: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct TankSize {
    x: f64,
    y: f64,
    z: f64,
}

#[derive(Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: Option<String>,
}

// ─── 工具函数 ──────────────────────────────────────────────

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn workspace_dir(base: &PathBuf, ws_id: &str) -> PathBuf {
    base.join("workspaces").join(ws_id)
}

fn ensure_dir(path: &PathBuf) -> std::io::Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

fn read_json_file<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn write_json_file<T: serde::Serialize>(path: &PathBuf, data: &T) -> std::io::Result<()> {
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content)
}

fn json_file(path: &PathBuf, name: &str) -> PathBuf {
    path.join(format!("{}.json", name))
}

// ─── REST API Handlers ─────────────────────────────────────

async fn list_workspaces(State(state): State<Arc<RwLock<AppState>>>) -> Json<ApiResponse<Vec<Workspace>>> {
    let st = state.read().await;
    let ws_dir = st.data_dir.join("workspaces");
    let mut workspaces = Vec::new();
    if let Ok(entries) = fs::read_dir(&ws_dir) {
        for entry in entries.flatten() {
            let meta_path = entry.path().join("workspace.json");
            if let Some(ws) = read_json_file::<Workspace>(&meta_path) {
                workspaces.push(ws);
            }
        }
    }
    workspaces.sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at));
    Json(ApiResponse { success: true, data: Some(workspaces), message: None })
}

async fn get_workspace(State(state): State<Arc<RwLock<AppState>>>, Path(id): Path<String>) -> Result<Json<ApiResponse<Workspace>>, StatusCode> {
    let st = state.read().await;
    let meta_path = workspace_dir(&st.data_dir, &id).join("workspace.json");
    match read_json_file::<Workspace>(&meta_path) {
        Some(ws) => Ok(Json(ApiResponse { success: true, data: Some(ws), message: None })),
        None => Ok(Json(ApiResponse { success: false, data: None, message: Some("Workspace not found".to_string()) })),
    }
}

#[derive(Deserialize)]
struct CreateWorkspaceReq {
    name: String,
    description: Option<String>,
    tank_size: Option<TankSize>,
    glass_thickness: Option<f64>,
    filter_type: Option<String>,
}

async fn create_workspace(
    State(state): State<Arc<RwLock<AppState>>>,
    Json(req): Json<CreateWorkspaceReq>,
) -> Json<ApiResponse<Workspace>> {
    let st = state.read().await;
    let id = Uuid::new_v4().to_string();
    let now = now_iso();
    let ws = Workspace {
        id: id.clone(),
        name: req.name,
        description: req.description,
        created_at: now.clone(),
        last_opened_at: now,
        tank_size: req.tank_size,
        glass_thickness: req.glass_thickness,
        filter_type: req.filter_type,
    };
    let dir = workspace_dir(&st.data_dir, &id);
    let _ = ensure_dir(&dir);
    let _ = write_json_file(&dir.join("workspace.json"), &ws);
    Json(ApiResponse { success: true, data: Some(ws), message: None })
}

async fn delete_workspace(State(state): State<Arc<RwLock<AppState>>>, Path(id): Path<String>) -> Json<ApiResponse<()>> {
    let st = state.read().await;
    let dir = workspace_dir(&st.data_dir, &id);
    let _ = fs::remove_dir_all(&dir);
    Json(ApiResponse { success: true, data: Some(()), message: None })
}

// Generic collection handlers
async fn list_collection(State(state): State<Arc<RwLock<AppState>>>, Path((ws_id, coll)): Path<(String, String)>) -> Json<ApiResponse<Vec<Value>>> {
    let st = state.read().await;
    let path = workspace_dir(&st.data_dir, &ws_id).join(format!("{}.json", coll));
    let items: Vec<Value> = read_json_file(&path).unwrap_or_default();
    Json(ApiResponse { success: true, data: Some(items), message: None })
}

async fn create_in_collection(
    State(state): State<Arc<RwLock<AppState>>>,
    Path((ws_id, coll)): Path<(String, String)>,
    Json(item): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let st = state.read().await;
    let dir = workspace_dir(&st.data_dir, &ws_id);
    let _ = ensure_dir(&dir);
    let path = dir.join(format!("{}.json", coll));
    let mut items: Vec<Value> = read_json_file(&path).unwrap_or_default();
    items.push(item.clone());
    let _ = write_json_file(&path, &items);
    Json(ApiResponse { success: true, data: Some(item), message: None })
}

async fn delete_from_collection(
    State(state): State<Arc<RwLock<AppState>>>,
    Path((ws_id, coll, item_id)): Path<(String, String, String)>,
) -> Json<ApiResponse<()>> {
    let st = state.read().await;
    let path = workspace_dir(&st.data_dir, &ws_id).join(format!("{}.json", coll));
    let mut items: Vec<Value> = read_json_file(&path).unwrap_or_default();
    items.retain(|i| i.get("id").and_then(|v| v.as_str()) != Some(&item_id));
    let _ = write_json_file(&path, &items);
    Json(ApiResponse { success: true, data: Some(()), message: None })
}

// ─── Tauri Commands ────────────────────────────────────────

#[tauri::command]
fn get_data_dir(app: AppHandle) -> Result<String, String> {
    let path = app
        .path_resolver()
        .app_data_dir()
        .or_else(|| app.path_resolver().config_dir())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn start_rest_api(app: AppHandle) -> Result<u16, String> {
    let data_dir = app
        .path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
        .join("AquaNoteData");
    let _ = ensure_dir(&data_dir);

    let state = Arc::new(RwLock::new(AppState { data_dir }));

    let app_router = Router::new()
        .route("/api/workspaces", get(list_workspaces).post(create_workspace))
        .route("/api/workspaces/:id", get(get_workspace).delete(delete_workspace))
        .route("/api/workspaces/:ws_id/:coll", get(list_collection).post(create_in_collection))
        .route("/api/workspaces/:ws_id/:coll/:item_id", delete(delete_from_collection))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    tokio::spawn(async move {
        axum::serve(listener, app_router).await.ok();
    });

    Ok(port)
}

// ─── Main ──────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_data_dir, start_rest_api])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
