const mongoose = require('mongoose');
const User = require('./user');
const config = require('../config/config');
const CryptoJS = require('crypto-js');

const LoginSchema = mongoose.Schema({
    username:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    rsalt:{
        type: String,
        required: true
    },
    key : {
        type: String,
        required: true
    }
});

LoginSchema.virtual('getpassword')
.get(function(){
    return this.password;
});

//check if user have a spotify account login
LoginSchema.virtual('getkey')
.get(function(){
    return this.key;
})
.set(function(str){
    this.key = str;
});


module.exports = mongoose.model('Login', LoginSchema);
