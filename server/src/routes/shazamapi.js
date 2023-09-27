const express = require('express');
const router = express.Router();
const request = require('request'); // "Request" library

router.get('/testing', function(req, res){
    const options = {
        url: 'https://shazam.p.rapidapi.com/search',
        qs: {term: 'kiss the rain', locale: 'en-US', offset: '0', limit: '5'},
        headers: {
            'x-rapidapi-key': '411d22a9d4msh8259e04f17cc17ap1ea7a7jsn041f90d16cd0',
            'x-rapidapi-host': 'shazam.p.rapidapi.com',
            useQueryString: true
        }
      };
      
      request.get(options, function (error, response, body) {
          if (error) throw new Error(error);
          let result = JSON.parse(body);
          res.status(200).json(result.tracks.hits);
      });
});

module.exports = router;