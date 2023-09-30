const express = require('express');
const router = express.Router();

const Login = require('../models/login');
const User = require('../models/user');
const config = require('../config/config');

const redis = require('./redis');
const CryptoJS = require('crypto-js');

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/**
 * @brief Fetch all Login Schema database in MongoDB. Requires admin access.
 * 
 * @param req.params.id    admin id associated to the application
 */
router.get('/users/:id', (req, res, next) => {
    var _id = req.params.id;
    if(_id == config.crypto.admin) {
        Login.find(function(err, userlogins) {
            if(err) {
                res.status(200).json(err);
                return;
            }
            res.status(200).json(userlogins);
        });
    } else {
        console.log('ID [' + _id + '] TRIED TO REQUEST LOGIN DATA!!!');
        next(); //gives back 404 response
    }
});

/**
 * @brief Helper function to salt the password.
 *
 * @param rsalt       the random salt generated for specific user 
 * @param password    the password user inputted
 *
 * @return SHA256 hashed password key
 */
let saltPassword = function(rsalt, password)
{
    return CryptoJS.SHA256(config.crypto.salt + rsalt + password);
}

/**
 * @brief Login to DeeJay application, requires a valid account.
 * 
 * @param req.body.username    username to make the account
 * @param req.body.password    password to make the account
 */
router.post('/userlogin', (req, res, next)=>{
    var myusername = req.body.username;
    var password = req.body.password;

    if (!myusername || !password) {
        res.status(401).json({error : 'Invalid inputs, require a username and password in request body'}); 
        return;
    }

    myusername = escape(myusername);
    password = escape(password);

    Login.findOne({username : myusername}, function(err, userLogin) {
        if(userLogin == null) {
            console.log('Error! ' + myusername + ' tried to login using password ' + password);
            //401 (Unauthorized) or 403 (Forbidden)
            res.status(401).json({error : 'Error! Username or password is incorrect.'}); 
            return;
        } 

        // correct login, find user data
        const saltedHash = saltPassword(userLogin.rsalt, password)
        if(saltedHash == userLogin.getpassword) {
            User.findOne({_id : userLogin.getkey}, function(error, user) {
                if(error) {
                    console.log('Error! username[' + myusername + '] tried to login using password [' + password + ']');
                    //401 Unauthorized or 403 : Forbidden
                    res.status(401).json({error : 'Error! Username or password is incorrect.'}); 
                    return;
                }

                // check if User already have valid sessionId saved
                redis.get('UserSession:' + user.sessionId, (err, data)=> {
                    if (data != null) {
                        console.log("user [" + myusername + "] still have valid session key");
                        redis.setex('UserSession:'+user.sessionId, 43200, user.session);
                        const response = {
                            sessionId : user.sessionId,
                            havespotify : user.havespotify,
                            error : null
                        };
                        res.json(response);
                    } else {
                        let sessionId = generateRandomString(16);
                        let sess = generateRandomString(8);
                        user.updateSession = sess;
                        user.sessionId = sessionId;
                        /* saves session for a day */
                        redis.setex('UserSession:'+sessionId, 43200, sess);
                        user.save();
                        const response = {
                            sessionId : sessionId,
                            havespotify : user.havespotify,
                            error : null
                        };
                        res.json(response);
                    }
                });

            });
        } else {
            console.log('Error! username [' + myusername + '] tried to login using password [' + password + ']');
            //401 Unauthorized or 403 : Forbidden
            res.status(401).json({error : 'Error! Username or password is incorrect.'}); 
        }
    });
});

/**
 * @brief Checks if username contains special characters or spaces
 *
 * @param username    the username to check
 * 
 * @return true if username contains special characters or spaces, false otherwise
 */
var stringContainsSpecialCharacters = function(username)
{
    let checkUsername = username.includes(' ') || username.includes('?') || username.includes('@') || username.includes('!') || username.includes('#') || username.includes('$') || username.includes('%') || username.includes('^') || username.includes('&') || username.includes('*');

    return checkUsername;
}
    
/**
 * @brief Create new user for DeeJay application. This requires a unique username.
 *        NOTE if we want to add spotify to an account, they are required to make 
 *        an account first, then redirect to Spotify login. 
 * 
 * @param req.body.username    username to make the account
 * @param req.body.password    password to make the account
 * @param req.body.email       email to make the account
 */
router.post('/user', (req, res, next) => {
    var myusername = req.body.username || null;
    var password = req.body.password|| null;
    var email = req.body.email|| null;

    if(myusername == null || password == null || email == null){
        res.status(400).json({error : 'Failed to add user'});
        return;
    }

    //check if the username is valid
    if(stringContainsSpecialCharacters(myusername)){
        res.status(400).json({message : 'Invalid username! Don\'t use space or special characters!'});
        return;
    }

    //check if username is unique
    Login.find({username : myusername}, function(err, userlogins){
        //then we can continue to make the acc
        if(userlogins.length != 0){
            console.log('Error! Username was already taken.');
            res.status(400).json({error : 'username was already taken!! Try another username'});
            return;
        } 

        //create user & user session ID
        var session = generateRandomString(8);
        var sessionId = generateRandomString(16);
        redis.setex('UserSession:'+sessionId, 43200, session);
        let newUser = new User({
            spotify:{
                havespotify: false,
            },
            session : session,
            sessionId : sessionId
        });

        newUser.save((err, user)=>{
            if(err){
                console.log(err);
                res.status(400).json({msg: 'Failed to add user', error : err});
                return;
            }

            //successfully created User schema, now Login schema
            var rsalt = CryptoJS.lib.WordArray.random(16);
            let escapedPassword = escape(password);
            var saltedHash = saltPassword(rsalt, escapedPassword);
            let escapedUsername = escape(myusername);
            let escapedEmail = escape(email);
            let newLogin = new Login({
                username: escapedUsername,
                password: saltedHash,
                email : escapedEmail,
                rsalt : rsalt,
                key : user._id
            });
            newLogin.save((err, userLogin)=>{
                if(err){
                    console.log('Unable to create login schema for username [' + username + ']');
                    // delete User schema 
                    User.delete({username : myusername}, function(err, result){
                        if(err){
                            console.log("Unable to delete user Schema made, oops?");
                        }
                    });
                    res.status(400).json({msg: 'Failed to add user', error : err});
                    return;
                }
                res.status(200).json({msg: 'User added successfully', sessionId : sessionId});
            });
        });
    });
});

/**
 * @brief Delete new user for DeeJay application. This requires a unique username.
 * 
 * @param req.body.username    username to make the account
 */
router.delete('/delete_user/:username', (req, res, next)=> {
    const username = req.params.username;
    Login.findOne({username : username}, function(error, data){
        if(error){
            console.log('error had occur when finding username');
            res.status(200).json({error : 'Error in removing the user, please try again in a little!'});
            return;
        }
        User.deleteOne({_id : data.key}, function(err2, result2){
            if(err2) {
                console.log('error when deleting user schema for user [' + username + ']');
                res.status(200).json({error : 'Error in removing the user, please try again in a little!'});
                return;
            }
            console.log('successfully deleted user schema for user [' + username + ']');

            Login.deleteOne({username: username}, function(err, result){
                if(err){
                    console.log('error when deleting login schema for user [' + username + ']');
                    res.status(200).json({error : 'Error in removing the user, please try again in a little!'});
                    return;
                }
                console.log('successfully deleted login schema for user [' + username + ']');
                res.status(200).json({message : 'Successfully removed your account!'});
            });
        });
    });   
});

/**
 * @brief Interal api call to delete user schema
 * 
 * @param req.params.id    unique MongoDB id generated for User's scheme
 */
router.delete('/userSchema/:id', (req, res, next)=> {
    const id = req.params.id;
    User.deleteOne({_id : id}, function(error, data){
        if(error){
            console.log("error had occur when finding username");
            res.status(200).json({error : 'Error in removing the user, please try again in a little!'});
        }else{
            res.status(200).json({success : 'I think that worked..'});
        }
    });   
});

/**
 * @brief Internal api call to delete login schema
 * 
 * @param req.params.id    unique MongoDB id generated for User's scheme
 */
router.delete('/loginSchema/:id', (req, res, next)=> {
    const id = req.params.id;
    Login.deleteOne({_id : id}, function(error, data){
        if(error){
            console.log("error had occur when finding username");
            res.status(200).json({error : 'Error in removing the user, please try again in a little!'});
        }else{
            res.status(200).json({success : 'I think that worked..'});
        }
    });   
});

module.exports = router;
