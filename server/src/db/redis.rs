use actix_web::web::{Bytes, Data};
use redis::{Client, FromRedisValue, RedisError};
use redis::{RedisWrite, ToRedisArgs};

use crate::errors::CustomError;
use crate::models::user_model::UserLogin;

use std::sync::Mutex;

pub async fn create_client(redis_uri: String) -> Result<Client, RedisError> {
    Ok(Client::open(redis_uri)?)
}

impl ToRedisArgs for &UserLogin {
    fn write_redis_args<W>(&self, out: &mut W)
    where
        W: ?Sized + RedisWrite,
    {
        out.write_arg_fmt(serde_json::to_string(self).expect("Can't serialize UserLogin as string"))
    }
}
