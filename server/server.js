var db = require('../db/config');
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var Promise = require('bluebird');
var passport = require("passport");
var morgan = require('morgan');
var utils = require('./utils');

require('../db/models/user');
require("../db/models/trip");
require("../db/models/photo");

require('../db/collections/users');
require("../db/collections/trips");
require("../db/collections/photos");

var app = express();
var server = http.Server(app);

app.use(morgan('dev'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Required for Passport Sessions
var session = require("express-session");
app.use(session({
  key: 'our project',
  secret: 'Frowning Dolphins',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(__dirname + '/../client'));

require("./passport.js")(passport)
//Initialize Passport & Sessions

app.use(passport.initialize());
app.use(passport.session());

//Checks if a User is logged in and if so sends client their profile Object
app.get('/api/auth', function (req, res){
  if(req.user){
    res.json(req.user.toJSON());
  }
});

//Direct to Instagram Login to Authenticate
app.get('/auth/instagram',
  passport.authenticate('instagram'));

//Redirect Back to Index upon Authentication
app.get('/auth/instagram/callback', function (req, res, next) {
  passport.authenticate('instagram',
  function(err, user, info) {
      if (err) { return next(err); }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        console.log('Has the req been logged in??', req.user);
        res.redirect( '/' );
      });
    })(req, res, next);
});

//Destroys current Session
app.get('/api/logout', function(req, res){
  req.session.destroy();
  req.logout();
  res.send('200');
});

//Fetches Trips by Id from Postgres DB
app.get('/api/trip/:id', function(req, res){
  var tripId = req.params.id;
  console.log("this is the id: ", tripId);
  db.model('Trip').fetchById(tripId).then(function(trip){
    console.log(trip);
    res.json(trip.toJSON());
  });
});

//Fetches all Trips from Postgres DB
app.get('/api/trips', function (req, res, next){
  db.collection('Trips')
  .fetchAll()
  .then( function(data) {
    res.json({ data: data.toJSON() }); // need to strip insta ID
  });
});

//Adds Users hashtagged trip to DB & calls Instagram API for the User's photos with same hashtag
//Instagram API Fetcher in utils.js
app.post('/api/trips', function (req, res) {
  if(!req.user) {
    res.redirect('/');
  } else {
    var tripName = req.body.trip.name;
    utils.postTrips(req, res, tripName);
  }
});

app.listen(process.env.PORT || 8000);
console.log("Listening on port 8000...")
