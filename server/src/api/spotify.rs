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

// TODO: make client_id a parameter to pass in when initializing the client
const client_id: &str = "5424d2905c1249b7af5d4d24a3dee826";
const redirect_uri: &str = "http://localhost:1337/callback";

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

        println!("{:?}", res);

        match res.status() {
            reqwest::StatusCode::OK => {
                println!("Success!");
            },
            reqwest::StatusCode::NOT_FOUND => {
                println!("Got 404! Haven't found resource!");
            },
            reqwest::StatusCode::UNAUTHORIZED => {
                println!("Unauthorized request");
            },
            _ => {
                return Err(CustomError::ReqwestError { 
                    message: format!("error") })
            },
        };

        Ok(format!("GOT IT"))
    }

    pub async fn callback(&self) -> Result<String, CustomError> {

        let mut query_params = HashMap::new();

        query_params.insert("client_id", client_id);
        query_params.insert("response_type", "code");
        query_params.insert("redirect_uri", redirect_uri);

        let uri = "https://accounts.spotify.com/authorize";

        self.client.post(uri)
            .query(&query_params)
            .send();

        Ok(format!("GOT IT"))
    }
}
