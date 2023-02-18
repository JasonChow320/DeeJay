use mongodb::bson::{self, doc, oid::ObjectId, Document};
use serde::{Deserialize, Serialize};
use sanitizer::prelude::*;
use std::fmt;

#[derive(Serialize, Deserialize, Debug, Sanitize)]
pub struct UserLogin {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[sanitize(trim)]
    pub username: String,
    pub password: String
}

impl From<&UserLogin> for Document {
    fn from(source: &UserLogin) -> Self {
        bson::to_document(source).expect("Can't convert a user login to Document")
    }
}

impl fmt::Display for UserLogin {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
