var http = require('./app').http;
var FeedParser = require('./app').FeedParser;
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
        youtube.search(songName, "/frisbeehouse", handler)
      }
    });
  });
}

