var http = require('./app').http;
var request = require("request");

exports.search = function(songName, dataFun) {
  songName = songName.split(" ").join("+");
  request("https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + songName + "&type=video&key=AIzaSyC7RtiPFhHG00A-MPTpL71G6cNy4D5TRfQ", function(error, response, body) {
    var data = JSON.parse(body);
    dataFun({id: data["items"][0]["id"]["videoId"],  title: data["items"][0]["snippet"]["title"]});
  });
}
