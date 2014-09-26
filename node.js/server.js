var util = require('util');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

const INFO = '\33[34m[Info]\33[0m ';
const MSG  = '\33[34m[Message]\33[0m ';
var nUsers = 0;

app.use(express.static(__dirname + '/../view'));
app.use(bodyParser.urlencoded({ extended: false }))

static_route([
  '/js',
  '/js/foundation/',
  '/js/vendor',
  '/css',
  '/vendor/bootstrap-3.2.0-dist/css',
  '/vendor/bootstrap-3.2.0-dist/js'
]);

function static_route(dir) {
  if (! (dir instanceof Array) )
    dir = [dir];

  for (var i=0; i<dir.length; ++i) {
    console.log(INFO + "Using static route: \33[32m" + dir[i] + "\33[0m");
    app.use(dir[i], express.static(__dirname + '/../' + dir[i]));
  }
}

app.get('/receive', function (req, res){
  if (messages.length > 0)
    res.send(messages.shift());
  else
    res.send('');
});

var messages = new Array();

app.post('/send', function (req, res) {

  var msg = req.body.msg;
  if (typeof msg == 'undefined')
    return;

  messages.push(msg);
  console.log(msg);
  res.end();

  io.emit('message', msg);
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/../view/index.html');
});

io.on('connection', function(socket) {
  ++nUsers;
  console.log(INFO + "new user connected \33[1;30m {total: " + nUsers + '}\33[0m');

  socket.on('disconnect', function(){
    --nUsers;
    console.log(INFO + "a user disconnected \33[1;30m {total: " + nUsers + '}\33[0m');
  }).on('message', function () {

    var args = Array.prototype.slice.call(arguments);

    var timestamp = args[0];
    var md5sum = args[args.length - 1];

    console.log(MSG + util.inspect(args.slice(1, args.length - 1), { colors:true }));
    console.log("\33[1;30m {timestamp: " + timestamp + ", MD5: " + md5sum + "]\33[0m");

    args.unshift("message");
    socket.broadcast.emit.apply(this, args);
  });
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});
