use anyhow::Result;
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Arc;
use tauri::Manager;
use tauri::State;

use tokio::sync::Mutex;
use tokio_postgres::{types::Type, Client, NoTls, Row};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct ConnectionInfo {
    connection_name: String,
    connection_string: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ConnectionInfoWithId {
    id: Uuid,
    connection_name: String,
    connection_string: String,
}

#[derive(serde::Serialize, Debug)]
struct TableColumn {
    name: String,
    definition: String,
}

#[derive(serde::Serialize, Debug)]
struct TableInfo {
    name: String,
    comment: Option<String>,
    columns: Vec<TableColumn>,
}

struct AppState {
    clients: Arc<Mutex<HashMap<Uuid, Client>>>,
}

#[tauri::command]
async fn connect_to_database(
    connection_info: ConnectionInfo,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<Uuid, String> {
    let id = Uuid::new_v4();
    let connection_info_with_id = ConnectionInfoWithId {
        id,
        connection_name: connection_info.connection_name,
        connection_string: connection_info.connection_string,
    };

    connect_to_db_internal(connection_info_with_id, state.inner())
        .await
        .map_err(|e| e.to_string())?;

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
                        .emit_all(
                            "database-connection-status",
                            json!({"id": id, "status": "disconnected"}),
                        )
                        .unwrap();
                } else {
                    println!("Database connection with ID: {} is healthy", id);
                    app_handle
                        .emit_all(
                            "database-connection-status",
                            json!({"id": id, "status": "connected"}),
                        )
                        .unwrap();
                }
            }
        }
    });

    Ok(id)
}

async fn connect_to_db_internal(
    connection_info: ConnectionInfoWithId,
    state: &AppState,
) -> Result<Uuid, String> {
    let (client, connection) = tokio_postgres::connect(&connection_info.connection_string, NoTls)
        .await
        .map_err(|err| format!("Connection error: {}", err))?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });

    {
        let mut clients = state.clients.lock().await;
        clients.insert(connection_info.id, client);
    }

    Ok(connection_info.id)
}

#[tauri::command]
async fn disconnect_from_database(
    id: Uuid,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    disconnect_from_db_internal(id, state.inner())
        .await
        .map_err(|e| e.to_string())?;
    app_handle
        .emit_all(
            "database-connection-status",
            json!({"id": id, "status": "disconnected"}),
        )
        .unwrap();

    Ok("Disconnected successfully".to_string())
}

async fn disconnect_from_db_internal(
    id: Uuid,
    state: &AppState,
) -> Result<(), tokio_postgres::Error> {
    let mut clients = state.clients.lock().await;
    clients.remove(&id);
    Ok(())
}

#[tauri::command]
async fn execute_query(
    id: Uuid,
    sql: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    execute_query_internal(id, sql, state.inner())
        .await
        .map_err(|e| e.to_string())
}

async fn execute_query_internal(id: Uuid, sql: String, state: &AppState) -> Result<String, String> {
    let clients = state.clients.lock().await;
    if let Some(client) = clients.get(&id) {
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

#[tauri::command]
async fn get_schemas(id: Uuid, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    get_schemas_internal(id, state.inner())
        .await
        .map_err(|e| e.to_string())
}

async fn get_schemas_internal(id: Uuid, state: &AppState) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().await;
    if let Some(client) = clients.get(&id) {
        let rows = client
            .query("SELECT schema_name FROM information_schema.schemata", &[])
            .await
            .map_err(|e| e.to_string())?;
        let schemas: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
        Ok(schemas)
    } else {
        Err("No database connection".to_string())
    }
}

#[tauri::command]
async fn get_tables(
    id: Uuid,
    schema: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    get_tables_internal(id, schema, state.inner())
        .await
        .map_err(|e| e.to_string())
}

async fn get_tables_internal(
    id: Uuid,
    schema: String,
    state: &AppState,
) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().await;
    if let Some(client) = clients.get(&id) {
        let query = format!(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = '{}'",
            schema
        );

        let rows = client
            .query(query.as_str(), &[])
            .await
            .map_err(|e| e.to_string())?;
        let tables: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
        Ok(tables)
    } else {
        Err("No database connection".to_string())
    }
}

#[tauri::command]
async fn get_table_info(
    id: Uuid,
    schema: String,
    table: String,
    state: State<'_, AppState>,
) -> Result<TableInfo, String> {
    get_table_info_internal(id, schema, table, state.inner())
        .await
        .map_err(|e| e.to_string())
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

async fn get_table_info_internal(
    id: Uuid,
    schema: String,
    table: String,
    state: &AppState,
) -> Result<TableInfo, String> {
    let clients = state.clients.lock().await;
    if let Some(client) = clients.get(&id) {
        let table_info_query = format!(
            "SELECT table_name, obj_description('\"{}\".\"{}\"'::regclass) as comment FROM information_schema.tables WHERE table_schema = '{}' AND table_name = '{}'",
            schema, table, schema, table
        );
        let columns_query = format!(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '{}' AND table_name = '{}'",
            schema, table
        );

        let table_info_row = client
            .query_one(&table_info_query, &[])
            .await
            .map_err(|e| e.to_string())?;
        let table_name: String = table_info_row.get("table_name");
        let table_comment: Option<String> = table_info_row.get("comment");

        let columns_rows = client
            .query(&columns_query, &[])
            .await
            .map_err(|e| e.to_string())?;
        let columns: Vec<TableColumn> = columns_rows
            .iter()
            .map(|row| TableColumn {
                name: row.get("column_name"),
                definition: row.get("data_type"),
            })
            .collect();

        Ok(TableInfo {
            name: table_name,
            comment: table_comment,
            columns,
        })
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

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .manage(AppState {
            clients: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            connect_to_database,
            disconnect_from_database,
            execute_query,
            save_connection_info,
            get_saved_connections,
            get_schemas,
            get_tables,
            get_table_info
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use dotenv::dotenv;
    use std::env;

    #[tokio::test]
    async fn test_database_operations() {
        dotenv().ok();
        // 環境変数から接続情報を読み込む
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

        // 状態の初期化
        let state = AppState {
            clients: Arc::new(Mutex::new(HashMap::new())),
        };

        // 接続情報
        let connection_info = ConnectionInfo {
            connection_name: "TestConnection".into(),
            connection_string: database_url,
        };

        // データベースに接続
        let id = connect_to_db_internal(
            ConnectionInfoWithId {
                id: Uuid::new_v4(),
                connection_name: connection_info.connection_name.clone(),
                connection_string: connection_info.connection_string.clone(),
            },
            &state,
        )
        .await
        .unwrap();

        println!("Connected to database with ID: {}", id);

        // スキーマを取得
        let schemas = get_schemas_internal(id, &state).await.unwrap();
        println!("Schemas: {:?}", schemas);

        // テーブルを取得
        let tables = get_tables_internal(id, "public".into(), &state)
            .await
            .unwrap();
        println!("Tables: {:?}", tables);

        // テーブル情報を取得
        let table_info = get_table_info_internal(id, "public".into(), "shohin".into(), &state)
            .await
            .unwrap();
        println!("Table Info: {:?}", table_info);

        // クエリを実行
        let query_result = execute_query_internal(id, "SELECT * FROM shohin;".into(), &state)
            .await
            .unwrap();
        println!("Query Result: {}", query_result);

        // データベースから切断
        disconnect_from_db_internal(id, &state).await.unwrap();
        println!("Disconnected from database: ");
    }
}
