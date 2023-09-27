const express = require('express');
const router = express.Router();

const config = require('../config/config');
const User = require('../models/user');

// retrieve user data
router.get('/users/:id', (req, res, next) => {
    var _id = req.params.id;
    if(_id == config.crypto.admin) {
        User.find(function(err, users) {
            res.status(200).json(users);
        });
    } else {
        console.log('ID [' + _id + '] TRIED TO REQUEST USER DATA!!!');
        next(); //gives back 404 response
    }
});

// add user data
router.post('/user', (req, res, next)=>{
    let newUser = new User({
        username: req.body.username,
        password: req.body.password,
        spotify:{
            havespotify: false,
        }
    });

    newUser.save((err, user)=>{
        if(err) {
            res.status(200).json({msg: 'Failed to add user', error : err});
        } else {
            res.status(200).json({msg: 'User added successfully'});
        }
    });
});

//delete contacts
router.delete('/users/:id', (req, res, next)=> {
    User.deleteOne({_id: req.params.id}, function(err, result){
        if(err) {
            res.status(200).json(err);
        } else {
            res.status(200).json(result);
        }
    });
});

module.exports = router;
