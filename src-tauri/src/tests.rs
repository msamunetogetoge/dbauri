use super::{db, models};
use db::{DbState};
use models::{ConnectionInfo, ConnectionInfoWithId};
use dotenv::dotenv;
use std::env;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[tokio::test]
async fn test_database_operations() {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let state = DbState {
        clients: Arc::new(Mutex::new(HashMap::new())),
    };

    let connection_info = ConnectionInfo {
        connection_name: "TestConnection".into(),
        connection_string: database_url,
    };

    let id = db::connect(
        ConnectionInfoWithId {
            id: Uuid::new_v4(),
            connection_name: connection_info.connection_name.clone(),
            connection_string: connection_info.connection_string.clone(),
        },
        &state,
    )
    .await
    .unwrap();

    let schemas = db::get_schemas(id, &state).await.unwrap();
    println!("Schemas: {:?}", schemas);

    let tables = db::get_tables(id, "public".into(), &state).await.unwrap();
    println!("Tables: {:?}", tables);

    let table_info = db::get_table_info(id, "public".into(), "shohin".into(), &state)
        .await
        .unwrap();
    println!("Table Info: {:?}", table_info);

    let query_result = db::execute_query(id, "SELECT * FROM shohin;".into(), &state)
        .await
        .unwrap();
    println!("Query Result: {}", query_result);

    db::disconnect(id, &state).await.unwrap();
}
