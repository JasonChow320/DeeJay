use crate::errors::CustomError;

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

    /* 
     * Constructor: creates an instance of MongoDbClient.
     * 
     * @param mongodb_uri   the path to initialize the Mongo Client instance
     */ 
    pub async fn new(mongodb_uri: String) -> Self {

        let mongodb_client = Client::with_uri_str(mongodb_uri)
            .await
            .expect("Failed to create MongoDB client");

        MongoDbClient {
            client: mongodb_client,
        }
    }

    /* 
     * fn get_user
     * 
     * @brief   search for a document in the user_login collection by its username and return the document if found. Otherwise return 
     * 
     * @param username  the username to search in the collections
     *
     * @return  UserLogin struct or CustomError
     */ 
    pub async fn get_user(&self, username: &String) -> Result<UserLogin, CustomError> {

        let collection = self.get_user_collection();

        let user_doc = doc! { "username": username };
        collection.find_one(user_doc, None).await?.ok_or(CustomError::NotFound {
            message: format!("User not found"),
        })
    }

    /* 
     * fn insert_user
     * 
     * @brief  insert a new UserLogin document into the collection is the username has not been taken, otherwise return an error 
     * 
     * @param username  the username to insert into the collections
     * @param password  the password to insert into the collections
     *
     * @return  UserLogin struct or CustomError
     */ 
    pub async fn insert_user(&self, username: &String, password: &String) -> Result<UserLogin, CustomError> {

        let collection = self.get_user_collection();
        
        let user_doc = doc! { "username": username };
        let find_user = collection.find_one(user_doc, None).await?.ok_or(CustomError::NotFound {
            message: format!("")
        });

        match find_user {
            Ok(_) => return Err(CustomError::UsernameTakenError { 
                message: format!("Username is already taken")}),
            Err(_) => () 
        };

        let user = UserLogin {
            id: None,
            username: username.clone(),
            password: password.clone()
        };

        let insert_result = collection.insert_one(user, None).await?;
        let filter = doc! { "_id": &insert_result.inserted_id };
        collection.find_one(filter, None).await?.ok_or(CustomError::NotFound {
            message: String::from("Internal error, can't create user"),
        })
    }

    /* 
     * update_user
     * 
     * @brief   update a user's information, assumes user is already loggined in
     * 
     * @param id    the oid assigned by MongoDb that identifies the user's info
     * @param user  the new user login information to update the db with
     *
     * @return  UserLogin struct or CustomError
     */ 
    pub async fn update_user(&self, id: ObjectId, user: UserLogin) -> Result<UserLogin, CustomError> {

        let collection = self.get_user_collection();

        let query = doc! { "_id": &id };
        let update = doc! { "$set": Document::from(&user) };
        let _update_result = collection.update_one(query, update, None).await?;

        let filter = doc! { "_id": &id };
        collection.find_one(filter, None).await?.ok_or(CustomError::NotFound {
            message: format!("Internal error, can't find user"),
        })
    }

    /* 
     * fn delete_user
     * 
     * @brief   delete a user with the provided ObjectId 
     * 
     * @param ObjectId  the Objectid of the user we're deleting
     *
     * @return  UserLogin struct or CustomError
     */ 
    pub async fn delete_user(&self, id: ObjectId) -> Result<(), CustomError> {

        let collection = self.get_user_collection();

        let filter = doc! { "_id": &id };
        collection
            .find_one_and_delete(filter, None)
            .await?
            .ok_or(CustomError::NotFound {
                message: format!("Interal error, can't find user"),
            })?;

        Ok(())
    }

    fn get_user_collection(&self) -> Collection<UserLogin> {
        // Get the 'movies' collection from the 'sample_mflix' database:
        self.client.database(DB_NAME).collection::<UserLogin>(COLLECTION_NAME)
    }
}
