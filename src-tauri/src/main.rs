// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{self, Duration};

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::Manager;
use tauri::State;
use tokio_postgres::types::Type;
use tokio_postgres::{Client, NoTls, Row};

use std::fs::OpenOptions;
use std::io::Write;

use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use uuid::Uuid;

use rust_decimal::Decimal;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct ConnectionInfo {
    connection_name: String,
    connection_string: String,
}

struct AppState {
    client: Arc<Mutex<Option<Client>>>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn connect_to_database(
    connection_info: Option<ConnectionInfo>,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    if let Some(info) = connection_info {
        let (client, connection) = tokio_postgres::connect(&info.connection_string, NoTls)
            .await
            .map_err(|err| format!("Connection error: {}", err))?;

        // The connection object performs the actual communication with the database,
        // so spawn it off to run on its own.
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Connection error: {}", e);
            }
        });
        // Store the client for further use
        {
            let mut client_lock = state.client.lock().await;
            *client_lock = Some(client);
        }

        // スポーンして1分ごとに接続を確認するタスク
        let client_clone = state.client.clone();
        let app_handle = app_handle.clone();
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;
                let client_lock = client_clone.lock().await;
                if let Some(client) = &*client_lock {
                    let query_result = client.simple_query("SELECT 1").await;
                    if query_result.is_err() {
                        eprintln!("Lost connection to the database");
                        app_handle
                            .emit_all("database-connection-status", "disconnected")
                            .unwrap();
                    } else {
                        println!("Database connection is healthy");
                        app_handle
                            .emit_all("database-connection-status", "connected")
                            .unwrap();
                    }
                } else {
                    eprintln!("No database client available");
                    app_handle
                        .emit_all("database-connection-status", "disconnected")
                        .unwrap();
                }
            }
        });

        Ok("Connection successful".to_string())
    } else {
        Err("Invalid connection string".into())
    }
}

#[tauri::command]
async fn disconnect_from_database(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let mut client_lock = state.client.lock().await;
    *client_lock = None;
    app_handle
        .emit_all("database-connection-status", "disconnected")
        .unwrap();

    Ok("Disconnected successfully".to_string())
}

#[tauri::command]
async fn save_connection_info(connection_info: ConnectionInfo) -> Result<(), String> {
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
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(file_path)
            .map_err(|e| e.to_string())?;
        file.write_all(json_content.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn get_saved_connections() -> Result<Vec<ConnectionInfo>, String> {
    let file_path = "db.json";
    let connections = match std::fs::read_to_string(file_path) {
        Ok(content) => serde_json::from_str::<Vec<ConnectionInfo>>(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    Ok(connections)
}

#[tauri::command]
async fn execute_query(sql: String, state: State<'_, AppState>) -> Result<String, String> {
    let client_lock = state.client.lock().await;
    if let Some(client) = &*client_lock {
        let rows = client
            .query(&sql, &[])
            .await
            .map_err(|err| format!("Query execution error: {}", err))?;
        if rows.is_empty() {
            return Ok(json!({"columns": [], "rows": []}).to_string());
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|col| col.name().to_string())
            .collect();
        let data: Vec<Vec<String>> = rows.iter().map(|row| row_to_json(row)).collect();

        let result = json!({
            "columns": columns,
            "rows": data
        });

        Ok(result.to_string())
    } else {
        Err("No database connection".to_string())
    }
}

fn row_to_json(row: &Row) -> Vec<String> {
    row.columns()
        .iter()
        .enumerate()
        .map(|(i, col)| value_to_string(col.type_(), row, i))
        .collect()
}

fn value_to_string(value: &Type, row: &Row, idx: usize) -> String {
    // row.try_get(idx).map_or("NULL".to_string(), |v| v.to_string())
    match *value {
        Type::BOOL => row
            .try_get::<_, bool>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::INT2 => row
            .try_get::<_, i16>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::INT4 => row
            .try_get::<_, i32>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::INT8 => row
            .try_get::<_, i64>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::FLOAT4 => row
            .try_get::<_, f32>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::FLOAT8 => row
            .try_get::<_, f64>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::NUMERIC => row
            .try_get::<_, Decimal>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::VARCHAR | Type::TEXT | Type::CHAR | Type::BPCHAR | Type::NAME => row
            .try_get::<_, String>(idx)
            .map_or("NULL".to_string(), |v| v),
        Type::TIMESTAMP => row
            .try_get::<_, NaiveDateTime>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::TIMESTAMPTZ => row
            .try_get::<_, DateTime<Utc>>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::DATE => row
            .try_get::<_, NaiveDate>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::TIME => row
            .try_get::<_, NaiveTime>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::UUID => row
            .try_get::<_, Uuid>(idx)
            .map_or("NULL".to_string(), |v| v.to_string()),
        Type::JSON | Type::JSONB => "JSON IS NOT SUPPORTED".to_string(),
        Type::BYTEA => "BYTEA IS NOT SUPPORTED".to_string(),

        _ => "Unsupported type".to_string(),
    }
}
fn main() {
    tauri::Builder::default()
        .manage(AppState {
            client: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![
            connect_to_database,
            disconnect_from_database,
            execute_query,
            save_connection_info,
            get_saved_connections
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
