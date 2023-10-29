/* read this to see how we're transferring data between front and back end
https://www.webucator.com/how-to/how-send-receive-json-data-from-the-server.cfm */

/* taken from Spotify Web API template and integrated into our routes for /spotifyapi
   Will have all spotify related api calls, server to server authenication will to be checked and refreshed if needed
   on every request received. Every api call will require a valid session id to obtain the correct response, either in the form of a 
   client session id "sessionId" (without our app account) or user-login session id "loginSession" (with our app account). 
   sessionId is acquired after Spotify login while loginSession is acquired after account login */

const express = require('express'); 
const request = require('request'); 
const querystring = require('querystring');
const router = express.Router();

/* Autherication & Authorization */
const config = require('../config/config');
var client_id = config.spotify.SPOTIFY_CLIENTID; // Your client id
var client_secret = config.spotify.SPOTIFY_SECRETID; // Your secret
var redirect_uri = config.spotify.callback; // Your redirect uri

/* Use redis for cache */
const redis= require('./redis');

// uses sessionId to directly access user schema when adding/using Spotify user refresh token 
const User = require('../models/user');

var stateKey = 'spotify_auth_state';
var sessionId = 'sessionId';

/**
* Generates a random string containing numbers and letters
* @param  {number} length The length of the string
* @return {string} The generated string
*/
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/* login to Spotify without account */
router.get('/login/', function(req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    var id = generateRandomString(32);
    res.cookie(sessionId, id);

    /* requests authorization from user */
    var scope = 'user-read-private user-read-email playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
    }));
});

/* check for Access or Refresh token for an account login user */
function checkUserRefreshToken(req, res, next){
    var sessionId = req.body.sessionId || null;
    if(sessionId == null){
        res.status(204).send({message : 'invalid sessionId'});
    }

    //first check if they already have access token
    redis.get(sessionId+':spotifyUserAccessToken', (err, data)=>{
        if(data != null){
            //already have access token
            res.redirect('http://localhost:3000?' + querystring.stringify({loginSession : sessionId}));
        }

        //then check if there's a valid user session
        redis.get('UserSession:'+sessionId, (err, data)=>{
            if(err) {
                console.log('Invalid user session id detected!');
                res.status(204).send({message : 'Error, invalid session'});
            }
            if(data != null){
                User.findOne({session : data}, function(error, user){
                    if(error){
                        console.log('unable to find user schema when checking refresh token for spotify');
                        //401 Unauthorized or 403 : Forbidden
                        res.status(401).json({message : 'Unable to add spotify to account!'}); 
                    }

                    //check if user has refresh token (only does if login to spotift before)
                    if(user != null){
                        if(user.havespotify){
                            //we checked cache already, so if we're here, it means we have refresh token but no access token
                            var authOptions = {
                                url: 'https://accounts.spotify.com/api/token',
                                headers: { 'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))},
                                form: {
                                    grant_type: 'refresh_token',
                                    refresh_token: user.refreshtoken
                                },
                                json: true
                            };
                            request.post(authOptions, function(error, response, body) {
                                if (!error && response.statusCode === 200) {
                                    var access_token = body.access_token;
                                    //save to cache & output
                                    redis.setex(sessionId+':spotifyUserAccessToken', 3600, access_token);
                                    res.redirect('http://localhost:3000?' + querystring.stringify({loginSession : sessionId}));
                                } else{
                                    res.redirect('http://localhost:3000/');
                                }
                            });
                        }else{
                            next();
                        }
                    }else{
                        console.log('unable to find user schema when checking refresh token for spotify');
                        res.status(401).json({message : 'Unable to add spotify to account!'}); 
                    }
                });
            } else{
                res.status(204).send({message : 'invalid sessionId'});
            } 
        });
    });
}

/* login to spotify when login to application */
router.get('/loginWithAcc/:id', function(req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    /* we expect a valid login session id, will check in the callback function */
    var id = req.params.id;
    res.cookie(sessionId, id);
    res.cookie('haveAccount', true);

    /* requests authorization from user */
    var scope = 'user-read-private user-read-email playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
    }));
});

/* callback from login or loginWithAcc */
router.get('/callback', function(req, res) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    var storedId = req.cookies ? req.cookies[sessionId] : null;
    var haveAcc = req.cookies ? req.cookies['haveAccount'] : null;

    /* callback from /loginWithAcc */
    var haveLogin;
    if(haveAcc != null){
        haveLogin = true;
        res.clearCookie('haveAccount');
    }

    /* use the authorication_code provided to us in response to obtain the user's access token and refresh token */
    if (state === null || state !== storedState) {
        res.redirect('http://localhost:3000?' + querystring.stringify({error : 'Invalid state on callback'}));
     } else {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
            },
            headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            /* callback from request call */
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                redis.setex(storedId+':spotifyUserAccessToken', 3600, access_token);
                /* save refresh token to user data */
                if(haveLogin){
                    redis.get('UserSession:'+storedId, (err, data)=>{
                        if(err) {
                            console.log('Invalid user session id detected!');
                            res.redirect('http://localhost:3000?' + querystring.stringify({error : 'Invalid login session!'}));
                        }
                        if(data != null){
                            User.findOne({session : data}, function(error, user){
                                if(error){
                                    console.log('unable to find user schema when checking refresh token for spotify');
                                    //401 Unauthorized or 403 : Forbidden
                                    res.redirect('http://localhost:3000?' + querystring.stringify({error : 'Invalid login session!'}));
                                }
                                if(user != null){
                                    user.refreshtoken = refresh_token;
                                    user.save();
                                    res.redirect('http://localhost:3000?' + querystring.stringify({loginSession : storedId}));
                                } else{
                                    res.redirect('http://localhost:3000?' + querystring.stringify({error : 'Invalid login session!'}));
                                }
                            });
                        } else{
                            res.redirect('http://localhost:3000?' + querystring.stringify({error : 'Invalid login session'}));
                        } 
                    });
                }else{
                    res.redirect('http://localhost:3000?' + querystring.stringify({sessionId : storedId}));
                }
            } else {
                res.redirect('http://localhost:3000?' + querystring.stringify({error : 'Invalid response from Spotify!'}));
            }
        });
    }
});

/* log out */
router.get('/logout', function(req, res){
    res.redirect('https://spotify.com/logout');
});

/* complete server to server client credentials with spotify api */
/* request access token if we don't have one in cache */
function checkAndAcquireServerToken(req, res, next){
    /* make sure we have a spotify api token before entering the route */
    redis.get('spotifyServerAccessToken', (err, data) => {
        if(err) throw err;

        if(data != null){
            next();
        }else{
            var options = {
                'url': 'https://accounts.spotify.com/api/token',
                'headers': {
                    'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                form: {
                    'grant_type': 'client_credentials'
                },
                json: true 
            };
        
            request.post(options, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log('***Went through spotify api client credential flow***');
                    
                    //save token in redis cache, access token should be valid for 1 hour for OAuth 2.0
                    redis.setex('spotifyServerAccessToken', 3600, body.access_token);
                    next();
                } else{
                    res.json({error: 'Unable to get access token'});
                    next();
                }
            });
        }
    });
}

/* routes that use server access token  */
router.get('/nr', checkAndAcquireServerToken, function(req, res) { 
    redis.get('spotifyServerAccessToken', (err, data) => {
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/browse/new-releases',
                'headers': {
                  'Authorization': 'Bearer ' + data
                },
                json : true
              };
              request.get(options, function (error, response) {
                if (error) throw new Error(error);
                
                //output the album and author names,
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
              });
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* get featured playlist of spotify */
router.get('/featuredplaylist', checkAndAcquireServerToken, function(req, res){
    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/browse/featured-playlists',
                'headers': {
                    'Authorization': 'Bearer ' + data,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };
            request.get(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
            });
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* show all available genres on spotify */
router.get('/genre', checkAndAcquireServerToken, function(req, res){
    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/recommendations/available-genre-seeds',
                'headers': {
                  'Authorization': 'Bearer ' + data,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              };
              request.get(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
              });
              
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* show all available categories on spotify */
router.get('/categories', checkAndAcquireServerToken, function(req, res){
    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/browse/categories',
                'headers': {
                  'Authorization': 'Bearer ' + data,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              };
              request.get(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
              });
              
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* search for an item */
router.post('/search', checkAndAcquireServerToken, function(req, res){
    /* Types: album , artist, playlist, track, show and episode. */
    var type = req.body.type || null;
    var query = req.body.q || null;

    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/search?q='+query+'&type='+type,
                'headers': {
                  'Authorization': 'Bearer ' + data,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              };
              request.get(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
              });
              
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* find artist then display everything about them */
router.get('/artists/:name', checkAndAcquireServerToken, function(req, res){
    let artist = req.params.name;
    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/search?q='+artist+'&type=artist',
                'headers': {
                  'Authorization': 'Bearer ' + data,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              };
              request.get(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
              });
              
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* find track then display everything about them */
router.get('/tracks/:song', checkAndAcquireServerToken, function(req, res){
    let song = req.params.song;
    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/search?q='+song+'&type=track',
                'headers': {
                  'Authorization': 'Bearer ' + data,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }
              };
              request.get(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
                res.status(200).send(JSON.stringify(response.body));
              });
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* find recommendations based on favorite artists, genre and tracks */
router.get('/recommendation', checkAndAcquireServerToken, function(req, res){
    var artists = req.query.artists || null;
    var genre = req.query.genre || null;
    var tracks = req.query.tracks || null;
    redis.get('spotifyServerAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'method': 'GET',
                'url': 'https://api.spotify.com/v1/recommendations?seed_artists=' +artists +'&seed_genres='+genre+'&seed_tracks=' + tracks,
                'headers': {
                  'Authorization': 'Bearer ' + data
                }
              };
              request(options, function (error, response) {
                if (error) throw new Error(error);
                res.status(200).send(JSON.stringify(response.body));
              });
                
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
});

/* Check if user has access token in redis cache */
/* deny ALL that don't have a mapping on redis */
function checkUserAccessTokenCache(sessionId){
    if (sessionId == null) {
        return;
    }

    redis.get(sessionId+':spotifyUserAccessToken', (err, data)=>{
        if(data != null){
            console.log("Already have spotify user access token");
            return;
        }else{
            redis.get('UserSession:'+sessionId, (err, data)=>{
                if(err) throw err;

                if(data == null) {
                    return;
                }

                //here we have a user login session with no access token, use refresh token if possible
                User.findOne({session : data}, function(error, user){
                    if(error){
                        console.log('unable to find user schema when checking refresh token for spotify');
                        //401 Unauthorized or 403 : Forbidden
                        res.status(403).json({message : 'Unable to add spotify to account!'}); 
                    }

                    //check if user has refresh token (only does if login to spotify before)
                    if(user == null) {
                        return;
                    }

                    if(user.havespotify){
                        //we checked cache already, so if we're here, it means we have refresh token but no access token
                        var authOptions = {
                            url: 'https://accounts.spotify.com/api/token',
                            headers: { 'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))},
                            form: {
                                grant_type: 'refresh_token',
                                refresh_token: user.refreshtoken
                            },
                            json: true
                        };
                        request.post(authOptions, function(error, response, body) {
                            if (!error && response.statusCode === 200) {
                                var access_token = body.access_token;
                                //save to cache & output
                                redis.setex(sessionId+':spotifyUserAccessToken', 3600, access_token);
                                return;
                            } 
                        });
                    }else{
                        return;
                    }
                });
            });
        }
    });
}

// Start a DeeJay session
router.get('/start_deejay/:sessionId', function(req, res) {
    let sessionId = req.params.sessionId;
    checkUserAccessTokenCache(sessionId);
    redis.get(sessionId+':spotifyUserAccessToken', (err, data)=>{
        if(err) {
            throw err;
        }

        if(data == null) {
            console.log('[+] Error, no spotify access token for sessionId: ' + sessionId);
            res.status(204).json({error : 'Server Error!'});
            return;
        }

        // create deejay code and save spotify access token to code
        const deejay_code = generateRandomString(5);
        redis.setex('deejay:'+deejay_code, 3600, data);
        res.status(200).json({code : deejay_code}); 
        console.log("Starting DeeJay session for [ " + sessionId + "] with DeeJay Code [" + deejay_code + "]");
    });
});

// Join a DeeJay session
router.post('/join_deejay', function(req, res) {
    var sessionId = req.body.sessionId || null;
    let deejay_code = req.body.deejay_code || null;

    if (sessionId == null) {
        console.log("Invalid sessionId [" + sessionId + "] received in checkUserSessionid");
        return;
    }

    if (deejay_code == null) {
        console.log("Invalid deejay_code [" + deejay_code + "] received in join_deejay");
        next();
        return;
    }

    redis.get('UserSession:'+sessionId, (err, data)=>{
        if(err) throw err;

        if(data == null) {
            console.log("sessionId [" + sessionId + "] not found in checkUserSessionid");
            return;
        }
    });

    redis.get("deejay:" + deejay_code, (err, data)=>{
        if(err) {
            throw err;
        }

        if(data == null) {
            console.log('[+] Error, no deejay_code found: ' + deejay_code);
            res.status(204).json({error : 'Server Error!'});
            return;
        }

        res.status(200).json({message : 'successfully joined session'}); 
    });
});

// Request a song from DeeJay session
router.post('/req_track_deejay', checkUserRefreshToken, function(req, res) {
    var sessionId = req.body.sessionId || null;
    var deejay_code = req.body.deejay_code || null;
    var track_id = req.body.track_id || null; 

    if (sessionId == null) {
        console.log("Invalid sessionId [" + sessionId + "] received in checkUserSessionid");
        next();
        return;
    }

    if (deejay_code == null) {
        console.log("Invalid deejay_code [" + deejay_code + "] received in req_track_deejay");
        next();
        return;
    }

    if (track_id == null) {
        console.log("Invalid track_id [" + track_id + "] received in req_track_deejay");
        next();
        return;
    }

    redis.get('UserSession:'+sessionId, (err, data)=>{
        if(err) throw err;

        if(data == null) {
            console.log("sessionId [" + sessionId + "] not found in checkUserSessionid");
            return;
        }
    });

    redis.get("deejay:" + deejay_code, (err, data)=>{
        if(err) {
            throw err;
        }

        if(data == null) {
            console.log('[+] Error, no deejay_code found: ' + deejay_code);
            res.status(204).json({error : 'Server Error!'});
            return;
        }

        console.log("LOL:" + data);
        var options = {
            'url': 'https://api.spotify.com/v1/me/player/queue?uri=spotify:track:' + track_id,
            'headers': {
                'Authorization': 'Bearer ' + data,
            },
        };
        request.post(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log("Successfully added song track id: [" + track_id + "] to queu");
            } 
        });
    });
});

router.post('/additems', function(req, res) {
    var pid = req.body.playlistID || null;
    var uris = req.body.uris || null;
    var sessionId = req.cookies ? req.cookies['sessionId'] : null;

    console.log(pid);

    redis.get(sessionId+':spotifyUserAccessToken', (err, data)=>{
        if(err) throw err;

        if(data != null){
            var options = {
                'url': 'https://api.spotify.com/v1/playlists/' + pid + '/tracks?uris=' + uris,
                'headers': {
                    'Authorization': 'Bearer ' + data,
                    'Content-Type': 'application/json'
                },
                json: true 
            };
        
            request.post(options, function (error, response, body) {
                if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
                    console.log(response.body);
                    
                    res.send(response.body);
                } else{
                    res.send(response.body);
                }
            });
                
        }else{
            console.log('Error, no token');
            res.status(204).json({error : 'Server Error!'});
        }
    });
    
});

module.exports = router;
