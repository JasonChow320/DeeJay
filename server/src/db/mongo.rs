use crate::errors::CustomError;
use crate::errors::CustomError::NotFound;

use mongodb::bson::{doc, oid::ObjectId, Document};
use mongodb::{Client, Collection};

use crate::models::user_model::UserLogin;

const DB_NAME: &str = "deejay";
const COLLECTION_NAME: &str = "user_login";

#[derive(Clone, Debug)]
pub struct MongoDbClient {
    client: Client,
}

impl MongoDbClient {
    //TODO: change error messages

    pub async fn new(mongodb_uri: String) -> Self {
        let mongodb_client = Client::with_uri_str(mongodb_uri)
            .await
            .expect("Failed to create MongoDB client");

        MongoDbClient {
            client: mongodb_client,
        }
    }

    // TODO: see if sanitization is needed, change error msg when mongo fully integrated
    pub async fn get_user(&self, username: &String) -> Result<UserLogin, CustomError> {
        let collection = self.get_user_collection();

        let filter = doc! { "username": &username };
        collection.find_one(filter, None).await?.ok_or(NotFound {
            message: format!("Can't find a user by id: {}", &username),
        })
    }

    pub async fn insert_user(&self, username: String, password: String) -> Result<UserLogin, CustomError> {

        //let user_db = self.get_user_collection();
        let user_db = self.client.database(DB_NAME).collection::<UserLogin>(COLLECTION_NAME);

        let user = UserLogin {
            username: username,
            password: password
        };

        let insert_result = user_db.insert_one(user, None).await?;
        let filter = doc! { "_id": &insert_result.inserted_id };
        user_db.find_one(filter, None).await?.ok_or(NotFound {
            message: String::from("Can't create user"),
        })
    }

    pub async fn update_user(&self, id: ObjectId, user: UserLogin) -> Result<UserLogin, CustomError> {
        let collection = self.get_user_collection();

        let query = doc! { "_id": &id };
        let update = doc! { "$set": Document::from(&user) };
        let _update_result = collection.update_one(query, update, None).await?;

        let filter = doc! { "_id": &id };
        collection.find_one(filter, None).await?.ok_or(NotFound {
            message: format!("Can't find an updated user by id: {}", &id),
        })
    }

    pub async fn delete_user(&self, id: ObjectId) -> Result<(), CustomError> {
        let collection = self.get_user_collection();

        let filter = doc! { "_id": &id };
        collection
            .find_one_and_delete(filter, None)
            .await?
            .ok_or(NotFound {
                message: format!("Can't delete a user by id: {}", id),
            })?;

        Ok(())
    }

    fn get_user_collection(&self) -> Collection<UserLogin> {
        // Get the 'movies' collection from the 'sample_mflix' database:
        self.client.database(DB_NAME).collection::<UserLogin>(COLLECTION_NAME)
    }
}
