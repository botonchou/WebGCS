var socket;
var previous_throttle = 0;
var touchDown = false;


$(function () {

  initDeviceOrientation();

  var $label = $("#label-arm-disarm");
  $("#drone-arm-disarm").click(function () {
    send(MESSAGE_IDS.ARM_DISARM, this.checked);
  });

  $("[type='radio']").click(function () {

    if ( $('#FlightMode1').get(0).checked )
      rc_inputs[4] = 1300;
    else if ( $('#FlightMode2').get(0).checked )
      rc_inputs[4] = 1490;
    else if ( $('#FlightMode3').get(0).checked )
      rc_inputs[4] = 1750;

    sendRC();
  });

  $('[data-slider]').on('change.fndtn.slider', onThrottleChanged);

  $("[data-rc-channel='throttle']").attr('data-slider', previous_throttle);

  start_socket_io();

  var joystick = new VirtualJoystick({
    limitStickTravel: true,
    strokeStyle : '#008cba',
    stickRadius: 100
  });

  joystick.addEventListener('touchStartValidation', function(event){
    var touch = event.changedTouches[0];
    if( touch.pageY < $('#gamepad').offset().top )
      return false;
    return true
  });

  joystick.addEventListener('touchStart', function(){
    touchDown = true;
  });

  joystick.addEventListener('touchEnd', function(){
    touchDown = false;
    rc_inputs[RC_CONFIG.ROLL]  = RC_CONFIG.PWM_MID_POINT;
    rc_inputs[RC_CONFIG.PITCH] = RC_CONFIG.PWM_MID_POINT;
    sendRC();
  });

  setInterval(function(){
    if (!touchDown)
      return;

    var outputEl  = document.getElementById('result');
    var dx = joystick.deltaX();
    var dy = joystick.deltaY();

    rc_inputs[RC_CONFIG.ROLL]  = parseInt(RC_CONFIG.PWM_MID_POINT + (dx / 100) * RC_CONFIG.PWM_RANGE);
    rc_inputs[RC_CONFIG.PITCH] = parseInt(RC_CONFIG.PWM_MID_POINT + (dy / 100) * RC_CONFIG.PWM_RANGE);

    sendRC();
  }, 1/30 * 1000);
});

function initDeviceOrientation() {
  // FULLTILT.DeviceOrientation instance placeholder
  var deviceOrientation;

  new FULLTILT.getDeviceOrientation({ 'type': 'world' })
  .then(function(controller) {
    // Store the returned FULLTILT.DeviceOrientation object
    deviceOrientation = controller;
  })
  .catch(function(message) {
    console.error(message);

    // Optionally set up fallback controls..., Ex: initManualControls();
  });

  const cutoff = {
    roll: 20,
    pitch: 20,
    yaw: 150
  };

  (function draw() {

    if (deviceOrientation) {
      var raw = deviceOrientation.getLastRawEventData();

      var data = {
	yaw: parseFloat(raw.alpha), // yaw
	pitch:  parseFloat(raw.beta),  // pitch
	roll: parseFloat(raw.gamma)  // roll
      };

      ["roll", "pitch", "yaw"].forEach(function (x) {
	data[x] = Math.min(Math.max(data[x], -cutoff[x]), cutoff[x]) / cutoff[x];
      });

      // send(JSON.stringify(data));

      rc_inputs[RC_CONFIG.ROLL]  = parseInt(RC_CONFIG.PWM_MID_POINT + (data.roll * 0.3) * RC_CONFIG.PWM_RANGE);
      rc_inputs[RC_CONFIG.PITCH] = parseInt(RC_CONFIG.PWM_MID_POINT + (data.pitch * 0.3) * RC_CONFIG.PWM_RANGE);

      sendRC();
    }

    requestAnimationFrame(draw);

  })();
}

const MESSAGE_IDS = {
  ARM_DISARM: 0,
  RC_INPUT: 1
};

const RC_CONFIG = {
  N_CHANNELS: 8,
  ROLL: 0,
  PITCH: 1,
  THROTTLE: 2,
  YAW: 3,
  PWM_MID_POINT: 1500,
  PWM_RANGE: 350,
  PWM_LOW: 1100,
  PWM_HIGH: 1800
};

var rc_inputs = [1500, 1500, 1500, 1500, 1300, 1500, 1500, 1500];

function onThrottleChanged() {
  var throttle = $(this).attr('data-slider');

  if (throttle == previous_throttle)
    return;
  
  previous_throttle = throttle;

  throttle = parseInt((throttle / 100) * RC_CONFIG.PWM_RANGE * 2 + RC_CONFIG.PWM_MID_POINT - RC_CONFIG.PWM_RANGE);
  rc_inputs[RC_CONFIG.THROTTLE] = throttle;
  
  sendRC();
}

function start_socket_io() {
  socket = io();
  socket.on('message', function () {
    var args = Array.prototype.slice.call(arguments);
    var N = args.length;
    var timestamp = args[0];
    console.log("[Received]", args.slice(1, N), "{timestamp: " + timestamp + "}");

    var msgs = JSON.parse(args.slice(1, N));
    if (window.series) {
      if (timestamp - window.lasttime > 1000) {
	window.series.addPoint([(new Date(timestamp)).getTime(), msgs.x], true, true);
      }
      window.lasttime = timestamp;
    }
  });
}

function sendRC() {
  send.apply(this, [MESSAGE_IDS.RC_INPUT].concat(rc_inputs));
}

function send() {
  var msgs = Array.prototype.slice.call(arguments);
  if (msgs.length == 0)
    return;

  var timestamp = new Date().getTime();

  msgs.unshift(timestamp);
  msgs.unshift('message');

  socket.emit.apply(socket, msgs);
}

function onDeviceOrientationEvent(event) {
  // process event.alpha, event.beta and event.gamma

  if (event.alpha != null) {
    var alpha = sprintf("%6.3f", event.alpha);
    var beta  = sprintf("%6.3f", event.beta );
    var gamma = sprintf("%6.3f", event.gamma);

    $('#alpha .reading').text(alpha);
    $('#beta .reading').text(beta);
    $('#gamma .reading').text(gamma);

    // if (Math.abs(beta) < 25 && Math.abs(gamma) < 25)
      handleOrientation(event);
  }
}

function handleOrientation(event) {
  var x = event.beta;  // In degree in the range [-180,180]
  var y = event.gamma; // In degree in the range [-90,90]

  // Because we don't want to have the device upside down
  // We constrain the x value to the range [-90,90]
  if (x >  90) { x =  90};
  if (x < -90) { x = -90};

  // To make computation easier we shift the range of 
  // x and y to [0,180]
  x += 90;
  y += 90;

  // 10 is half the size of the ball
  // It center the positionning point to the center of the ball
  ball.css({top: (maxX*x/180 - 10) + 'px', left: (maxY*y/180 - 10) + 'px'});
}

// 1) https://developer.mozilla.org/zh-TW/docs/WebAPI/Detecting_device_orientation
// 2) http://w3c.github.io/deviceorientation/spec-source-orientation.html

function onDeviceMotionEvent(event) {
  // process event.acceleration and event.accelerationIncludingGravity
  if (event.acceleration.x != null) {
    var x = sprintf("%6.3f", event.acceleration.x);
    var y = sprintf("%6.3f", event.acceleration.y);
    var z = sprintf("%6.3f", event.acceleration.z);

    $('#acc-x .reading').text(x);
    $('#acc-y .reading').text(y);
    $('#acc-z .reading').text(z);
  }
}
