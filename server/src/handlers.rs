use actix_web::{get, post, web, body::BoxBody, http::header::ContentType, 
    HttpRequest, HttpResponse, Responder};
use serde::{Serialize, Deserialize};
use sanitizer::prelude::*;

use crate::errors::CustomError;
use crate::services::DeeJayService;

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

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello world! You shouldn't be here lol, I'm hacking your system as we speak >.< I guess it's more like as I 01110011 01110000 01100101 01100001 01101011")
}

#[get("/login")]
async fn login(login: web::Form<Login>, deejay_service: web::Data<DeeJayService>)
    -> Result<HttpResponse, CustomError> {
    let user = deejay_service.get_user(&login.username).await?;
    Ok(HttpResponse::Ok().json(user))
}

#[post("/make_acc")]
async fn make_account(acc_info: web::Form<Login>, deejay_service: web::Data<DeeJayService>) -> Result<HttpResponse, CustomError> {
    let user = deejay_service.insert_user(acc_info.username.clone(), acc_info.password.clone()).await?;

    Ok(HttpResponse::Ok().json(user))
}
