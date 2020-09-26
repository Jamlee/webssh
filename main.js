const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const utf8 = require('utf8');
const SSHClient = require('ssh2').Client;

function createNewServer(machineConfig, socket) {
    const ssh = new SSHClient();
    let {msgId, ip, username, password} = machineConfig;
    ssh.on('ready', function () {
        socket.emit(msgId, '\r\n***' + ip + ' SSH CONNECTION ESTABLISHED ***\r\n');
        ssh.shell(function(err, stream) {
            if(err) {
                return socket.emit(msgId, '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
            }
            socket.on(msgId, function (data) {
                stream.write(data);
            });
            stream.on('data', function (d) {
                socket.emit(msgId, utf8.decode(d.toString('binary')));
            }).on('close', function () {
                ssh.end();
            });
        })
    }).on('close', function () {
        socket.emit(msgId, '\r\n*** SSH CONNECTION CLOSED ***\r\n');
    }).on('error', function (err) {
        console.log(err);
        socket.emit(msgId, '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
    }).connect({
        host: ip,
        port: 22,
        username: username,
        password: password
    });
}


io.on('connection', function(socket) {
    socket.on('createNewServer', function(machineConfig) {//新建一个ssh连接
        console.log("createNewServer")
        createNewServer(machineConfig, socket);
    })

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
})

http.listen(8000, function() {
    console.log('listening on * 8000');
})