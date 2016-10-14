var express = require('express');
var app = express();
var server = app.listen(5000);

var io = require('socket.io').listen(server);
exports.io = io;
var FeedParser = require('feedparser');
exports.FeedParser = FeedParser;
var http = require('http');
exports.http = http;

// Local libraries
var youtube = require('./youtube');
exports.youtube = youtube;
var billboard = require('./billboard');

var Twitter = require('twitter');
var T = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

// Starting with no requests and an empty default list
var requested_hash = {};
var default_list = [];

billboard.top100( function(song) {
  song.source = "billboard";
  default_list.push(song);
  console.log("Adding to default playlist ", song);
});

console.log('app started on port ' + server.address().port);

//Configuration
app.use(express.json()); // support json for groupme
app.use(express.urlencoded());
app.use(express.logger());
app.use(express.static(__dirname + '/public'));

app.set("view options", {layout: false});

var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket){

  console.log("BROWSER FOUND");

  socket.on('USE', function(room) {
    console.log(room);
    socket.join(room);
    socket.room = room;
  });

  socket.on('disconnect', function () {
    console.log("BROWSER LEFT");
  });

  socket.on('next_song', function () {
    var room = socket.room;
    current_song = requested_hash[room].shift();
    requested_hash[room].push(current_song);
    sendLoadPlaylist(room);
  });

  socket.on('stop_song', function () {
    io.sockets.in(socket.room).emit('stop_song');
  });

  socket.on('play_song', function () {
    io.sockets.in(socket.room).emit('play_song');
  });

  socket.on('song_request', function(data) {
    var room = socket.room;
    youtube.search(data.q, function (song) {
      song.source = "local";

      // Place the song in the highest possible non-requested position
      for (var i = 1; i < requested_hash[room].length; i++) {
        if (requested_hash[room][i].source == "billboard") {
            requested_hash[room].splice(i, 0, song);
            console.log(requested_hash[room]);
            break;
        }
      }
      sendLoadPlaylist(room);
    });
  });

  socket.on('update_playlist', function(data) {
    var room = socket.room;
    if (requested_hash[room].length > 0) {
      requested_hash[room] = data.playlist;
      sendLoadPlaylist(room);
    }
  });

});

function sendLoadPlaylist(room) {
  if (requested_hash[room].length > 0)
  io.sockets.in(room).emit('load_playlist', requested_hash[room]);
}

app.get('/', function(req, res) {
  res.sendfile(__dirname + "/views/index.html");
});

app.post('/start', function(req, res) {
  res.redirect("/" + req.param('twitter'));
});

app.get('/:handle', function (req, res) {
  var handle = req.params.handle;
  var room = "/" + handle;

  // Determine if we need to populate the room from scratch or not
  if ( !requested_hash[room] || requested_hash[room].length < 1) {
    console.log("CREATING NEW ROOM: ", room);
    requested_hash[room] = default_list.slice(0,5);
  }

  // Start listening for tweets to the requested handle
  console.log("stream");
  //  var stream = T.stream('user', { track: 'handle' });
  T.stream('user', {track: 'handle'}, function(stream) {
    stream.on('data', function(tweet) {
    console.log("tweet receieved")
    if (tweet.entities.user_mentions.length > 0) {
      var removeName = RegExp("@"+handle, 'gi');
      var songName = tweet.text.replace(removeName, "");
      console.log("Twitter Song Request " + songName);
      youtube.search(songName, function (song) {
        song.source = "twitter";
        requested_hash[room].push(song);
        sendLoadPlaylist(room);
      });
    }
  });

    stream.on('error', function(error) {
      console.log(error);
    });

     stream.on('disconnected', function(disconnectMessage) {
    console.log("TWITTER STREAM DISCONNTED:", disconnectMessage);
    });

  stream.on('connected', function(disconnectMessage) {
    console.log("TWITTER STREAM CONNECTED:", disconnectMessage);
    });

  stream.on('connect', function(disconnectMessage) {
    console.log("TWITTER STREAM ATTEMPTED CONNECTION:", disconnectMessage );
    });
  });

 

  res.sendfile(__dirname + '/views/player.html');
});
