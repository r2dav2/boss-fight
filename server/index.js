const fs = require('fs');
var server = require('http').createServer();

var io = require('socket.io')(server);

io.sockets.on('connection', socket => {
	console.log(socket.id + ' connected');

	socket.on('disconnect', () => {
		console.log(socket.id + ' disconnected');
	});
});

setInterval(() => {
	
}, 0);

server.listen(25565);