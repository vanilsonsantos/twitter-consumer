var _twitter = require('twitter');
var express = require('express');
var app = express();
const axios = require('axios');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var timeago = require('time-ago');

app.use('/', express.static(__dirname + '/public'));

var twitter = new _twitter({
	consumer_key: 'CXVNsTDohsJaIxl0cjpuLKXYr',
  	consumer_secret: 'Y49dNi2NPN9vJaPS95QnRLslOqisEuC7v934lHOfN05cVjbtDB',
  	access_token_key: '2834545563-QYQqm8hnLPiU3eFyAD8SGtKhfIYW7gMp8fGh8Xd',
  	access_token_secret: 'SUquQt3XC2ve3IIa8JbwMa4bsRCpZSJuCVKYAXLUTDBBT'
});

var currentstream = 0;
var location = {};

io.on('connection', function (socket) {
	var socket = socket;

	socket.on('got-location-from-browser', function(location) {
		socket.emit('init', location);
	})

  socket.on('get-viewport', function(location) {
		axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&sensor=true&key=AIzaSyBjvIh3B5v69o-4YwgeTO38aaooW8GxTXY`)
		.then(function (response) {
			var result = response.data.results[0];
			socket.emit('set-header', getCity(result));
			var viewportResponse = result.geometry.viewport;
			var viewport = [
				viewportResponse.southwest.lng.toString(),
				viewportResponse.southwest.lat.toString(),
				viewportResponse.northeast.lng.toString(),
				viewportResponse.northeast.lat.toString()
			]
			console.log(viewport.join(","));
			console.log(location)
			socket.emit('got-viewport', viewport.join(","), location);
		})
		.catch(function (error) {
			console.log(error);
		});
  })
	socket.on('populate-initial-view', function(viewport, location) {
		twitter.get('search/tweets', {
		            q: '#nowplaying url:youtube',
		            result_type: 'recent',
		            count: 8,
								geocode: location.latitude + ',' + location.longitude + ',30km'
		        })
		        .then(function (response) {
							for (i=0 ; i < 5 ; i++) {
								var tweet = response.statuses[i];
								tweet.entities.urls.forEach(function(url) {
									socket.emit('render-tweet-initial-view', {
										avatar: tweet.user.profile_image_url,
										name: tweet.user.name,
										screen_name: tweet.user.screen_name,
										text: tweet.text,
										video_link: getVideoLink(url.expanded_url),
										date: timeago.ago(tweet.created_at)
									});
								});
							}
							socket.emit('start-stream', viewport);
		        })
		        .catch(error => {
		            console.log('error', error);
		        });
	});
	socket.on('find-tweets', function(viewport) {
		twitter.stream('statuses/filter', {locations:viewport}, function(stream) {
			if (currentstream)
				currentstream.destroy()
			stream.on('data', function(tweet) {
				if (hasNowPlayingHashtag(tweet.text)) {
					tweet.entities.urls.forEach(function(url) {
						var expanded_url = url.expanded_url;
						if (isYoutubeUrlValid(expanded_url)) {
							socket.emit('render-tweet-from-stream', {
								avatar: tweet.user.profile_image_url,
								name: tweet.user.name,
								screen_name: tweet.user.screen_name,
								text: tweet.text,
								video_link: getVideoLink(url.expanded_url),
								date: timeago.ago(tweet.created_at)
							});
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
		console.log(location)
		twitter.post('statuses/update', {
								status : text + ' ' + youtube_link,
								lat: location.latitude,
								long: location.longitude
		        })
		        .then(function (response) {
							console.log('Tweet posted with hashtag #nowplaying')
		        })
		        .catch(error => {
		          console.log('error', error);
		        });
	});
});

function getCity(result) {
	var city = '';
	result.address_components.forEach(function(address) {
		address.types.forEach(function(type) {
			if (type == 'administrative_area_level_2') {
				city = address.short_name;
			}
		});
	});
	return city;
}

function getVideoLink(url) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);

    if (match && match[2].length == 11) {
        return "http://www.youtube.com/embed/" + match[2];
    } else {
        return 'error';
    }
}

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

server.listen(process.env.PORT || 3000, function(){
  console.log('Node server running at port 3000');
});
