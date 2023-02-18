use actix_web::{App, HttpServer};
use actix_web::web::Data;

use crate::db::MongoDbClient;
use crate::services::DeeJayService;

use std::env;

mod db;
mod errors;
mod handlers;
mod model;
mod redis;
mod services;

#[actix_web::main]
async fn main() -> std::io::Result<()> {

    dotenv::from_filename(".env.local").ok();

    let mongodb_uri =
      env::var("MONGODB_URI").expect("You must set the MONGODB_URI environment var!");
    let mongodb_client = MongoDbClient::new(mongodb_uri).await;
    
    let redis_uri = env::var("REDIS_URI").expect("REDIS_URI env var should be specified");
    let redis_client = redis::create_client(redis_uri)
        .await
        .expect("Can't create Redis client");
    let redis_connection_manager = redis_client
        .get_tokio_connection_manager()
        .await
        .expect("Can't create Redis connection manager");

    let deejay_service = Data::new(DeeJayService::new(
        mongodb_client,
        redis_client,
        redis_connection_manager.clone(),
    ));

    HttpServer::new(move || {
        let mut app = App::new()
            .service(handlers::index)
            .service(handlers::login)
            .service(handlers::make_account)
            .app_data(deejay_service.clone());

        app
    })
    .bind(("127.0.0.1", 1337))?
    .run()
    .await
}
