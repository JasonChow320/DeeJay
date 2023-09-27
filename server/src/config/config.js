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
        SPOTIFY_CLIENTID : 'b3098bd2d517442995f3dbdaea624113',
        SPOTIFY_SECRETID : '765cfcc072624a928dae2992492f18cd',
        callback : 'http://localhost:3001/spotifyapi/callback/'
    },
    crypto : {
        salt : '!@#$%^&&*()QWERTYASDFZXCV',
        admin : 'th3r00t'
    }
};

module.exports = config;