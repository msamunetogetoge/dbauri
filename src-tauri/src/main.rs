mod models;
mod db;
mod commands;
#[cfg(test)]
mod tests;

use db::DbState;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(DbState {
            clients: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect_to_database,
            commands::disconnect_from_database,
            commands::execute_query,
            commands::save_connection_info,
            commands::get_saved_connections,
            commands::get_schemas,
            commands::get_tables,
            commands::get_table_info
        ])
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                let app_handle = event.window().app_handle();
                api.prevent_close();
                app_handle.emit_all("disconnect-all-connections", ()).unwrap();
                app_handle.exit(0);
            }
        })
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
