use std::str::FromStr;

use chrono::{Timelike, Utc};
use log::debug;
use mongodb::bson::oid::ObjectId;
use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client, Value};

use crate::db::mongo::MongoDbClient;
use crate::errors::CustomError;
use crate::errors::CustomError::{RedisError, TooManyRequests};
use crate::models::user_model::UserLogin;

const USERNAME_PREFIX: &str = "username";
const RATE_LIMIT_KEY_PREFIX: &str = "rate_limit";
const MAX_REQUESTS_PER_MINUTE: u64 = 1;

#[derive(Clone)]
pub struct DataBaseService {
    mongodb_client: MongoDbClient,
    redis_client: Client,
    redis_connection_manager: ConnectionManager,
}

impl DataBaseService {

    pub fn new(
        mongodb_client: MongoDbClient,
        redis_client: Client,
        redis_connection_manager: ConnectionManager,
    ) -> Self {
        DataBaseService {
            mongodb_client,
            redis_client,
            redis_connection_manager,
        }
    }

    pub async fn get_user(&self, username: &String) -> Result<UserLogin, CustomError> {
        self.mongodb_client.get_user(username).await
    }

    pub async fn insert_user(&self, username: &String, password: &String) -> Result<UserLogin, CustomError> {
        self.mongodb_client.insert_user(username, password).await
        /*
        self.redis_connection_manager
            .clone()
            .publish(
                NEW_PLANETS_CHANNEL_NAME,
                serde_json::to_string(&PlanetMessage::from(&planet))?,
            )
            .await?;
        */
    }

    /*
    pub async fn update_user(&self, planet_id: &str, planet: Planet) -> Result<UserLogin, CustomError> {

        let updated_planet = self
            .mongodb_client
            .update_planet(ObjectId::from_str(planet_id)?, planet)
            .await?;

        Ok(updated_planet)
    }
    */

    pub async fn delete_user(&self, id: &String) -> Result<(), CustomError> {

        self.mongodb_client
            .delete_user(ObjectId::from_str(id)?)
            .await?;

        //self.redis_connection_manager.clone().del(cache_key).await?;

        Ok(())
    }
}

/*
#[derive(Clone)]
pub struct RateLimitingService {
    redis_connection_manager: ConnectionManager,
}

impl RateLimitingService {
    pub fn new(redis_connection_manager: ConnectionManager) -> Self {
        RateLimitingService {
            redis_connection_manager,
        }
    }

    pub async fn assert_rate_limit_not_exceeded(&self, ip_addr: String) -> Result<(), CustomError> {
        let current_minute = Utc::now().minute();
        let rate_limit_key = format!("{}:{}:{}", RATE_LIMIT_KEY_PREFIX, ip_addr, current_minute);

        let (count, _): (u64, u64) = redis::pipe()
            .atomic()
            .incr(&rate_limit_key, 1)
            .expire(&rate_limit_key, 60)
            .query_async(&mut self.redis_connection_manager.clone())
            .await?;

        if count > MAX_REQUESTS_PER_MINUTE {
            Err(TooManyRequests {
                actual_count: count,
                permitted_count: MAX_REQUESTS_PER_MINUTE,
            })
        } else {
            Ok(())
        }
    }
}
*/
