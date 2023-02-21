use std::str::FromStr;

use chrono::{Timelike, Utc};
use log::debug;
use mongodb::bson::oid::ObjectId;
use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client, Value};

use crate::db::mongo::MongoDbClient;
use crate::errors::CustomError;
use crate::errors::CustomError::{RedisError, TooManyRequests, InvalidSessionToken};
use crate::models::user_model::UserLogin;
use crate::services::random;

use crate::routes::packet_struct::LoginResponse;

const USERNAME_PREFIX: &str = "username";
const RATE_LIMIT_KEY_PREFIX: &str = "rate_limit";
const MAX_REQUESTS_PER_MINUTE: u64 = 1;
const SESSION_TIMEOUT_SEC: usize = 120;
const SESSION_KEY_LEN: usize = 30;

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
     * fn login_user
     *
     * @brief    find user with <username>, return a unique session token if found, the token will be saved to Redis 
     * 
     * @param username   The username to search for
     *
     * @return   A LoginResponse if found, otherwise some CustomError
     */
    pub async fn login_user(&self, username: &String) -> Result<LoginResponse, CustomError> {

        let user: UserLogin = self.mongodb_client.get_user(username).await?;
        let session_token: String = self.set_user_session_cache_key(user).await?;

        let login_res = LoginResponse {
            session_token: session_token,
            time_to_live_sec: SESSION_TIMEOUT_SEC,
        };

        Ok(login_res)
    }

    /* 
     * fn insert_user
     *
     * @brief    insert user with <username> and <password>, return a unique session token if successful, the token will be saved for one day
     * 
     * @param username   The username to create an account for
     * @param password   The password to create an account with
     *
     * @return   A LoginResponse if found, otherwise some CustomError
     */
    pub async fn insert_user(&self, username: &String, password: &String) -> Result<LoginResponse, CustomError> {

        self.mongodb_client.insert_user(username, password).await?;

        let user: UserLogin = self.mongodb_client.get_user(username).await?;

        let session_token: String = self.set_user_session_cache_key(user).await?;

        let login_res = LoginResponse {
            session_token: session_token,
            time_to_live_sec: SESSION_TIMEOUT_SEC,
        };

        Ok(login_res)

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
     * @param session_token   The session_token that maps to the ObjectId of the user
     *
     * @return   A regular Ok if found and deleted, otherwise some CustomError
     */
    pub async fn delete_user(&self, session_token: &String) -> Result<(), CustomError> {

        let object_id: UserLogin = self.get_user_login(session_token).await?;

        //self.redis_connection_manager.clone().del(cache_key).await?;
        self.mongodb_client
            .delete_user(object_id.id.unwrap())
            .await?;

        self.delete_user_session_token(session_token).await?;

        Ok(())
    }

    /* 
     * fn get_user_login
     *
     * @brief   get UserLogin struct from Redis cache using session_token
     * 
     * @param session_token   The session token that is mapped to the cached UserLogin struct
     *
     * @return   UserLogin struct if found, otherwise some CustomError
     */
    pub async fn get_user_login(&self, session_token: &String) -> Result<UserLogin, CustomError> {

        let user_session_cache_key: String= format!("{}:{}", USERNAME_PREFIX, session_token);

        let mut con = self.redis_client.get_async_connection().await?;

        let user_login: Value = con.get(&user_session_cache_key).await?;

        match user_login {
            Value::Nil => {
                debug!("Unable to find user with session_token: {}", session_token);

                Err(InvalidSessionToken {
                    message: "Invalid session token".to_string(),
                })
            }
            Value::Data(val) => {
                debug!("Find object id from cache, valid session token: {}", session_token);
                Ok(serde_json::from_slice(&val)?)
            }
            _ => Err(RedisError {
                message: "Unexpected response from Redis".to_string(),
            }),
        }
    }

    /* 
     * fn set_user_session_cache_key
     *
     * @brief   generate session token and save <session_token:UserLogin> to Redis
     * 
     * @param user_login   The UserLogin struct to cache to Redis
     *
     * @return the session token 
     */
    async fn set_user_session_cache_key(&self, user_login: UserLogin) -> Result<String, CustomError> {

        let random_string: String = random::generate_random_string(SESSION_KEY_LEN);
        let user_session_cache_key: String = format!("{}:{}", USERNAME_PREFIX, random_string);

        let mut con = self.redis_client.get_async_connection().await?;

        let _: () = redis::pipe()
            .atomic()
            .set(&user_session_cache_key, &user_login)
            .expire(&user_session_cache_key, SESSION_TIMEOUT_SEC)
            .query_async(&mut con)
            .await?;

        Ok(random_string)
    }

    /* 
     * fn delete_user_session_token
     *
     * @brief   delete entry from Redis cache with session_token
     * 
     * @param session_token   The session token to remove from cache 
     *
     * @return   
     */
    async fn delete_user_session_token(&self, session_token: &String) -> Result<(), CustomError> {

        let user_session_cache_key: String = format!("{}:{}", USERNAME_PREFIX, session_token);

        let mut con = self.redis_client.get_async_connection().await?;

        let _: () = redis::pipe()
            .atomic()
            .del(&user_session_cache_key)
            .query_async(&mut con)
            .await?;

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
