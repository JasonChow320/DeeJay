use actix_web::{get, post, web, HttpResponse};

use crate::errors::CustomError;
use crate::services::database_services::DataBaseService;
use crate::routes::packet_struct::{LoginRequest, LoginResponse, DataBaseRequest};

#[get("/login")]
async fn login(login: web::Form<LoginRequest>, database_services: web::Data<DataBaseService>)
    -> Result<HttpResponse, CustomError> {

    let login_res: LoginResponse = database_services.login_user(&login.username).await?;

    Ok(HttpResponse::Ok().json(login_res))
}

#[post("/make_acc")]
async fn make_account(acc_info: web::Form<LoginRequest>, database_services: web::Data<DataBaseService>)
    -> Result<HttpResponse, CustomError> {

    let res: LoginResponse = database_services.insert_user(&acc_info.username, &acc_info.password).await?;

    Ok(HttpResponse::Ok().json(res))
}

// TODO: remove session token?
#[post("/delete_acc")]
async fn delete_account(client_info: web::Form<DataBaseRequest>, database_services: web::Data<DataBaseService>) -> Result<HttpResponse, CustomError> {

    database_services.delete_user(&client_info.session_token).await?;

    Ok(HttpResponse::Ok().finish())
} 

