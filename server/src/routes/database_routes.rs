use actix_web::{get, post, web, HttpResponse};
use mongodb::bson::{oid::ObjectId};
use serde::{Serialize, Deserialize};
use sanitizer::prelude::*;

use crate::errors::CustomError;
use crate::services::database_services::DataBaseService;

#[derive(Deserialize, Sanitize)]
struct Login {
    #[sanitize(trim)]
    username: String,
    #[sanitize(trim)]
    password: String,
} 

#[derive(Deserialize)]
struct DataBaseRequest {
    id: String,
    session_token: String,
} 

#[derive(Serialize)]
struct LoginResponse {
    id: Option<ObjectId>,
    session_token: &'static str,
}

#[get("/login")]
async fn login(login: web::Form<Login>, database_services: web::Data<DataBaseService>)
    -> Result<HttpResponse, CustomError> {

    let user = database_services.get_user(&login.username).await?;

    // TODO: generate TTL and session token
    let res = LoginResponse {
        id: user.id,
        session_token: "sess_toke_lit"
    };
    Ok(HttpResponse::Ok().json(res))
}

#[post("/make_acc")]
async fn make_account(acc_info: web::Form<Login>, database_services: web::Data<DataBaseService>) -> Result<HttpResponse, CustomError> {

    let user = database_services.insert_user(&acc_info.username, &acc_info.password).await?;

    // TODO: generate TTL and session token
    let res = LoginResponse {
        id: user.id,
        session_token: "sess_toke_lit"
    };
    Ok(HttpResponse::Ok().json(res))
}

// TODO: implement session token 
#[post("/delete_acc")]
async fn delete_account(client_info: web::Form<DataBaseRequest>, database_services: web::Data<DataBaseService>) -> Result<HttpResponse, CustomError> {

    database_services.delete_user(&client_info.id).await?;

    // TODO: generate TTL and session token
    let res = LoginResponse {
        id: None,
        session_token: "sess_toke_lit"
    };
    Ok(HttpResponse::Ok().json(res))
} 

