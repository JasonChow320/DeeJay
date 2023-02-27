use mongodb::bson::{oid::ObjectId};
use sanitizer::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Deserialize, Sanitize)]
pub struct LoginRequest {
    #[sanitize(trim)]
    pub username: String,
    #[sanitize(trim)]
    pub password: String,
} 

#[derive(Deserialize)]
pub struct DataBaseRequest {
    pub session_token: String,
} 

#[derive(Serialize)]
pub struct LoginResponse {
    pub session_token: String,
    pub time_to_live_sec: usize,
}

#[derive(Serialize)]
pub struct SpotifyLoginResponse {
    pub auth_code: String,
    pub time_to_live_sec: usize,
}
