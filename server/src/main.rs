use actix_web::{App, HttpServer};
use actix_web::web::Data;

use crate::db::{mongo, redis};
use crate::services::database_services::DataBaseService;
use crate::routes::user_login_routes;

use std::env;

mod db;
mod errors;
mod routes;
mod models;
mod services;
mod Logger;

#[actix_web::main]
async fn main() -> std::io::Result<()> {

    dotenv::from_filename(".env.local").ok();

    let mongodb_uri =
      env::var("MONGODB_URI").expect("You must set the MONGODB_URI environment var!");
    let mongodb_client = mongo::MongoDbClient::new(mongodb_uri).await;
    
    let redis_uri = env::var("REDIS_URI").expect("REDIS_URI env var should be specified");
    let redis_client = redis::create_client(redis_uri)
        .await
        .expect("Can't create Redis client");
    let redis_connection_manager = redis_client
        .get_tokio_connection_manager()
        .await
        .expect("Can't create Redis connection manager");

    let database_service = Data::new(DataBaseService::new(
        mongodb_client,
        redis_client,
        redis_connection_manager.clone(),
    ));

    HttpServer::new(move || {
        let mut app = App::new()
            .service(routes::index)
            .service(user_login_routes::login)
            .service(user_login_routes::make_account)
            .service(user_login_routes::delete_account)
            .app_data(database_service.clone());

        app
    })
    .bind(("127.0.0.1", 1337))?
    .run()
    .await
}
