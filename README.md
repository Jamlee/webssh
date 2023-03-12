# WEBSSH
124 行代码完成3种简易的 webssh, 支持 k8s 和 vm ssh，用于理解实现webssh原理。我们也可以基于该原理开发 Paas 平台功能。

## 使用方式
针对于虚拟机的 webssh
```bash
# 1 启动 node
node main.js

# 2 打开本地文件 index-vm.html
# 修改代码里配置信息
# https://github.com/Jamlee/webssh/blob/033491e4f17fc40794e84e369550d9f20f290af0/index.html#L11
let config = {msgId: "server01", ip: "200.200.200.180", username: "root", password: "YOUR PASSWORD"};

# 3 然后本地浏览器打开 index-vm.html
``` 

针对于k8s 的 webssh
```bash
# 1 启动 node
node main.js

# 2 打开本地文件 index-kube.html
# 修改代码里配置信息
# https://github.com/Jamlee/webssh/blob/033491e4f17fc40794e84e369550d9f20f290af0/index.html#L11
let config = {msgId: "pod01", podName: "tiller-deploy-6d8dfbb696-z8g6l", namespace: "kube-system"};

# 3 然后本地浏览器打开 index-kube.html
``` 
类似的：https://github.com/Jamlee/webssh/blob/master/index-kube-v2.html#L18 也是一样修改和访问，我们这个方案不依赖 kubectl。

## 效果图
VM 的 webssh  
![image](http://github.com/Jamlee/webssh/raw/master/01.jpg)  

k8s 中 pod 的 webssh (依赖 kubectl)  
![image](http://github.com/Jamlee/webssh/raw/master/02.jpg)  

k8s 中 pod 的 webssh（依赖 node k8s client）  
![image](http://github.com/Jamlee/webssh/raw/master/03.jpg)  

## 其他类似项目

基于 Node  
https://github.com/samejack/web-k8s-exec  
https://github.com/kubernetes-ui/container-terminal  

基于 Python  
https://github.com/xsank/webssh  
https://github.com/huashengdun/webssh  

基于 Golang  
https://github.com/shibingli/webconsole  

