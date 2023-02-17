use mongodb::bson::{doc, oid::ObjectId, Document};
use mongodb::{Client, Collection};

use crate::model::UserLogin;

const DB_NAME: &str = "deejay";
const COLLECTION_NAME: &str = "user_login";

#[derive(Clone, Debug)]
pub struct MongoDbClient {
    client: Client,
}

impl MongoDbClient {
    pub async fn new(mongodb_uri: String) -> Self {
        let mongodb_client = Client::with_uri_str(mongodb_uri)
            .await
            .expect("Failed to create MongoDB client");

        MongoDbClient {
            client: mongodb_client,
        }
    }
}
