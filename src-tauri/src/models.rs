use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInfo {
    pub connection_name: String,
    pub connection_string: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConnectionInfoWithId {
    pub id: Uuid,
    pub connection_name: String,
    pub connection_string: String,
}

#[derive(Serialize, Debug)]
pub struct TableColumn {
    pub name: String,
    pub definition: String,
}

#[derive(Serialize, Debug)]
pub struct TableInfo {
    pub name: String,
    pub comment: Option<String>,
    pub columns: Vec<TableColumn>,
}
