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
use crate::services::random;

const USERNAME_PREFIX: &str = "username";
const RATE_LIMIT_KEY_PREFIX: &str = "rate_limit";
const MAX_REQUESTS_PER_MINUTE: u64 = 1;
const SESSION_TIMEOUT: usize = 60;

#[derive(Clone)]
pub struct DataBaseService {
    mongodb_client: MongoDbClient,
    redis_client: Client,
    redis_connection_manager: ConnectionManager,
}

impl DataBaseService {

    /*
     * Constructor
     *
     * Initialize clients for MongoDb, Redis, and Redis Connection
     */
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

    /* 
     * fn get_user
     *
     * @brief    find user with <username>, return a unique session token if found, the token will be saved for one day
     * 
     * @param username   The username to search for
     *
     * @return   A Token if found, otherwise some CustomError
     */
    pub async fn get_user(&self, username: &String) -> Result<String, CustomError> {

        let user = self.mongodb_client.get_user(username).await?;

        println!("Hello world");
        let randomString = random::generate_random_string();
        let user_session_cache_key = format!("{}:{}", USERNAME_PREFIX, randomString);

        let mut con = self.redis_client.get_async_connection().await?;

        let _: () = redis::pipe()
            .atomic()
            .set(&user_session_cache_key, ObjectId::to_hex(user.id.unwrap()))
            .expire(&user_session_cache_key, SESSION_TIMEOUT)
            .query_async(&mut con)
            .await?;

        println!("Bye world");
        Ok(randomString)
    }

    /* 
     * fn insert_user
     *
     * @brief    insert user with <username> and <password>, return a unique session token if successful, the token will be saved for one day
     * 
     * @param username   The username to create an account for
     * @param password   The password to create an account with
     *
     * @return   A Token if found, otherwise some CustomError
     */
    pub async fn insert_user(&self, username: &String, password: &String) -> Result<String, CustomError> {

        self.mongodb_client.insert_user(username, password).await?;

        let user = self.mongodb_client.get_user(username).await?;

        let randomString = random::generate_random_string();
        let user_session_cache_key = format!("{}:{}", USERNAME_PREFIX, randomString);

        let mut con = self.redis_client.get_async_connection().await?;

        let _: () = redis::pipe()
            .atomic()
            .set(&user_session_cache_key, ObjectId::to_hex(user.id.unwrap()))
            .expire(&user_session_cache_key, SESSION_TIMEOUT)
            .query_async(&mut con)
            .await?;

        Ok(randomString)

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

    /* 
     * fn delete_user
     *
     * @brief   delete an user with the ObjectId given 
     * 
     * @param id   The ObjectId for the Document to delete
     *
     * @return   A regular Ok if found and deleted, otherwise some CustomError
     */
    pub async fn delete_user(&self, id: &String) -> Result<(), CustomError> {

        self.mongodb_client
            .delete_user(ObjectId::from_str(id)?)
            .await?;

        //self.redis_connection_manager.clone().del(cache_key).await?;

        Ok(())
    }

    /* 
     * fn get_user_session_cache_key
     *
     * @brief   map username:session_token to the user's ObjectId 
     * 
     * @param session   The session token that is mapped to the logged in user's ObjectId
     *
     * @return   ObjectId if found, otherwise some CustomError
     */
    async fn get_user_session_cache_key(&self, session: String) -> String {

        format!("{}:{}", USERNAME_PREFIX, session)
    }

    /* 
     * fn set_user_session_cache_key
     *
     * @brief   map username:session_token to the user's ObjectId 
     * 
     * @param session   The session token that is mapped to the logged in user's ObjectId
     *
     * @return the session token 
     */
    async fn set_user_session_cache_key(&self, object_id: String) -> Result<String, CustomError> {

        let randomString = random::generate_random_string();
        let user_session_cache_key = format!("{}:{}", USERNAME_PREFIX, randomString);

        let mut con = self.redis_client.get_async_connection().await?;

        let _: () = redis::pipe()
            .atomic()
            .set(&user_session_cache_key, &object_id)
            .expire(&user_session_cache_key, 60)
            .query_async(&mut con)
            .await?;

        Ok(randomString)
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
