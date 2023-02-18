use std::str::FromStr;

use chrono::{Timelike, Utc};
use log::debug;
use mongodb::bson::oid::ObjectId;
use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client, Value};

use crate::db::MongoDbClient;
use crate::errors::CustomError;
use crate::errors::CustomError::{RedisError, TooManyRequests};
use crate::model::{UserLogin};

const USERNAME_PREFIX: &str = "username";
const RATE_LIMIT_KEY_PREFIX: &str = "rate_limit";
const MAX_REQUESTS_PER_MINUTE: u64 = 1;

#[derive(Clone)]
pub struct DeeJayService {
    mongodb_client: MongoDbClient,
    redis_client: Client,
    redis_connection_manager: ConnectionManager,
}

impl DeeJayService {
    pub fn new(
        mongodb_client: MongoDbClient,
        redis_client: Client,
        redis_connection_manager: ConnectionManager,
    ) -> Self {
        DeeJayService {
            mongodb_client,
            redis_client,
            redis_connection_manager,
        }
    }

    pub async fn get_user(&self, username: &String) -> Result<UserLogin, CustomError> {
        self.mongodb_client.get_user(username).await
    }

    pub async fn insert_user(&self, username: String, password: String) -> Result<UserLogin, CustomError> {
        let user = self.mongodb_client.insert_user(username, password).await?;
        /*
        self.redis_connection_manager
            .clone()
            .publish(
                NEW_PLANETS_CHANNEL_NAME,
                serde_json::to_string(&PlanetMessage::from(&planet))?,
            )
            .await?;
        */
        Ok(user)
    }

    /*
    pub async fn get_planet(&self, planet_id: &str) -> Result<Planet, CustomError> {
        let cache_key = self.get_planet_cache_key(planet_id);
        let mut con = self.redis_client.get_async_connection().await?;

        let cached_planet = con.get(&cache_key).await?;
        match cached_planet {
            Value::Nil => {
                debug!("Use database to retrieve a planet by id: {}", &planet_id);
                let result: Planet = self
                    .mongodb_client
                    .get_planet(ObjectId::from_str(planet_id)?)
                    .await?;

                let _: () = redis::pipe()
                    .atomic()
                    .set(&cache_key, &result)
                    .expire(&cache_key, 60)
                    .query_async(&mut con)
                    .await?;

                Ok(result)
            }
            Value::Data(val) => {
                debug!("Use cache to retrieve a planet by id: {}", planet_id);
                Ok(serde_json::from_slice(&val)?)
            }
            _ => Err(RedisError {
                message: "Unexpected response from Redis".to_string(),
            }),
        }
    }

    pub async fn update_planet(
        &self,
        planet_id: &str,
        planet: Planet,
    ) -> Result<Planet, CustomError> {
        let updated_planet = self
            .mongodb_client
            .update_planet(ObjectId::from_str(planet_id)?, planet)
            .await?;

        let cache_key = self.get_planet_cache_key(planet_id);
        self.redis_connection_manager.clone().del(cache_key).await?;

        Ok(updated_planet)
    }

    pub async fn delete_planet(&self, planet_id: &str) -> Result<(), CustomError> {
        self.mongodb_client
            .delete_planet(ObjectId::from_str(planet_id)?)
            .await?;

        let cache_key = self.get_planet_cache_key(planet_id);
        self.redis_connection_manager.clone().del(cache_key).await?;

        Ok(())
    }

    pub async fn get_image_of_planet(&self, planet_id: &str) -> Result<Vec<u8>, CustomError> {
        let cache_key = self.get_image_cache_key(planet_id);
        let mut redis_connection_manager = self.redis_connection_manager.clone();

        let cached_image = redis_connection_manager.get(&cache_key).await?;
        match cached_image {
            Value::Nil => {
                debug!(
                    "Use database to retrieve an image of a planet by id: {}",
                    &planet_id
                );
                let planet = self
                    .mongodb_client
                    .get_planet(ObjectId::from_str(planet_id)?)
                    .await?;
                let result = crate::db::get_image_of_planet(&planet.name).await;

                let _: () = redis::pipe()
                    .atomic()
                    .set(&cache_key, result.clone())
                    .expire(&cache_key, 60)
                    .query_async(&mut redis_connection_manager)
                    .await?;

                Ok(result)
            }
            Value::Data(val) => {
                debug!(
                    "Use cache to retrieve an image of a planet by id: {}",
                    &planet_id
                );
                Ok(val)
            }
            _ => Err(RedisError {
                message: "Unexpected response from Redis".to_string(),
            }),
        }
    }

    fn get_planet_cache_key(&self, planet_id: &str) -> String {
        format!("{}:{}", USERNAME_PREFIX, planet_id)
    }
    */
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
