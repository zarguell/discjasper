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

// Starting with no requests and bunny default, over
var current_song;
var requested_hash = {};
var default_list = [{id: "GVFWai1jVfs", title: "30 Second Bunnies: Terminator"}];
var player = false;

billboard.top100(function (r,b) {
  default_list.push(b);
  console.log("adding", b);
  //sendLoadPlaylist();
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
    io.sockets.in(twitter).emit('player_marco',{});
  });

  socket.on("player_polo", function(data) {
    console.log("we have a player");
    player = true;
  });

  socket.on('disconnect', function () {
    console.log("a client left");
    // Expect that the player was closed and only
    // admit that we have a player if we here a polo
    player = false;

    // Send out the call to all open sockets checking
    // for a player
    io.sockets.in(socket.room).emit("player_marco",{});
  });

  socket.on('next_song', function (data) {
    sendPlayNext(socket.room);
  });

  socket.on('stop_song', function (data) {
    sendStopSong(socket.room, data);
  });

  socket.on('play_song', function (data) {
    sendPlaySong(socket.room, data);
  });

  socket.on('load_playlist', function(data) {
    sendLoadPlaylist(socket.room);
  });

  socket.on('current_song', function(data) {
    io.sockets.in(socket.room).emit('current_song', current_song);
  });

  socket.on('add_song_to_start', function(data) {
    youtube.search(data.q, function (r) {
      requested_hash[room].unshift(r);
      sendLoadPlaylist(socket.room);
    });
  });

  socket.on('add_song_to_end', function(data) {
    youtube.search(data.q, function (r) {
      requested_hash[room].push(r);
      sendLoadPlaylist(socket.room);
    });
  });

  socket.on('update_playlist', function(data) {
    if (requested_hash[room].length > 0) {
      requested_hash[room]= data;
    } else {
      default_list = data;
    }
    sendLoadPlaylist(socket.room);
  });

});

app.get('/', function(req, res) {
  res.sendfile(__dirname + "/views/index.html");
});

app.post('/start', function(req, res) {
  res.redirect("/" + req.param('twitter'))
});

app.get('/:handle', function (req, res) {
  var handle = req.params.handle;

  if (player) {
    res.sendfile(__dirname + '/views/viewPlaylist.html');
  } else {

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
  }
});

app.all('*', function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});


//Connection to the browser

function sendPlayNext(room) {
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

function sendStopSong(room, data) {
  io.sockets.in(room).emit('stop_song', data);
}

function sendPlaySong(room, data) {
  io.sockets.in(room).emit('play_song', data);
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
