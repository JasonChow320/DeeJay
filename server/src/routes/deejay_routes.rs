use actix_web::{get, post, web, HttpResponse};
use mongodb::bson::{oid::ObjectId};
use serde::{Serialize, Deserialize};
use sanitizer::prelude::*;

use crate::errors::CustomError;
use crate::routes::packet_struct::SpotifyLoginResponse;
use crate::services::database_services::DataBaseService;
use crate::services::deejay_services::DeeJayService;

#[get("/login")]
async fn login(database_services: web::Data<DataBaseService>, deejay_services: web::Data<DeeJayService>)
    -> Result<HttpResponse, CustomError> {

    deejay_services.test_reqwest().await?;

    let res = SpotifyLoginResponse{
        auth_code: "hi".to_string(),
        time_to_live_sec: 2,
    };
    Ok(HttpResponse::Ok().json(res))
}
