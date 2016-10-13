var http = require('http');
var FeedParser = require('feedparser');
var youtube = require('./app').youtube;

// PRIMARY DATA SOURCES
exports.top100 = function(handler) {
  http.get('http://www.billboard.com/rss/charts/hot-100', function (res) {
    default_list = [];
    res.pipe(new FeedParser({}))
    .on('readable', function() {
      var stream = this, item;
      while (item = stream.read()){
        var songName = item["rss:chart_item_title"]["#"] + " " + item["rss:artist"]["#"];
        youtube.search(songName, handler);
      }
    });
  });
};
