module.exports = function () {
  var $ = require('jquery')
  var http = require('http')
  var Popover = require('popover')
  var shoe = require('shoe')
  var YouTubePlayer = require('youtube-player')

  var $result = $('#result')

  $('a').on('click', function (ev) {
    var popover = new Popover($(this).attr('title'), 'Hello');
    popover.show(this)
    setTimeout(function () {
      popover.hide()
    }, 1000)
  })

  http.get({ path : '/beep' }, function (res) {
    var div = $result[0]
    div.innerHTML += 'GET /beep<br>';

    res.on('data', function (buf) {
      div.innerHTML += buf;
    });

    res.on('end', function () {
      div.innerHTML += '<br>__END__';
    });
  });

  var stream = shoe('/invert')

  stream.on('data', function (data) {
    $result[0].appendChild(document.createTextNode(data))
  })

  var p = new YouTubePlayer({ id: 'player', width: 400, height: 300 })

  p.play('EvObIwCu8CQ')
}
