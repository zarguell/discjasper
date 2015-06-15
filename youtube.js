var http = require('./app').http;
var youtube = require("youtube-api"); 

youtube.authenticate({
    type: "key"
  , key: "AIzaSyAG6jogG2fdEECyDblxs0hMrdUDbGy0Xp4"
});

exports.search = function(songName, room, dataFun) {
  songName = songName.split(" ").join("+");
  youtube.search.list({
      "part": "id, snippet",
      "maxResults": 1,
      "q": songName 
  }, function (err, data) {
      if (!err && data["items"].length > 0)
        dataFun(room, {id: data["items"][0]["id"]["videoId"], title: data["items"][0]["snippet"]["title"]});
  });
}
