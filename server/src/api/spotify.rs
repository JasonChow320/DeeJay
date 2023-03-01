use reqwest::Client;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use reqwest::header::CONTENT_TYPE;

use crate::errors::CustomError;

#[derive(Serialize, Deserialize, Debug)]
struct GETAPIResponse {
    origin: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct JSONResponse {
    json: HashMap<String, String>,
}

#[derive(Clone, Debug)]
pub struct SpotifyClient {
    client: Client,
}

impl SpotifyClient {

    /* 
     * Constructor: creates an instance of MongoDbClient.
     * 
     * @param mongodb_uri   the path to connect to the Mongo Client instance
     */ 
    pub fn new() -> Self {

        let reqwest_client = reqwest::Client::new();

        SpotifyClient {
            client: reqwest_client,
        }
    }

    pub async fn test(&self) -> Result<String, CustomError> {

        let url = "https://api.spotify.com/v1/artists/1vCWHaC5f2uS3yhpwWbIA6/albums?album_type=SINGLE&offset=20&limit=10";

        let res = self.client.get(url)
            .send()
            .await?;

        match res.status() {
            reqwest::StatusCode::OK => {
                println!("Success!");
            },
            reqwest::StatusCode::NOT_FOUND => {
                println!("Got 404! Haven't found resource!");
            },
            _ => {
                return Err(CustomError::ReqwestError { 
                    message: format!("error") })
            },
        };

        Ok(format!("GOT IT"))
    }
}
