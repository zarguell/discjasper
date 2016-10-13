var express = require('express');
var app = express();
var server = app.listen(5000);

var io = require('socket.io').listen(server);
exports.io = io;

// Local libraries
var youtube = require('./youtube');
exports.youtube = youtube;

var billboard = require('./billboard');

// Starting with no requests and an empty default list
var requested_list = [];
var default_list = [];

billboard.top100( function(song) {
  song.source = "billboard";
  default_list.push(song);
  console.log("Adding to default playlist ", song);
});

console.log('app started on port ' + server.address().port);

//Configuration
app.use(express.json());
app.use(express.urlencoded());
app.use(express.logger());
app.use(express.static(__dirname + '/public'));

app.set("view options", {layout: false});

var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket){

  console.log("BROWSER FOUND");
  sendLoadPlaylist()

  socket.on('disconnect', function () {
    console.log("BROWSER LEFT");
  });

  socket.on('next_song', function () {
    current_song = requested_list.shift();
    requested_list.push(current_song);
    sendLoadPlaylist();
  });

  socket.on('stop_song', function () {
    io.emit('stop_song');
  });

  socket.on('play_song', function () {
    io.emit('play_song');
  });

  socket.on('song_request', function(data) {
    youtube.search(data.q, function (song) {
      song.source = "local";

      // Place the song in the highest possible non-requested position
      for (var i = 1; i < requested_list.length; i++) {
        if (requested_list[i].source == "billboard") {
            requested_list.splice(i, 0, song);
            console.log(requested_list);
            break;
        }
      }
      sendLoadPlaylist();
    });
  });

  socket.on('update_playlist', function(data) {
    if (requested_list.length > 0) {
      requested_list = data.playlist;
      sendLoadPlaylist();
    }
  });

});

function sendLoadPlaylist() {
  if (requested_list.length > 0)
    io.emit('load_playlist', requested_list);
}

app.get('/admin', function(req, res) {
  res.sendfile(__dirname + "/views/admin.html");
});

app.get('/', function(req, res) {
  res.sendfile(__dirname + "/views/passive.html");
});

app.get('/player', function (req, res) {
  requested_list = default_list
  res.sendfile(__dirname + '/views/player.html');
});
