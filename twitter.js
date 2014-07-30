var Twit = require('twit');
var io = require('./app').io;
var config = require('./config')
var isFirstConnectionToTwitter = true;

var T = new Twit({
    consumer_key: config.twitter_api_key,
    consumer_secret: config.twitter_api_secret,
    access_token: config.twitter_access_token,        
    access_token_secret: config.twitter_access_token_secret 
});

var stream = T.stream('user', {track: config.twitter_account });
stream.start();

io.sockets.on('connection', function (socket) {
  console.log("connnecting to comp, starting stream");

  socket.on('disconnect', function (socket) {
    console.log("disconnect");
  });

  stream.on('tweet', function(tweet) {
    if (tweet.entities.user_mentions.length > 0) {
      console.log(tweet.text);
      var songName = tweet.text.replace(/@frisbeehouse/i, "");
      socket.emit("pong", {txt: songName});
    } else {

    }
  });

  socket.emit("pong",{txt:"Connected to server"});

  socket.on('ping', function (data) {
    console.log(data.txt);
  });

});
