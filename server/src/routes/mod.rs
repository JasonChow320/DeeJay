use actix_web::{get, HttpResponse, Responder};

pub mod user_login_routes;
pub mod deejay_routes;
pub mod packet_struct;

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello world! You shouldn't be here lol, I'm hacking your system as we speak >.< I guess it's more like as I 01110011 01110000 01100101 01100001 01101011")
}

