#[derive(Clone, Debug)]
pub struct ServerLogger {
    LoggerOn: bool,
}

impl ServerLogger {

    /* 
     * Constructor: creates an instance of ServerLogger
     * 
     * @param logger_on   boolean to turn logger on or off
     */ 
    pub async fn new(logger_on: bool) -> Self {

        ServerLogger {
            LoggerOn: logger_on
        }
    }

    pub fn log(&self, message: String) {

        if(self.LoggerOn) {

            let now = chrono::offset::Local::now();
            println!("-------------------------{}-------------------------", now);
            println!("{}", message);
            println!("--------------------------------------------------------------------------");
        }
    }
}
