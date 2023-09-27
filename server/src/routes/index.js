const express = require('express');
const router = express.Router();
const redis = require('./redis');

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// home index
router.get('/', function(req, res, next) {
    res.status(200).json({ message: 'Welcome to our 411 Project, this is the API we made'});
});

router.get('/hello', function(req, res, next){
    let sessionId = generateRandomString(Math.random()*32+8);
    redis.setex('ClientSession:'+sessionId, 7200, 'Client (without account) has started an session with server!');
    res.status(200).json({hello : sessionId});
});
module.exports = router;