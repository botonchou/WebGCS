var socket;
var previous_throttle = 0;

$(function () {
  document.addEventListener("touchstart", function(){}, true);

  $("#btn-send").click(function () {
    var msg = $('#msg-to-drone').val();
    send(msg);
  });

  var $label = $("#label-arm-disarm");
  $("#drone-arm-disarm").click(function () {
    send("ARM_DISARM", this.checked);
  });

  $('[data-slider]').on('change.fndtn.slider', onThrottleChanged);

  $("[data-rc-channel='throttle']").attr('data-slider', previous_throttle);

  start_socket_io();
});

function onThrottleChanged() {
  var throttle = $(this).attr('data-slider');

  if (throttle == previous_throttle)
    return;
  
  previous_throttle = throttle;

  const THROTTLE_MIN = 1113;
  // const THROTTLE_MAX = 2045;
  const THROTTLE_MAX = 1445;

  throttle = parseInt((throttle / 100) * (THROTTLE_MAX - THROTTLE_MIN) + THROTTLE_MIN);

  var channel = $(this).attr('data-rc-channel');

  send(channel, throttle);
}

function start_socket_io() {
  socket = io();
  socket.on('message', function () {
    var args = Array.prototype.slice.call(arguments);

    var N = args.length;

    var timestamp = args[0];
    var md5sum = args[N - 1];

    if ( md5sum != md5(args.slice(0, N-1).join("")) ) 
      throw "MD5 checksum failed";

    console.log("[Received]", args.slice(1, N-1), "{timestamp: " + timestamp + ", MD5: " + md5sum + "}");
  });
}

function send() {
  var msgs = Array.prototype.slice.call(arguments);
  if (msgs.length == 0)
    return;

  var timestamp = new Date().getTime();

  var md5sum = md5(timestamp + msgs.join(''));
  msgs.unshift(timestamp);
  msgs.unshift('message');
  msgs.push(md5sum);

  console.log(msgs);
  socket.emit.apply(socket, msgs);
  
  // socket.emit('message', timestamp, msg, md5(timestamp + msg) );
}
