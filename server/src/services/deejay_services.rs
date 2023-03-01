use std::str::FromStr;

use chrono::{Timelike, Utc};
use log::debug;
use mongodb::bson::oid::ObjectId;
use redis::aio::ConnectionManager;

use crate::errors::CustomError;
use crate::models::user_model::UserLogin;
use crate::api::spotify::SpotifyClient;

use crate::routes::packet_struct::LoginResponse;

const USERNAME_PREFIX: &str = "username";
const RATE_LIMIT_KEY_PREFIX: &str = "rate_limit";
const MAX_REQUESTS_PER_MINUTE: u64 = 1;
const SESSION_TIMEOUT_SEC: usize = 120;
const SESSION_KEY_LEN: usize = 30;

#[derive(Clone)]
pub struct DeeJayService {
    reqwest_client : SpotifyClient,
}

impl DeeJayService {

    /*
     * Constructor
     *
     * Initialize DeeJayService
     */
    pub fn new(client: SpotifyClient) -> Self {
        DeeJayService {
            reqwest_client: client,
        }
    }

    pub async fn test_reqwest(&self) -> Result<String, CustomError> {
        self.reqwest_client.test().await
    }
}    

