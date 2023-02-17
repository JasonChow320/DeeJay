use std::str::FromStr;

use chrono::Utc;
use mongodb::bson::{self, doc, oid::ObjectId, Document};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct UserLogin {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub username: String,
    password: String
}
