var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var moment = require('moment');
var jsonfile=require('jsonfile');
jsonfile.spaces = 4;

var marlinOnline = false;
var doryOnline = false;

app.use(express.static('public'));

var fs = require('fs');
var jsonlog = "log.json";
// use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file
var messageHistory = {messages: []};
var lastWriteMessageCount = 0;
var maxHistoryCount = 50;

jsonfile.readFile(jsonlog, function(err,obj){
  if(err){
    console.log("An error occurred trying to read the json file.");
    return;
  }
  else
  {
    messageHistory.messages = obj.messages;
    setInterval(function(){
      if (lastWriteMessageCount != messageHistory.messages.length){
        if (messageHistory.messages.length > maxHistoryCount){
          messageHistory.messages = messageHistory.messages.splice(messageHistory.messages.length - maxHistoryCount)
        }

        jsonfile.writeFile(jsonlog, messageHistory);
        lastWriteMessageCount = messageHistory.messages.length;
      }
    }, 5000);

  }
})



app.get('/', function(req, res){
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.sendFile(__dirname + '/index.html');
});

app.get('/history', function(req, res){
  jsonfile.readFile(jsonlog, function(err,obj){
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.send({messageHistory: obj});
  })
});

io.on('connection', function(socket){

  socket.on('chat message', function(msg){
  	var messageObject = JSON.parse(msg);
  	messageObject.time = moment().format('MMMM Do YYYY, h:mm:ss a');
    messageObject.msgtype = "text";
    messageHistory.messages.push(messageObject);
    var messageObjectString = JSON.stringify(messageObject);
    io.emit('chat message', messageObjectString);
  });

  socket.on('user connected', function(msg){
    if (msg == "marlin"){
      marlinOnline = true;
    } else if(msg == "dory"){
      doryOnline = true;
    }
	  socket.name = msg;
	  var joinmsg = msg + " has joined the conversation";
	  console.log(joinmsg);
	  io.emit('user connected', joinmsg);
    var partnerstatus = {marlinOnline: marlinOnline, doryOnline: doryOnline};
    io.emit('partnerstatus', partnerstatus);
  });

  socket.on('user typing', function(msg){
    io.emit('user typing', msg);
  })

  socket.on('user not typing', function(msg){
    io.emit('user not typing', msg);
  })

  socket.on('image upload', function(msg){
    msg.time = moment().format('MMMM Do YYYY, h:mm:ss a');
    msg.msgtype = "picture";
    messageHistory.messages.push(msg);
    io.emit('image download', msg);
  })

  socket.on('disconnect', function(msg){
	  var leavemsg = socket.name + " has left the conversation";
	  console.log(leavemsg);
	  io.emit('user disconnected', leavemsg);

    if (socket.name == "marlin"){
      marlinOnline = false;
    } else if(socket.name == "dory"){
      doryOnline = false;
    }

  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
