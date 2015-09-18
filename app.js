var express = require('express');
var app = express();
var server = app.listen(5000);

var config = require('./config');
exports.config = config;
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

var Twit = require('twit');
var T = new Twit({
    consumer_key: config.twitter_api_key,
    consumer_secret: config.twitter_api_secret,
    access_token: config.twitter_access_token,
    access_token_secret: config.twitter_access_token_secret
});

// Starting with no requests and an empty default list
var current_song;
var requested_hash = {};
var default_list = [];

billboard.top100(function (r,b) {
  default_list.push(b);
  console.log("adding", b);
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
  console.log("has connection");
  socket.on('USE', function(twitter) {
    console.log(twitter);
    socket.join(twitter);
    socket.room = twitter;
  });

  socket.on('disconnect', function () {
    console.log("a client left");
  });

  socket.on('next_song', function () {
    sendPlayNext(socket.room);
  });

  socket.on('stop_song', function () {
    sendStopSong(socket.room);
  });

  socket.on('play_song', function () {
    sendPlaySong(socket.room);
  });

  socket.on('load_playlist', function(data) {
    sendLoadPlaylist(socket.room);
  });

  socket.on('current_song', function(data) {
    io.sockets.in(socket.room).emit('current_song', current_song);
  });

  socket.on('add_song_to_end', function(data) {
    youtube.search(data.q, data.room, function (room, r) {
      requested_hash[room].push(r);
      sendLoadPlaylist(socket.room);
    });
  });

  socket.on('update_playlist', function(data) {
    if (requested_hash[data.room].length > 0) {
      requested_hash[data.room]= data.playlist;
    } else {
      default_list = data.playlist;
    }
    sendLoadPlaylist(data.room);
  });

});

app.get('/', function(req, res) {
  res.sendfile(__dirname + "/views/index.html");
});

app.post('/start', function(req, res) {
  res.redirect("/" + req.param('twitter'));
});

app.get('/:handle', function (req, res) {
  var handle = req.params.handle;

  // Initializes and starts twitter stream
  requested_hash["/" + handle] = [];
  var stream = T.stream('user', {track: handle });
  stream.on('tweet', function(tweet) {
    if (tweet.entities.user_mentions.length > 0) {
      console.log(tweet.text);
      var removeName = RegExp("@"+handle, 'gi');
      var songName = tweet.text.replace(removeName, "");
      console.log("Twitter Song Request " + songName);
      youtube.search(songName, "/" + handle, addToRequestedList);
    } else {

    }
  });
  res.sendfile(__dirname + '/views/player.html');
});

function sendPlayNext(room) {
  console.log(room, "requesting new song")
  console.log(requested_hash)
  if (requested_hash[room].length > 0) {
    sendRequested(room);
  } else {
    sendDefault(room);
  }
  sendLoadPlaylist(room);
}

function sendLoadPlaylist(room) {
  io.sockets.in(room).emit('load_playlist', activePlaylist(room));
}

function sendDefault(room) {
  current_song = default_list.shift();
  io.sockets.in(room).emit('next_song', current_song);
  console.log(current_song);
  default_list.push(current_song);
}

function sendRequested(room) {
  current_song = requested_hash[room].shift();
  io.sockets.in(room).emit('next_song', current_song);
  default_list.push(current_song);
}

function sendStopSong(room) {
  io.sockets.in(room).emit('stop_song');
}

function sendPlaySong(room) {
  io.sockets.in(room).emit('play_song');
}

function activePlaylist(room) {
  if (requested_hash[room].length > 0) {
    return requested_hash[room];
  } else {
    return default_list;
  }
}

function addToRequestedList(room, r) {
  requested_hash[room].push(r);
  sendLoadPlaylist(room);
}
exports.addToRequestedList = addToRequestedList;
