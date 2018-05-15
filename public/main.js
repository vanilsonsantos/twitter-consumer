var currentLocation;
var socket = io.connect(`/`);

navigator.geolocation.getCurrentPosition(
    function(position) {
      currentLocation = {latitude: position.coords.latitude, longitude: position.coords.longitude};
      var googleApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${currentLocation.latitude},${currentLocation.longitude}&sensor=true&key=AIzaSyBjvIh3B5v69o-4YwgeTO38aaooW8GxTXY`;
      $.get( googleApiUrl)
      .done(function(data) {
        var result = data.results[0];
        setHeader(getCity(result));
      	var viewportResponse = result.geometry.viewport;
  			var viewport = [
  				viewportResponse.southwest.lng.toString(),
  				viewportResponse.southwest.lat.toString(),
  				viewportResponse.northeast.lng.toString(),
  				viewportResponse.northeast.lat.toString()
  			]
        socket.emit('populate-initial-view', viewport.join(","), currentLocation);
      })
      .fail(function(error) {
        alert("Error when requesting google maps api" + error);
      });
    },
    function(error){
      alert("Error when getting geolocation: " + error);
    }
);

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

$(".header").addClass("disabledbutton");
window.onscroll = function() {fixesHeader()};
var header = document.getElementById("middleHeader");
var sticky = header.offsetTop;

function fixesHeader() {
  if (window.pageYOffset >= sticky) {
    header.classList.add("sticky");
  } else {
    header.classList.remove("sticky");
  }
}

function setHeader(city) {
  $('.top-container').empty();
  $('.top-container').append(`<h1>#nowplaying in ${city}</h1>`);
  $('.top-container').append(`<p>This page shows #nowplaying tweets in ${city} that constain a youtube link. It also allows you to post a #nowplaying tweet with a YouTube link</p>`);
}

socket.on('render-tweet-initial-view', function (initialTweets, viewport) {
  $.tmpl( "tweetTemplate", initialTweets ).appendTo( "#content" );
  $('.header').removeClass('disabledbutton');
  socket.emit('start-stream', viewport);
});

socket.on('render-tweet-from-stream', function (tweet) {
  $.tmpl( "tweetTemplate", tweet ).prependTo( "#content" );
});

$("#submitTweet").click(function() {
  var youtube_link = $('#videourl').val();
  var text = $('#comment').val();
  if (youtube_link && text) {
    socket.emit('send-tweet', youtube_link, text, currentLocation);
  } else {
    alert('Video link or comment should not be empty');
  }
});
