var express = require('express');
var app = express();
var server = app.listen(5000);

var config = require('./config')
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

var twitter = require('./twitter');
exports.twitter = twitter;


// Starting with no requests and bunny default, over
var current_song;
var requested_list = [];
var default_list = [{id: "GVFWai1jVfs", time: "43", title: "30 Second Bunnies: Terminator"}];
var player = false;

billboard.top100(function (r) {
  default_list.push(r);
  sendLoadPlaylist();
});

console.log('app started on port ' + server.address().port);

//Configuration
app.use(express.json()); // support json for groupme
app.use(express.urlencoded());
app.use(express.logger());
app.use(express.static(__dirname + '/public'));

app.set("view options", {layout: false});

app.get('/', function(req, res) {
  res.sendfile(__dirname + '/views/viewPlaylist.html');
});

app.get('/player', function(req, res) {
  // if we already have a player do not load another
  if (player)
    res.sendfile(__dirname + '/views/viewPlaylist.html');
  else
    res.sendfile(__dirname + '/views/player.html');
})

app.get('/clone', function(req, res) {
  res.sendfile(__dirname + '/views/clone.html');
});

app.get('/admin', function(req, res) {
  res.sendfile(__dirname + '/views/controlPlaylist.html');
});

app.post('/groupme', function(req, res) {
  youtube.search(req.body.text, function (r) {
      requested_list.push(r);
      sendLoadPlaylist();
  });
  res.send(req.body.text);
});

app.all('*', function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});


//Connection to the browser
io.sockets.on('connection', function (socket) {
  console.log("a client connected")

  // Send the player check
  socket.emit("player_marco",{});
  socket.on("player_polo", function(data) {
    console.log("we have a player");
    player = true; 
  });

  socket.on('disconnect', function (socket) {
    console.log("a client left");
    // Expect that the player was closed and only
    // admit that we have a player if we here a polo
    player = false;

    // Send out the call to all open sockets checking
    // for a player
    io.sockets.emit("player_marco",{});
  });

  socket.on('next_song', function (data) {
    sendPlayNext();
  });

  socket.on('stop_song', function (data) {
    sendStopSong(data);
  });

  socket.on('play_song', function (data) {
    sendPlaySong(data);
  });

  socket.on('load_playlist', function(data) {
    sendLoadPlaylist();
  });

  socket.on('current_song', function(data) {
    socket.emit('current_song', current_song);
  });

  socket.on('add_song_to_start', function(data) {
    youtube.search(data.q, function (r) {
      requested_list.unshift(r);
      sendLoadPlaylist();
    });
  });

  socket.on('add_song_to_end', function(data) {
    youtube.search(data.q, function (r) {
      requested_list.push(r);
      sendLoadPlaylist();
    });
  });

  socket.on('update_playlist', function(data) {
    if (requested_list.length > 0) {
      requested_list = data; 
    } else {
      default_list = data; 
    }
    sendLoadPlaylist();
  });

});

function sendPlayNext() {
  if (requested_list.length > 0) {
    sendRequested();
  } else {
    sendDefault();
  }
  sendLoadPlaylist();
}


function sendLoadPlaylist() {
  io.sockets.emit('load_playlist', activePlaylist());    
}

function sendDefault() {
  current_song = default_list.shift();
  io.sockets.emit('next_song', current_song);
  default_list.push(current_song);
}

function sendRequested() {
  current_song = requested_list.shift();
  io.sockets.emit('next_song', current_song);
}

function sendStopSong(data) {
  io.sockets.emit('stop_song', data);
}

function sendPlaySong(data) {
  io.sockets.emit('play_song', data);
}

function activePlaylist() {
  if (requested_list.length > 0) {
    return requested_list;
  } else {
    return default_list;
  }
}

function addToRequestedList(r) {
  requested_list.push(r);
  sendLoadPlaylist();
}
exports.addToRequestedList = addToRequestedList;
