var _twitter = require('twitter');
var express = require('express');
var app = express();
const axios = require('axios');
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use('/', express.static(__dirname + '/public'));

var twitter = new _twitter({
	consumer_key: 'CXVNsTDohsJaIxl0cjpuLKXYr',
  	consumer_secret: 'Y49dNi2NPN9vJaPS95QnRLslOqisEuC7v934lHOfN05cVjbtDB',
  	access_token_key: '2834545563-QYQqm8hnLPiU3eFyAD8SGtKhfIYW7gMp8fGh8Xd',
  	access_token_secret: 'SUquQt3XC2ve3IIa8JbwMa4bsRCpZSJuCVKYAXLUTDBBT'
});

var currentstream = 0;

io.on('connection', function (socket) {
	socket.emit('init');
	var socket = socket;
  socket.on('get-locations', function() {
    axios.get('https://ipapi.co/json')
    .then(function (response) {
      var city = response.data.city;
      axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${city}&sensor=true&key=AIzaSyBjvIh3B5v69o-4YwgeTO38aaooW8GxTXY`)
      .then(function (response) {
        var viewport = response.data.results[0].geometry.viewport;
				var currentLocation = [
					viewport.southwest.lng.toString(),
					viewport.southwest.lat.toString(),
					viewport.northeast.lng.toString(),
					viewport.northeast.lat.toString()
				]
				socket.emit('got-location', currentLocation.join(","));
      })
      .catch(function (error) {
        console.log(error);
      });
    })
    .catch(function (error) {
      console.log(error);
    });
  })
	socket.on('find-tweets', function(currentLocation) {
		twitter.stream('statuses/filter', {locations: currentLocation}, function(stream) {
			if (currentstream)
				currentstream.destroy()
			stream.on('data', function(tweet) {
				if (hasNowPlayingHashtag(tweet.text)) {
					tweet.entities.urls.forEach(function(url) {
						if (hasYoutubeVideo(url.expanded_url)) {
							console.log(url);
							socket.emit('tweet', tweet);
						}
					});
				}
			});
			stream.on('error', function(error) {
				console.log(error);
			});
			currentstream = stream;
		});
	});
});

function hasYoutubeVideo(expanded_url) {
	return url.expanded_url.toLowerCase().indexOf('youtube.com/watch') > -1;
}

function hasNowPlayingHashtag(tweetText) {
	return tweetText.toLowerCase().indexOf('#nowplaying') > -1;
}

server.listen(3000,function(){
  console.log('Node server running at port 3000');
});
