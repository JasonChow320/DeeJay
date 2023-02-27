use reqwest::Client;
use crate::errors::CustomError;

use crate::models::user_model::UserLogin;

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
    pub async fn new() -> Self {

        let reqwest_client = reqwest::Client::new();

        SpotifyClient {
            client: reqwest_client,
        }
    }

    pub async fn test(self) -> Result<String, reqwest::Error> {

        let url = "https://api.spotify.com/v1/artists/1vCWHaC5f2uS3yhpwWbIA6/albums?album_type=SINGLE&offset=20&limit=10";

        self.client.get(url).send().await.unwrap().text().await
    }
}
