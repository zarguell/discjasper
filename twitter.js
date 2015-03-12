var Twit = require('twit');
var io = require('./app').io;
var config = require('./app').config;
var youtube = require('./app').youtube;
var app = require('./app');

//Connection to twitter
var T = new Twit({
    consumer_key: config.twitter_api_key,
    consumer_secret: config.twitter_api_secret,
    access_token: config.twitter_access_token,        
    access_token_secret: config.twitter_access_token_secret 
});

// Initializes and starts twitter stream
var stream = T.stream('user', {track: config.twitter_account });

stream.on('tweet', function(tweet) {
  if (tweet.entities.user_mentions.length > 0) {
    console.log(tweet.text);
    var removeName = RegExp("@"+config.twitter_account, 'gi');
    var songName = tweet.text.replace(removeName, "");
    console.log("Twitter Song Request " + songName);
    youtube.search(songName, app.addToRequestedList);
  } else {

  }
});
