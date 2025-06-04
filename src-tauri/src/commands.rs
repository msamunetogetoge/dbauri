use crate::db::{self, DbState};
use crate::models::{ConnectionInfo, ConnectionInfoWithId, TableInfo};
use serde_json::json;
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub async fn connect_to_database(
    connection_info: ConnectionInfo,
    state: State<'_, DbState>,
    app_handle: tauri::AppHandle,
) -> Result<Uuid, String> {
    let id = Uuid::new_v4();
    let info_with_id = ConnectionInfoWithId {
        id,
        connection_name: connection_info.connection_name,
        connection_string: connection_info.connection_string,
    };

    db::connect(info_with_id, state.inner()).await?;

    let clients = state.clients.clone();
    let app_handle = Arc::new(Mutex::new(app_handle.clone()));
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(600));
        loop {
            interval.tick().await;
            let clients = clients.lock().await;
            for (id, client) in clients.iter() {
                let query_result = client.simple_query("SELECT 1").await;
                let app_handle = app_handle.lock().await;
                if query_result.is_err() {
                    eprintln!("Lost connection to the database with ID: {}", id);
                    app_handle
                        .emit_all("database-connection-status", json!({"id": id, "status": "disconnected"}))
                        .unwrap();
                } else {
                    app_handle
                        .emit_all("database-connection-status", json!({"id": id, "status": "connected"}))
                        .unwrap();
                }
            }
        }
    });

    Ok(id)
}

#[tauri::command]
pub async fn disconnect_from_database(
    id: Uuid,
    state: State<'_, DbState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    db::disconnect(id, state.inner())
        .await
        .map_err(|e| e.to_string())?;
    app_handle
        .emit_all("database-connection-status", json!({"id": id, "status": "disconnected"}))
        .unwrap();
    Ok("Disconnected successfully".to_string())
}

#[tauri::command]
pub async fn execute_query(id: Uuid, sql: String, state: State<'_, DbState>) -> Result<String, String> {
    db::execute_query(id, sql, state.inner()).await
}

#[tauri::command]
pub async fn get_schemas(id: Uuid, state: State<'_, DbState>) -> Result<Vec<String>, String> {
    db::get_schemas(id, state.inner()).await
}

#[tauri::command]
pub async fn get_tables(id: Uuid, schema: String, state: State<'_, DbState>) -> Result<Vec<String>, String> {
    db::get_tables(id, schema, state.inner()).await
}

#[tauri::command]
pub async fn get_table_info(
    id: Uuid,
    schema: String,
    table: String,
    state: State<'_, DbState>,
) -> Result<TableInfo, String> {
    db::get_table_info(id, schema, table, state.inner()).await
}

#[tauri::command]
pub async fn save_connection_info(connection_info: ConnectionInfo) -> Result<(), String> {
    let file_path = "db.json";
    let mut connections = match std::fs::read_to_string(file_path) {
        Ok(content) => serde_json::from_str::<Vec<ConnectionInfo>>(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    if !connections
        .iter()
        .any(|c| c.connection_string == connection_info.connection_string)
    {
        connections.push(connection_info);
        let json_content = serde_json::to_string_pretty(&connections).map_err(|e| e.to_string())?;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(file_path)
            .map_err(|e| e.to_string())?;
        use std::io::Write;
        file.write_all(json_content.as_bytes()).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_saved_connections() -> Result<Vec<ConnectionInfo>, String> {
    let file_path = "db.json";
    let connections = match std::fs::read_to_string(file_path) {
        Ok(content) => serde_json::from_str::<Vec<ConnectionInfo>>(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    Ok(connections)
}
