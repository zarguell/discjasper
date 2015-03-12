var http = require('./app').http;
var FeedParser = require('./app').FeedParser;

exports.search = function(songName, dataFun) {
  songName = songName.split(" ").join("+");
  http.get('http://gdata.youtube.com/feeds/api/videos?q=' + songName  + '&max-results=1&v=2', function (res) {
    res.pipe(new FeedParser({})).on('readable', function(){
      var stream = this, item;
      while (item = stream.read()){
        var vID = item.guid.substr(item.guid.lastIndexOf(":") + 1);
        var vTime = item['media:group']['yt:duration']['@'].seconds;
        var vTitle = item['media:group']['media:title']['#'];
        var val = ({id: vID, time: vTime, title:vTitle});
        dataFun(val);
      }
    });
  });
}
