use crate::models::{ConnectionInfoWithId, TableColumn, TableInfo};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use rust_decimal::Decimal;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_postgres::{types::Type, Client, NoTls, Row};
use uuid::Uuid;

pub struct DbState {
    pub clients: Arc<Mutex<HashMap<Uuid, Client>>>,
}

pub async fn connect(
    connection_info: ConnectionInfoWithId,
    state: &DbState,
) -> Result<Uuid, String> {
    let (client, connection) =
        tokio_postgres::connect(&connection_info.connection_string, NoTls)
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

pub async fn disconnect(id: Uuid, state: &DbState) -> Result<(), tokio_postgres::Error> {
    let mut clients = state.clients.lock().await;
    clients.remove(&id);
    Ok(())
}

pub async fn execute_query(id: Uuid, sql: String, state: &DbState) -> Result<String, String> {
    let clients = state.clients.lock().await;
    if let Some(client) = clients.get(&id) {
        if sql.trim().to_uppercase().starts_with("SELECT") {
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
            let result = json!({ "columns": columns, "rows": data });
            Ok(result.to_string())
        } else {
            let rows_affected = client
                .execute(&sql, &[])
                .await
                .map_err(|err| format!("Execution error: {}", err))?;
            Ok(json!({"message": "Command completed", "rows_affected": rows_affected}).to_string())
        }
    } else {
        Err("No database connection".to_string())
    }
}

pub async fn get_schemas(id: Uuid, state: &DbState) -> Result<Vec<String>, String> {
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

pub async fn get_tables(id: Uuid, schema: String, state: &DbState) -> Result<Vec<String>, String> {
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

pub async fn get_table_info(
    id: Uuid,
    schema: String,
    table: String,
    state: &DbState,
) -> Result<TableInfo, String> {
    let clients = state.clients.lock().await;
    if let Some(client) = clients.get(&id) {
        let table_info_query = format!(
            "SELECT table_name, obj_description('"{}"."{}"'::regclass) as comment FROM information_schema.tables WHERE table_schema = '{}' AND table_name = '{}'",
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
        Type::BOOL => row.try_get::<_, bool>(idx).map_or("NULL".to_string(), |v| v.to_string()),
        Type::INT2 => row.try_get::<_, i16>(idx).map_or("NULL".to_string(), |v| v.to_string()),
        Type::INT4 => row.try_get::<_, i32>(idx).map_or("NULL".to_string(), |v| v.to_string()),
        Type::INT8 => row.try_get::<_, i64>(idx).map_or("NULL".to_string(), |v| v.to_string()),
        Type::FLOAT4 => row.try_get::<_, f32>(idx).map_or("NULL".to_string(), |v| v.to_string()),
        Type::FLOAT8 => row.try_get::<_, f64>(idx).map_or("NULL".to_string(), |v| v.to_string()),
        Type::NUMERIC => row.try_get::<_, Decimal>(idx).map_or("NULL".to_string(), |v| v.to_string()),
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
