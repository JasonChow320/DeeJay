const config = {
    app: {
      port: 3001
    },
    db: {
      host: 'localhost',
      port: 27017,
      name: 'DEV'
    },
    spotify : {
        SPOTIFY_CLIENTID : 'YOUR_CLIENTID_HERE',
        SPOTIFY_SECRETID : 'YOUR_SECRETID_HERE',
        callback : 'http://localhost:3001/spotifyapi/callback/'
    },
    crypto : {
        salt : '!@#$%^&&*()QWERTYASDFZXCV',
        admin : 'th3r00t'
    }
};

module.exports = config;
