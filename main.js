const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const utf8 = require('utf8');
const SSHClient = require('ssh2').Client;
const pty = require('node-pty');
const os = require('os');

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

function createNewPod(podConfig, socket) {
    let {cols, rows, msgId, namespace, podName} = podConfig;
    const env = Object.assign({}, process.env);
    env['COLORTERM'] = 'truecolor';
    term = pty.spawn('/usr/local/bin/kubectl',
        ['exec', '-it', podName, '-n', namespace, '--', '/bin/sh'], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: env.PWD,
        env: env,
        encoding: 'utf8', // 为空是 binary 格式
    });
    term.onData((data) => {
        socket.emit(msgId, data);
    });
    term.onExit( (code, signal) => {
        socket.emit(msgId, '\r\nclose\r\n');
        console.log(`child process exited with code ${code}`);
    });
    socket.on(msgId, function (data) {
        term.write(data);
    });
}

io.on('connection', function(socket) {
    socket.on('createNewServer', function(machineConfig) {//新建一个ssh连接
        console.log("createNewServer")
        createNewServer(machineConfig, socket);
    })

    socket.on('createNewPod', function(podConfig) {//新建一个pod ssh连接
        console.log("createNewPod")
        createNewPod(podConfig, socket);
    })

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
})

http.listen(8000, function() {
    console.log('listening on * 8000');
})