var express = require('express');
var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
exports.io = io;

console.log('app started on port ' + server.address().port);

//Configuration
app.use(express.json());
app.use(express.urlencoded());
app.use(express.logger());
app.use(express.static(__dirname + '/public'));

app.set("view options", {layout: false});

app.get('/', function(req, res) {
  res.render('index.html');
});

app.all('*', function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});

var twitter = require('./twitter');

