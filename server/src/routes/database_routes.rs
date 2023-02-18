use actix_web::{get, post, web, body::BoxBody, http::header::ContentType, 
    HttpRequest, HttpResponse, Responder};
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

#[derive(Serialize)]
struct LoginResponse {
    status_code: &'static i32,
    session_token: &'static str,
}

#[get("/login")]
async fn login(login: web::Form<Login>, database_services: web::Data<DataBaseService>)
    -> Result<HttpResponse, CustomError> {
    let user = database_services.get_user(&login.username).await?;
    Ok(HttpResponse::Ok().json(user))
}

#[post("/make_acc")]
async fn make_account(acc_info: web::Form<Login>, database_services: web::Data<DataBaseService>) -> Result<HttpResponse, CustomError> {
    let user = database_services.insert_user(acc_info.username.clone(), acc_info.password.clone()).await?;

    Ok(HttpResponse::Ok().json(user))
}
