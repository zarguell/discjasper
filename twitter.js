var Twit = require('twit');
var io = require('./app').io;
var config = require('./config')
var isFirstConnectionToTwitter = true;
var FeedParser = require('feedparser');
var http = require('http');

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
      var songName = tweet.text.replace(/@frisbeehouse/i, "").replace(" ", "+");
      http.get('http://gdata.youtube.com/feeds/api/videos?q=' + songName  + '&max-results=1&v=2', function (res) {
        res.pipe(new FeedParser({}))
        .on('readable', function(){
          var stream = this, item;
          while (item = stream.read()){
            var msg = item.guid.substr(item.guid.lastIndexOf(":") + 1);
            console.log(msg);
            socket.emit("pong", {txt: msg });
          }
        })
      });

    } else {

    }
  });

  socket.emit("pong",{txt:"Connected to server"});

  socket.on('ping', function (data) {
    console.log(data.txt);
  });

});
