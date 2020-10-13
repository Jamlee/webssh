const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const utf8 = require('utf8');
const SSHClient = require('ssh2').Client;
const pty = require('node-pty');
const stream = require('stream');
const devnull = require('dev-null');
const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();
kc.loadFromFile("./kubeconfig");
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

function utf8_to_b64(data) {
    return Buffer.from(data).toString('base64');
}

function b64_to_utf8(data) {
    return Buffer.from(data, 'base64').toString('utf8');
}

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

// 不依赖kubectl 命令行
async function createNewPodWithOutKubectl(podConfig, socket) {
    let {msgId, namespace, podName} = podConfig;
    const exec = new k8s.Exec(kc);
    let stdout = devnull();
    let stderr = devnull();
    let stdin = new stream.PassThrough();
    try {
        let ws = await exec.exec(namespace, podName,
            '', 'bash', stdout, stderr, stdin, true);
        ws.on('message', (data) => {
            let type = data.slice(0, 1).toString('hex')[1];
            let string = data.slice(1).toString('utf8');
            console.log(string);
            socket.emit(msgId, utf8_to_b64(string));
        });
        ws.on('close', (code, signal) => {
            socket.emit(msgId, '\r\nclose\r\n');
            console.log(`child process exited with code ${code}`);
        });
        socket.on(msgId, function (message) {
            if (ws && ws.readyState === 1) {
                var buffer = Buffer.from(message, 'base64');
                if (buffer.length > 0) {
                    var panddingBuffer = Buffer.concat([Buffer.from('00', 'hex'), buffer]);
                    ws.send(panddingBuffer);
                }
            }
        });
    } catch (e) {
        console.log(e);
    }
}

// 依赖 kubectl 命令行
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

    socket.on('createNewPod', function(podConfig) {//新建一个pod exec
        console.log("createNewPod")
        createNewPod(podConfig, socket);
    })

    socket.on('createNewPodWithOutKubectl', function(podConfig) {//新建一个pod exec
        console.log("createNewPodWithOutKubectl")
        createNewPodWithOutKubectl(podConfig, socket);
    })

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
})

http.listen(8000, function() {
    console.log('listening on * 8000');
})