const redis = require('redis');
const client = redis.createClient();

client.on("error", function(error) {
    console.error(error);
});

client.on('connect', function (err, res) {
    console.log(err || "Connected to database redis! @ 6379");
});

module.exports = client;
