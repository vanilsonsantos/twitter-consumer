navigator.geolocation.getCurrentPosition(
    function(position) {
      var location = {latitude: position.coords.latitude, longitude: position.coords.longitude};
      socket.emit('got-location-from-browser', location);
    },
    function(error){
      console.log(error.code);
      console.log(error.message);
    }
);

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

var socket = io.connect('http://localhost:3000');

socket.on('init', function(location) {
  socket.emit('get-viewport', location);
})

socket.on('set-header', function(city) {
  $('.top-container').empty();
  $('.top-container').append(`<h1>#nowplaying in ${city}</h1>`);
  $('.top-container').append(`<p>This page shows #nowplaying tweets in ${city} that constain a youtube link. It also allows you to post a #nowplaying tweet with a YouTube link</p>`);
});

socket.on('got-viewport', function(viewport, location) {
  socket.emit('populate-initial-view', viewport, location)
})

socket.on('start-stream', function(viewport) {
  socket.emit('find-tweets', viewport);
  $('.header').removeClass('disabledbutton');
})

function getTweetContent(tweet) {
  return `<div class="tweetContent">
    <div class="videoContainer">
      <iframe style="border:0;" width="100%" height="100%" src="${tweet.video_link}"></iframe>
    </div>
    <div class="tweetContainer">
      <div class="tweetContainerAvatar" style="background-image: url('${tweet.avatar}');">
      </div>
      <div class="tweetContainerName">
        <span style="font-weight: bold; display:block;">${tweet.name}</span>
        <span>@${tweet.screen_name}</span>
      </div>
      <div class="tweetContainerLogo">
        <img src="./Twitter-Logo.png" width="30px" height="30px">
      </div>
      <div class="tweetContainerText">
        <span style="display:block; margin:0 15px 0 15px;">
          ${tweet.text}
        <span>
      </div>
      <div class="tweetContainerInfo">
          <span style="text-align: justify; display:block; margin:0 15px 0 15px;">${tweet.date}</span>
      </div>
    </div>
  </div>`
}

socket.on('render-tweet-initial-view', function (tweet) {
  $('#content').append(getTweetContent(tweet));
});

socket.on('render-tweet-from-stream', function (tweet) {
  $('#content').prepend(getTweetContent(tweet));
});

$("#submitTweet").click(function() {
  var youtube_link = $('#videourl').val();
  var text = $('#comment').val();
  socket.emit('send-tweet', youtube_link, text);
});
