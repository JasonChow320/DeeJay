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
        SPOTIFY_CLIENTID : '5424d2905c1249b7af5d4d24a3dee826',
        SPOTIFY_SECRETID : 'Ydd7b9f6d8b724898bdd122e4a0e8f26b',
        callback : 'http://localhost:3001/spotifyapi/callback/'
    },
    crypto : {
        salt : '!@#$%^&&*()QWERTYASDFZXCV',
        admin : 'th3r00t'
    }
};

module.exports = config;
