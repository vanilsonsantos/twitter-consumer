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
var currentCoordinates = {};

io.on('connection', function (socket) {
	socket.emit('init');
	var socket = socket;
  socket.on('get-locations', function() {
    axios.get('https://ipapi.co/json')
    .then(function (response) {
      var city = response.data.city;
			currentCoordinates = {latitude: response.data.latitude, longitude:response.data.longitude};
      axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${city}&sensor=true&key=AIzaSyBjvIh3B5v69o-4YwgeTO38aaooW8GxTXY`)
      .then(function (response) {
        var viewport = response.data.results[0].geometry.viewport;
				var currentLocation = [
					viewport.southwest.lng.toString(),
					viewport.southwest.lat.toString(),
					viewport.northeast.lng.toString(),
					viewport.northeast.lat.toString()
				]
				console.log(currentLocation.join(","));
				socket.emit('got-location', currentLocation.join(","), currentCoordinates);
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
		twitter.stream('statuses/filter', {locations:currentLocation}, function(stream) {
			if (currentstream)
				currentstream.destroy()
			stream.on('data', function(tweet) {
				if (hasNowPlayingHashtag(tweet.text)) {
					tweet.entities.urls.forEach(function(url) {
						if (isYoutubeUrlValid(url.expanded_url)) {
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
	socket.on('send-tweet', function(youtube_link, text) {
		console.log(currentCoordinates)
		twitter.post('statuses/update', {
								status : text + ' ' + youtube_link,
								lat: currentCoordinates.latitude,
								long: currentCoordinates.longitude
		        })
		        .then(function (response) {
							console.log('Tweet posted with hashtag #nowplaying')
		        })
		        .catch(error => {
		          console.log('error', error);
		        });
	});
});

function isYoutubeUrlValid(url) {
	var p = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    if(url.match(p)){
        return url.match(p)[1];
    }
    return false;
}

function hasNowPlayingHashtag(tweetText) {
	return tweetText.toLowerCase().indexOf('#nowplaying') > -1;
}

server.listen(3000,function(){
  console.log('Node server running at port 3000');
});
