mod db;
mod models;
mod srs;

use models::{Card, DayActivity, FolderNode, NewCard, NewFolder, UpdateCard};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct AppState {
    pub db: Mutex<Connection>,
}

// ── Folder Commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn get_folder_tree(state: State<AppState>) -> Result<Vec<FolderNode>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_folder_tree(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_folder(payload: NewFolder, state: State<AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::create_folder(&conn, &payload.name, payload.parent_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_folder(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_folder(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_folder(id: i64, name: String, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::rename_folder(&conn, id, &name).map_err(|e| e.to_string())
}

// ── Card Commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn create_card(payload: NewCard, state: State<AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::create_card(&conn, payload.folder_id, &payload.front, &payload.back)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_due_cards(folder_id: i64, state: State<AppState>) -> Result<Vec<Card>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_due_cards(&conn, folder_id).map_err(|e| e.to_string())
}

// ── Review Commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn submit_review(
    card_id: i64,
    rating: i64,
    state: State<AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::submit_review(&conn, card_id, rating).map_err(|e| e.to_string())
}

// ── Stats Commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_due_counts(state: State<AppState>) -> Result<Vec<(i64, i64)>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_due_counts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_streak(state: State<AppState>) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_streak(&conn).map_err(|e| e.to_string())
}

// ── Card Browser Commands ─────────────────────────────────────────────────────

#[tauri::command]
fn get_all_cards(folder_id: i64, state: State<AppState>) -> Result<Vec<Card>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_all_cards(&conn, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_card(payload: UpdateCard, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::update_card(&conn, payload.id, &payload.front, &payload.back)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_card(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::delete_card(&conn, id).map_err(|e| e.to_string())
}

// ── Heatmap Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_heatmap_data(state: State<AppState>) -> Result<Vec<DayActivity>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_heatmap_data(&conn).map_err(|e| e.to_string())
}

//

#[tauri::command]
fn get_total_counts(state: State<AppState>) -> Result<Vec<(i64, i64)>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::get_total_counts(&conn).map_err(|e| e.to_string())
}

// ── App Entry ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Resolve OS app data dir: %APPDATA%\flashcard-app on Windows
            // ~/.local/share/flashcard-app on Linux
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("flashcard.db");

            let conn = Connection::open(&db_path)
                .expect("Failed to open SQLite database");
            db::initialize(&conn).expect("Failed to initialize database schema");

            app.manage(AppState {
                db: Mutex::new(conn),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_folder_tree,
            create_folder,
            delete_folder,
            rename_folder,
            create_card,
            get_due_cards,
            get_all_cards,
            update_card,
            delete_card,
            submit_review,
            get_due_counts,
            get_total_counts,
            get_streak,
            get_heatmap_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}