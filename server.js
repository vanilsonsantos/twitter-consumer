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

io.on('connection', function (socket) {
	var socket = socket;
	socket.on('populate-initial-view', function(viewport, currentLocation) {
		twitter.get('search/tweets', {
		            q: '#nowplaying url:youtube',
		            result_type: 'recent',
		            count: 18,
								geocode: currentLocation.latitude + ',' + currentLocation.longitude + ',30km'
		        })
		        .then(function (response) {
							var initialTweets = [];
							for (i=0 ; i < 5 ; i++) {
								var tweet = response.statuses[i];
								tweet.entities.urls.forEach(function(url) {
									initialTweets.push({
											avatar: tweet.user.profile_image_url,
											name: tweet.user.name,
											screen_name: tweet.user.screen_name,
											text: tweet.text,
											video_link: getVideoLink(url.expanded_url),
											date: timeago.ago(tweet.created_at)
									});
								});
							}
							socket.emit('render-tweet-initial-view', initialTweets, viewport);
		        })
		        .catch(error => {
		            console.log('error', error);
		        });
	});
	socket.on('start-stream', function(viewport) {
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
	socket.on('send-tweet', function(youtube_link, text, currentLocation) {
		console.log(currentLocation)
		twitter.post('statuses/update', {
								status : text + ' ' + youtube_link,
								lat: currentLocation.latitude,
								long: currentLocation.longitude
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
        return "https://www.youtube.com/embed/" + match[2];
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
