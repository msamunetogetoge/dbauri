// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;
use tokio_postgres::{Client, NoTls};
use serde::{Deserialize, Serialize};
use serde_json::json;
use anyhow::Result;

use std::fs::OpenOptions;
use std::io::Write;





#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]struct ConnectionInfo {
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
async fn connect_to_database(connection_info: Option<ConnectionInfo>,state: State<'_, AppState>,) -> Result<String, String> {
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
     *state.client.lock().await = Some(client);

    Ok("Connection successful".to_string())
    }else{
        Err("Invalid connection string".into())
    }

   
}

#[tauri::command]
async fn save_connection_info(connection_info: ConnectionInfo) -> Result<(), String> {
    let file_path = "db.json";
    let mut connections = match std::fs::read_to_string(file_path) {
        Ok(content) => serde_json::from_str::<Vec<ConnectionInfo>>(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    if !connections.iter().any(|c| c.connection_string == connection_info.connection_string) {
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
        let rows = client.query(&sql, &[]).await.map_err(|err| format!("Query execution error: {}", err))?;
        if rows.is_empty() {
            return Ok(json!({"columns": [], "rows": []}).to_string());
        }


        let columns: Vec<String> = rows[0].columns().iter().map(|col| col.name().to_string()).collect();
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


fn row_to_json(row: &tokio_postgres::Row) -> Vec<String> {
    (0..row.len())
        .map(|i| {
            let value: Result<String, _> = row.try_get(i);
            match value {
                Ok(val) => val,
                Err(_) => {
                    let int_value: Result<i32, _> = row.try_get(i);
                    match int_value {
                        Ok(val) => val.to_string(),
                        Err(_) => "NULL".to_string(),
                    }
                }
            }
        })
        .collect()
}

fn main() {

    tauri::Builder::default()
    .manage(AppState {
        client: Arc::new(Mutex::new(None)),
    })
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![connect_to_database, execute_query,save_connection_info,get_saved_connections])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::tempdir;

    fn setup_test_config() -> tempfile::TempDir {
        let dir = tempdir().unwrap();
        let config_dir = dir.path().join("C:/Users/kenji/code/rust/dbauri/config");
        fs::create_dir_all(&config_dir).unwrap();
        let config_file_path = config_dir.join("db.json");

        let config_content = r#"
        {
            "default": "postgresql://myuser:mypassword@localhost:5432/mydatabase"
        }
        "#;

        let mut config_file = File::create(config_file_path).unwrap();
        config_file.write_all(config_content.as_bytes()).unwrap();

        dir
    }

    // #[tokio::test]
    // async fn test_connect_to_database_with_valid_info() {
    //     let connection_info = Some("postgresql://myuser:mypassword@localhost:5432/mydatabase".to_string());
    //     let result = connect_to_database(connection_info.).await;
    //     assert!(result.is_ok());
    // }

    // #[tokio::test]
    // async fn test_connect_to_database_with_invalid_info() {
    //     let _test_config = setup_test_config(); // 一時的な設定ファイルを作成
    //     let connection_info = Some("invalid_connection_string".to_string());
    //     let result = connect_to_database(connection_info).await;
    //     assert!(result.is_err());
    // }

    // #[tokio::test]
    // async fn test_connect_to_database_with_none() {
    //     let _test_config = setup_test_config(); // 一時的な設定ファイルを作成

    //     let result = connect_to_database(None).await;
    //     assert_eq!(result.unwrap(), "Connection successful".to_string());
    // }
}