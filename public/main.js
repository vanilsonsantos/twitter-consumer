$(".header").addClass("disabledbutton");

window.onscroll = function() {myFunction()};

var header = document.getElementById("middleHeader");
var sticky = header.offsetTop;

function myFunction() {
  if (window.pageYOffset >= sticky) {
    header.classList.add("sticky");
  } else {
    header.classList.remove("sticky");
  }
}

var socket = io.connect('http://localhost:3000');

socket.on('init', function() {
  socket.emit('get-locations');
})

socket.on('set-header', function(city) {
  $('.top-container').empty();
  $('.top-container').append(`<h1>#nowplaying in ${city}</h1>`);
  $('.top-container').append(`<p>This page shows #nowplaying tweets in ${city} that constain a youtube link. It also allows you to post a #nowplaying tweet with a YouTube link</p>`);
});

socket.on('got-location', function(viewport, location) {
  socket.emit('populate-initial-view', viewport, location)
})

socket.on('start-stream', function(viewport) {
  socket.emit('find-tweets', viewport);
  $('.header').removeClass('disabledbutton');
})

function getTweetContent(tweet) {
  return `<div style="width:100%; height: 270px; margin-top: -3px; background-color:#f1f1f1;">
    <div style="width:49.5%; float: left;padding: 0; margin: 2px 0 0 2px;  height:265px;">
      <iframe style="border:0;" width="100%" height="100%" src="${tweet.video_link}"></iframe>
    </div>
    <div style="width:49.5%; margin: 2px 2px 0 0; background-color: white; border:1px solid #e7e7e7; float: right;padding: 0; height:auto;">
      <div style="margin: 15px 0 0 15px; background-position: center; background-image: url('${tweet.avatar}'); float: left; border-radius: 50%; width:45px; height: 45px;">
      </div>
      <div style="font-size: 15px;float:left; margin-left:5px; margin-top:20px; display:block;">
        <span style="font-weight: bold; display:block;">${tweet.name}</span>
        <span>@${tweet.screen_name}</span>
      </div>
      <div style="margin: 15px 15px 0 0; background-position: center; float: right; border-radius: 50%; width:30px; height: 30px;">
        <img src="./Twitter-Logo.png" width="30px" height="30px">
      </div>
      <div style="width:100%; margin-top: 15px; font-size: 17px; float:right;">
        <span style="display:block; margin:0 15px 0 15px;">
          ${tweet.text}
        <span>
      </div>
      <div style="width:100%; margin: 15px 0 15px 0; font-size: 16px; float: right;">
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
