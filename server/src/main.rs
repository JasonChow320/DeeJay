use actix_web::{web, App, HttpServer};

use crate::db::MongoDbClient;
use std::env;

mod handlers;
mod db;
mod model;

#[actix_web::main]
async fn main() -> std::io::Result<()> {

    dotenv::from_filename(".env.local").ok();
    let mongodb_uri =
      env::var("MONGODB_URI").expect("You must set the MONGODB_URI environment var!");
    let mongodb_client = MongoDbClient::new(mongodb_uri).await;

    HttpServer::new(|| {
        App::new()
            .service(handlers::hello)
            .service(handlers::echo)
            .route("/hey", web::get().to(handlers::manual_hello))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
