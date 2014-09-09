var Twit = require('twit');
var io = require('./app').io;
var config = require('./config')
var isFirstConnectionToTwitter = true;
var FeedParser = require('feedparser');
var http = require('http');

// Starting with no requests and bunny default, over
var requested_list = [];
var default_list = [{id: "GVFWai1jVfs", time: "43"}, {id: "TbWKGO73Kds", time: "49"}];

//Connection to twitter
var T = new Twit({
    consumer_key: config.twitter_api_key,
    consumer_secret: config.twitter_api_secret,
    access_token: config.twitter_access_token,        
    access_token_secret: config.twitter_access_token_secret 
});
// Initializes and starts twitter stream
var stream = T.stream('user', {track: config.twitter_account });

//Connection to the browser
io.sockets.on('connection', function (socket) {

  //Download billboard top 100 as default
  http.get('http://www.billboard.com/rss/charts/hot-100', function (res) {
    default_list = [];
    res.pipe(new FeedParser({}))
    .on('readable', function() {
      var stream = this, item;
      while (item = stream.read()){
        var songName = item["rss:chart_item_title"]["#"] + " " + item["rss:artist"]["#"];
        ytSearch(songName, function (r) {
          default_list.push(r);
          console.log(r);
        });
      }
    });
  });

  playNext();

  socket.on('disconnect', function (socket) {
    console.log("disconnect");
    stream.stop();
  });

  stream.on('tweet', function(tweet) {
    if (tweet.entities.user_mentions.length > 0) {
      console.log(tweet.text);
      var songName = tweet.text.replace(/@frisbeehouse/i, "");
      ytSearch(songName, function (r) {
        requested_list.push(r);
      });
    } else {

    }
  });

  socket.on('next_song', function (data) {
    playNext();
  });
  
  function playNext() {
    if (requested_list.length > 0) {
      sendRequested();
    } else {
      sendDefault();
    }
  }

  function sendDefault() {
    var playNow = default_list.shift();
    socket.emit('next_song', playNow);
    default_list.push(playNow);
  }

  function sendRequested() {
    socket.emit('next_song', requested_list.shift());
  }

});

function ytSearch(songName, dataFun) {
  songName = songName.split(" ").join("+");
  http.get('http://gdata.youtube.com/feeds/api/videos?q=' + songName  + '&max-results=1&v=2', function (res) {
    res.pipe(new FeedParser({})).on('readable', function(){
      var stream = this, item;
      while (item = stream.read()){
        var vID = item.guid.substr(item.guid.lastIndexOf(":") + 1);
        var vTime = item['media:group']['yt:duration']['@'].seconds;
        var val = ({id: vID, time: vTime});
        dataFun(val);
      }
    });
  });
}
