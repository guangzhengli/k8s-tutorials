# Kubenates workshop

* [Kubenates workshop](#kubenates-workshop)
    * [准备工作](#准备工作)
        * [安装 docker](#安装-docker)
        * [安装 minikube](#安装-minikube)
        * [安装 k8s CLI 和 Terminal based UI](#安装-k8s-cli-和-terminal-based-ui)
        * [注册 docker hub 账号登录](#注册-docker-hub-账号登录)
    * [Container](#container)
    * [Pod](#pod)
    * [Deployment](#deployment)
        * [release new verison](#release-new-verison)
        * [Rolling Update](#rolling-update)
        * [Automatically blocking bad releases by readinessProbe](#automatically-blocking-bad-releases-by-readinessprobe)
    * [Service](#service)
    * [ingress](#ingress)
    * [Configmap](#configmap)
        * [env var](#env-var)
        * [configmap](#configmap-1)
        * [Getting all the variables from a ConfigMap](#getting-all-the-variables-from-a-configmap)
        * [Exposing ConfigMap as files](#exposing-configmap-as-files)
    * [Secret](#secret)
        * [Using stringData](#using-stringdata)
    * [helm](#helm)

## 准备工作

本地环境是 MacOS 11.6.2 Intel 版本，教程也是本地环境。windows 或 linux 环境的小伙伴需要自行安装 docker 和 minikube。

如果本地

### 安装 docker

因为 docker desktop 各种协议和法律问题，已经不建议大家直接安装 desktop 使用，建议只安装 CLI。注意：如果本地已经安装了 docker desktop，那么可以忽略这一步，下一步也可以简化。

```bash
# Install Docker CLI
brew install docker
brew install docker-compose
```

### 安装 minikube

[minikube](https://minikube.sigs.k8s.io/docs/) 用于在本地环境中运行 Kubernetes 集群。但它也运行一个可用于运行容器的 docker 守护进程。在 macOS 上，minikube 运行在很多虚拟化技术上，可以选择[hyperkit](https://minikube.sigs.k8s.io/docs/drivers/hyperkit/)，这里因为我本地之前已经安装过 virtualbox (brew install --cask virtualbox)，所以我用的是 virtualbox 虚拟化技术。如果你本地之前已经安装了 docker desktop 的话，可以不需要下载 `hyperkit` 或者 `virtualbox`。

```bash
# Install hyperkit and minikube (check which vm-driver to use, if install docker desktop already, you can just use vm-driver=docker instead of install hyperkiy)
brew install hyperkit
brew install minikube
```

```bash
# Start minikube 
minikube start --vm-driver hyperkit --container-runtime=docker
# minikube start --vm-driver virtualbox --container-runtime=docker
# minikube start --vm-driver docker --container-runtime=docker

# Tell Docker CLI to talk to minikube's VM
eval $(minikube docker-env)

# Save IP to a hostname
echo "`minikube ip` docker.local" | sudo tee -a /etc/hosts > /dev/null

# Test
docker run hello-world
```

> 注意：如果本地已经安装了 docker desktop，那么可以使用 minikube start --vm-driver docker --container-runtime=docker 来快速启动 minikube

**minikube Cheatsheet**

`minikube stop` 不会删除任何数据，只是停止 VM 和 k8s 集群。

`minikube delete` 删除所有 minikube 启动后的数据。

`minikube ip` 集群和 docker enginer 运行的 IP 地址。

`minikube pause` 暂停当前的资源和集群

`minikube status` 查看当前集群状态

### 安装 k8s CLI 和 Terminal based UI

如果本地没有k8s CLI `kubectl` 的话，需要安装一下

```bash
brew install kubectl
```

如果我们希望更直观的观察 kubenates 中资源的变化，也可以安装一个 [k9s](https://k9scli.io/)（对于初学者而言，更建议使用 kubectl 来手动观察）

```bash
brew install k9s
```

如果需要练习 helm 的使用，可以先安装 helm

```bash
brew install helm
```

### 注册 docker hub 账号登录

在 docker hun(https://hub.docker.com/) 中注册账号，并且使用 login 登录账号。

```
docker login
```

## Container

新建一个 `main.go` 的 golang 文件，里面写的是 `v1` 版本的代码，逻辑很简单，创建一个 `http server`，调用配置端口 `3000` 返回字符串 `[v1] Hello, Kubernetes!`。

```go
package main

import (
	"io"
	"net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "[v1] Hello, Kubernetes!")
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

接下来我们编写 `Dockerfile` 文件，简单的方案当然是直接使用 golang 的 alpine 镜像来打包，但是因为我们后续练习需要频繁的 push image 到 dockerhub 和 pull image 到 kubenates 中，为了优化网络速度，可以先在 `golang:1.16-buster` 中将上述代码编译成二进制文件，再将二进制文件复制到 `base-debian10` 镜像中运行。

这样我们可以将 300MB～500MB 大小的镜像变成只有 20MB 的镜像，甚至压缩上传到 DockerHub 后大小只有 10MB。

```dockerfile
# Dockerfile
FROM golang:1.16-buster AS builder
RUN mkdir /src
ADD . /src
WORKDIR /src

RUN go env -w GO111MODULE=auto
RUN go build -o main .

FROM gcr.io/distroless/base-debian10

WORKDIR /

COPY --from=builder /src/main /main
EXPOSE 3000
ENTRYPOINT ["/main"]
```

执行 `docker build` 命令，第一次需要先 pull base images，需要耐心等待一会。

需要注意将 `guangzhengli` 替换成自己的 `DockerHub` 账号名称。 这样我们后续可以 push image 到我们自己的  `DockerHub` 仓库当中。

```shell
docker build . -t guangzhengli/hellok8s:v1
```

 `docker build`  完成后我们可以通过 `docker images` 查看镜像基础信息，执行 `docker run` 命令将容器启动， `-p` 指定 `8080` 作为端口，`-d` 指定刚打包成功的镜像名称。

```shell
docker run -p 3000:3000 --name hellok8s -d guangzhengli/hellok8s:v1
```

运行成功后，可以通过浏览器或者 `curl` 来访问 `http://127.0.0.1:8080` , 查看是否成功返回字符串 `[v1] Hello, Kubernetes!`。

这里因为我的 docker runtime 是使用 `minikube`，所以我需要先调用  `minikube ip` 来或者 IP 地址，例如这里返回了 `192.168.59.100`，所以我需要访问  `http://192.168.59.100:3000` 来判断是否成功返回字符串 `[v1] Hello, Kubernetes!`。

```shell
docker push guangzhengli/hellok8s:v1
```

最后确认没有问题，`docker push` 将镜像上传到远程的 `DockerHub` 仓库当中，这样可以供他人下载使用，也方便后续  `Minikube` 下载镜像使用。  

## Pod

 `pod` 是我们练习的第一个 k8s 资源，在了解 `pod` 和  `container` 的区别之前，我们可以先创建一个简单的 pod 试试，  

我们先创建 `nginx.yaml` 文件。

```yaml
# nginx.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
    - name: nginx-container
      image: nginx
```

其中  `kind` 表示我们要创建的资源是 `Pod` 类型，  `metadata.name` 表示要创建的 pod 的名字，这个名字需要是唯一的。   `spec.containers` 表示要运行的容器的名称和镜像名称。镜像默认来源 `DockerHub`。

我们运行第一条 k8s 命令 `kubectl apply -f nginx.yaml` 命令启动 pod。

``` shell
kubectl apply -f nginx.yaml
```

我们可以通过 `kubectl get pods` 来查看 pod 是否正常启动，

通过命令下面的命令来配置 `nginx` 的首页内容

```shell
kubectl exec -it nginx-pod /bin/bash

echo "hello kubenates by nginx!" > /usr/share/nginx/html/index.html

kubectl port-forward nginx-pod 4000:80
```

最后可以通过浏览器或者 `curl` 来访问 `http://127.0.0.1:4000` , 查看是否成功启动 `nginx` 和返回字符串 `hello kubenates by nginx!`。

### Pod 与 Container 的不同

回到 `pod` 和  `container` 的区别，我们会发现刚刚创建出来的资源如下图所示，在最内层是我们的服务 `nginx`，运行在 `container` 中， `container` (容器) 的本质是进程，而 `pod` 是管理这一组进程的资源。

![nginx_pod](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/nginx_pod.png)

所以自然 `pod` 可以管理多个 `container`，在某些场景例如 `container` 之间需要文件交换(日志收集)，本地网络通信需求(使用 localhost 或者 Socket 文件进行本地通信)，在这些场景中使用 `pod` 管理多个 `container` 就非常的推荐。如下图所示：

![pod](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/pod.png)

### Pod 其它命令

我们可以通过 `logs` 或者 `logs -f` 命令查看 pod 日志，可以通过 `exec -it` 进入 pod 或者调用容器命令，通过 `delete pod` 或者  `delete -f nginx.yaml` 的方式删除 pod 资源。这里可以看到 [kubectl 所有命令](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)。

```shell
kubectl logs --follow nginx
                              
kubectl exec nginx -- ls

kubectl delete pod nginx
# pod "nginx" deleted

kubectl delete -f nginx.yaml
# pod "nginx" deleted
```

### 作业一：Hellok8s Pod

根据我们在 `container` 的那节构建的 `hellok8s:v1` 的镜像，编写出 `pod` 的资源文件。并通过 `port-forward` 到本地的 `3000` 端口进行访问，最终得到字符串 `[v1] Hello, Kubernetes!`。

```yaml
# hellok8s.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hellok8s
spec:
  containers:
    - name: hellok8s-container
      image: guangzhengli/hellok8s:v1
```

```shell
kubectl get pods

kubectl port-forward hellok8s 3000:3000
```

## Deployment

在生产环境中，我们基本上不会直接管理 pod，我们需要 `kubenates` 来帮助我们来完成一些自动化操作，例如自动扩容或者自动升级版本。可以想象在生产环境中，我们手动部署了 10 个 `hellok8s:v1` 的 pod，这个时候我们需要升级成 `hellok8s:v2` 版本，我们难道需要一个一个的将 `hellok8s:v1` 的 pod 手动升级吗？

这个时候就需要我们来看 `kubeates` 的另外一个资源 `deployment`，来帮助我们管理 pod。

### 扩容

首先可以创建一个 `deployment.yaml` 的文件。来管理 `hellok8s` pod。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
        - image: guangzhengli/hellok8s:v1
          name: hellok8s-container
```

其中  `kind` 表示我们要创建的资源是 `deployment` 类型，  `metadata.name` 表示要创建的 deployment 的名字，这个名字需要是**唯一**的。

在 `spec` 里面表示，首先 `replicas` 表示的是部署的 pod 副本数量，`selector` 里面表示的是 `deployment` 资源和 `pod` 资源关联的方式，这里表示 `deployment` 会管理 (selector) 所有 `labels=hellok8s` 的 pod。

`template` 的内容是用来定义 `pod` 资源的，你会发现和作业一：Hellok8s Pod 资源的定义是差不多的，唯一的区别是我们需要加上 `metadata.labels` 来和上面的 `selector.matchLabels` 对应起来。来表明 pod 是被 deployment 管理，不用在`template` 里面加上 `metadata.name` 是因为 deployment 会主动为我们创建 pod 的唯一`name`。

接下来输入下面的命令，可以创建 `deployment` 资源。通过 `get` 和 `delete pod` 命令，我们会初步感受 deployment 的魅力。**每次创建的 pod 名称都会变化，某些命令记得替换成你的 pod 的名称**

```shell
kubectl apply -f deployment.yaml

kubectl get deployments
#NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
#hellok8s-deployment   1/1     1            1           39s

kubectl get pods             
#NAME                                   READY   STATUS    RESTARTS   AGE
#hellok8s-deployment-77bffb88c5-qlxss   1/1     Running   0          119s

kubectl delete pod hellok8s-deployment-77bffb88c5-qlxss 
#pod "hellok8s-deployment-77bffb88c5-qlxss" deleted

kubectl get pods                                       
#NAME                                   READY   STATUS    RESTARTS   AGE
#hellok8s-deployment-77bffb88c5-xp8f7   1/1     Running   0          18s
```

我们会发现一个有趣的现象，当手动删除一个 `pod` 资源后，deployment 会自动创建一个新的 `pod`，这和我们之前手动创建 pod 资源有本质的区别！这代表着当生产环境管理着成千上万个 pod 时，我们不需要关心具体的情况，只需要维护好这份 `deployment.yaml` 文件的资源定义即可。

接下来我们通过自动扩容来加深这个知识点，当我们想要将 `hellok8s:v1` 的资源扩容到 3 个副本时，只需要将 `replicas` 的值设置成 3，接着重新输入 `kubectl apply -f deployment.yaml` 即可。如下所示：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
        - image: guangzhengli/hellok8s:v1
          name: hellok8s-container
```

可以在 `kubectl apply` 之前通过新建窗口执行 `kubectl get pods --watch` 命令来观察 pod 启动和删除的记录，想要减少副本数时也很简单，你可以尝试将副本数随意增大或者缩小，再通过 `watch` 来观察它的状态。

![deployment](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/deployment.png)

### 升级版本

我们接下来尝试将所有 `v1` 版本的 `pod` 升级到 `v2` 版本。首先我们需要构建一份 `hellok8s:v2` 的版本镜像。唯一的区别就是字符串替换成了 `[v2] Hello, Kubernetes!`。

```golang
package main

import (
	"io"
	"net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "[v2] Hello, Kubernetes!")
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

将 `hellok8s:v2` 推到 DockerHub 仓库中。

```shell
docker build . -t guangzhengli/hellok8s:v2
docker push guangzhengli/hellok8s:v2
```

接着编写 `v2` 版本的 deployment 资源文件。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
        - image: guangzhengli/hellok8s:v2
          name: hellok8s-container
```

```shell
kubectl apply -f deployment.yaml
# deployment.apps/hellok8s-deployment configured

kubectl get pods                
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-66799848c4-kpc6q   1/1     Running   0          3s
# hellok8s-deployment-66799848c4-pllj6   1/1     Running   0          3s
# hellok8s-deployment-66799848c4-r7qtg   1/1     Running   0          3s

kubectl port-forward hellok8s-deployment-66799848c4-kpc6q 3000:3000
# Forwarding from 127.0.0.1:3000 -> 3000
# Forwarding from [::1]:3000 -> 3000

# open another terminal
curl http://localhost:3000
# [v2] Hello, Kubernetes!
```

你也可以输入 `kubectl describe pod hellok8s-deployment-66799848c4-kpc6q` 来看是否是 `v2` 版本的镜像。

### Rolling Update(滚动更新)

如果我们在生产环境上，管理着多个副本的 `hellok8s:v1` 版本的 pod，我们需要更新到 `v2` 的版本，像上面那样的部署方式是可以的，但是也会带来一个问题，就是所有的副本在同一时间更新，这会导致我们 `hellok8s` 服务在短时间内是不可用的，因为所有 pod 都在升级到 `v2` 版本的过程中，需要等待某个 pod 升级完成后才能提供服务。

这个时候我们就需要控制升级的速率，。具体可以详细看[官网定义](https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/deployment/)。

我们先输入命令回滚我们的 deployment，输入 `kubectl describe pod` 会发现 deployment 已经把 `v2` 版本的 pod 回滚到 ` v1` 的版本。

``` shell
kubectl rollout undo deployment hellok8s-deployment

kubectl get pods                                    
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-77bffb88c5-cvm5c   1/1     Running   0          39s
# hellok8s-deployment-77bffb88c5-lktbl   1/1     Running   0          41s
# hellok8s-deployment-77bffb88c5-nh82z   1/1     Running   0          37s

kubectl describe pod hellok8s-deployment-77bffb88c5-cvm5c 
```



```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  strategy:
     rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  replicas: 3
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v2
        name: hellok8s-container
```

```ruby
require "sinatra"

set :bind, "0.0.0.0"

$counter = 0

get "*" do
  $counter += 1
  if $counter > 3
    raise "Whoops, something is wrong"
  end

  "[bad] Hello, Kubernetes!\n"
end
```

```
docker build . -t guangzhengli/hellok8s:bad
docker push guangzhengli/hellok8s:bad
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:bad
        name: hellok8s-container
```

```shell
kubectl rollout history deployment hellok8s
kubectl rollout undo deployment hellok8s
kubectl rollout undo deployment/hellok8s --to-revision=2
```

### Automatically blocking bad releases by readinessProbe

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v2 # Still using v2
        name: hellok8s-container
        readinessProbe: # New readiness probe
          periodSeconds: 1
          successThreshold: 5
          httpGet:
            path: /
            port: 4567
```

```shell
kubectl describe pod hellok8s-68f47f657c-zwn6g

# ...
# ...
# ...
# Readiness probe failed:
# HTTP probe failed with statuscode: 500
```

## Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hellok8s-svc
spec:
  type: NodePort
  selector:
    app: hellok8s
  ports:
  - port: 4567
    nodePort: 30001
```

```
kubectl apply -f service.yaml
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v3
        name: hellok8s-container
```

```
kubectl get service hellok8s-svc
```

```ruby
#app.rb
require "sinatra"

set :bind, "0.0.0.0"

get "*" do
  "[v3] Hello, Kubernetes, from #{`hostname`.strip}!\n"
end
```

```
docker build . -t guangzhengli/hellok8s:v3
docker push guangzhengli/hellok8s:v3
```

```shell
kubectl apply -f deployment.yaml

curl http://localhost:30001
# [v3] Hello, Kubernetes, from hellok8s-7f4c57d446-t9ngx!

curl http://localhost:30001
# [v3] Hello, Kubernetes, from hellok8s-7f4c57d446-985dq!

curl http://localhost:30001
# [v3] Hello, Kubernetes, from hellok8s-7f4c57d446-t9ngx!
```

## ingress

```shell
minikube addons enable ingress

kubectl delete deployment,service --all
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hellok8s-svc
spec:
  selector:
    app: hellok8s
  ports:
  - port: 4567
    targetPort: 4567

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v3
        name: hellok8s-container
```

```yaml
# nginx.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  selector:
    app: nginx
  ports:
  - port: 1234
    targetPort: 80

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx-container
```

```shell
kubectl apply -f hellok8s.yaml
# service/hellok8s-svc created
# deployment.apps/hellok8s created

kubectl apply -f nginx.yaml
# service/nginx-svc created
# deployment.apps/nginx created

kubectl get pods
# NAME                        READY   STATUS    RESTARTS 
# hellok8s-7f4c57d446-6c8b8   1/1     Running   0        
# hellok8s-7f4c57d446-jkqbl   1/1     Running   0        
# nginx-77c5c66899-dgkk2      1/1     Running   0        
# nginx-77c5c66899-w9srw      1/1     Running   0        

kubectl get service
# NAME           TYPE        CLUSTER-IP       PORT(S)   
# hellok8s-svc   ClusterIP   10.102.242.233   4567/TCP  
# nginx-svc      ClusterIP   10.96.19.78      1234/TCP
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-ingress
  annotations:
    # We are defining this annotation to prevent nginx
    # from redirecting requests to `https` for now
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx-svc
                port:
                  number: 1234
          - path: /hello
            pathType: Prefix
            backend:
              service:
                name: hellok8s-svc
                port:
                  number: 4567
```

```shell
kubectl apply -f ingress.yaml
# ingress.extensions/hello-ingress created

kubectl get ingress
# NAME            HOSTS   ADDRESS     PORTS   AGE
# hello-ingress   *       localhost   80      1m
```

```shell
kubectl apply -f ingress.yaml
# ingress.extensions/hello-ingress configured

curl http://localhost/hello
# [v3] Hello, Kubernetes, from hellok8s-7f4c57d446-qth54!

curl http://localhost
# (nginx welcome page)
```

## Configmap

### env var

```ruby
require "sinatra"

set :bind, "0.0.0.0"

get "*" do
  message = ENV.fetch("MESSAGE", "Hello, Kubernetes")
  "[v4] #{message} (from #{`hostname`.strip})\n"
end
```

```
docker build . -t guangzhengli/hellok8s:v4
docker push guangzhengli/hellok8s:v4

kubectl delete deployment,service,ingress --all
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hellok8s-svc
spec:
  type: NodePort
  selector:
    app: hellok8s
  ports:
  - port: 4567
    nodePort: 30001

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v4
        name: hellok8s-container
```

```shell
kubectl apply -f hellok8s.yaml 

curl localhost:30001
# [v4] Hello, Kubernetes (from hellok8s-69dbd44879-vt8dv)
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v4
        name: hellok8s-container
        env:
          - name: MESSAGE
            value: "It works!"
```

```shell
kubectl apply -f hellok8s.yaml 

curl localhost:30001
# [v4] It works! (from hellok8s-568f64dd94-bfxhs)
```

### configmap

```yaml
# hellok8s-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hellok8s-config
data:
  MESSAGE: "It works with a ConfigMap!"
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v4
        name: hellok8s-container
        env:
          - name: MESSAGE
            valueFrom:
              configMapKeyRef:
                name: hellok8s-config
                key: MESSAGE
```

```shell
kubectl apply -f hellok8s-config.yaml

kubectl apply -f hellok8s.yaml

kubectl apply -f service.yaml

curl localhost:30001
# [v4] It works with a ConfigMap! (from hellok8s-54d5fb5765-nl62z)
```

### Getting all the variables from a ConfigMap

```
env:
  - name: VAR1
    valueFrom:
      configMapKeyRef:
        name: hellok8s-config
        key: VAR1

  - name: VAR2
    valueFrom:
      configMapKeyRef:
        name: hellok8s-config
        key: VAR2

  - name: VAR3
    valueFrom:
      configMapKeyRef:
        name: hellok8s-config
        key: VAR3
# ...
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v4
        name: hellok8s-container
        envFrom:
          - configMapRef:
              name: hellok8s-config
```

```
kubectl apply -f hellok8s-updated.yaml

curl localhost:30001
# [v4] It works with a ConfigMap! (from hellok8s-54d5fb5765-nl62z)
```

### Exposing ConfigMap as files

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      volumes:
       - name: config
         configMap:
           name: hellok8s-config
      containers:
      - image: guangzhengli/hellok8s:v4
        name: hellok8s-container
        volumeMounts:
        - name: config
          mountPath: /config
```

```shell
kubectl apply -f hellok8s.yaml
kubectl apply -f hellok8s-config.yaml

kubectl get pods
# NAME                       READY   STATUS
# hellok8s-8c56675c9-7gxpv   1/1     Running
# hellok8s-8c56675c9-bfk8t   1/1     Running

# Replace the pod name to what you have running locally
kubectl exec -it hellok8s-8c56675c9-7gxpv -- sh
cat /config/MESSAGE
# It works with a ConfigMap!
```

## Secret

```yaml
# hellok8s-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: hellok8s-secret
data:
  SECRET_MESSAGE: "SXQgd29ya3Mgd2l0aCBhIFNlY3JldAo="
```

```
echo 'It works with a Secret' | base64
# SXQgd29ya3Mgd2l0aCBhIFNlY3JldAo=
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
      - image: guangzhengli/hellok8s:v4
        name: hellok8s-container
        env:
          - name: MESSAGE
            valueFrom:
              secretKeyRef:
                name: hellok8s-secret
                key: SECRET_MESSAGE
```

```shell
kubectl apply -f hellok8s-secret.yaml
kubectl apply -f deployment.yaml

kubectl get pods
# NAME                        READY   STATUS
# hellok8s-6d7579848d-f56wb   1/1     Running
# hellok8s-6d7579848d-kzq57   1/1     Running

# Replace the pod name to what you have running locally
kubectl exec -it hellok8s-6d7579848d-kzq57 --  env | grep MESSAGE
# MESSAGE=It works with a Secret
```

### Using stringData

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hellok8s-secret
stringData:
  SECRET_MESSAGE: "It works with a Secret"
```

```shell
kubectl get secret hellok8s-secret -o yaml

# apiVersion: v1
# kind: Secret
# data:
#   SECRET_MESSAGE: SXQgd29ya3Mgd2l0aCBhIFNlY3JldAo=
# ...
```

## helm

```shell
helm create helm-hello

helm upgrade --install hello-helm --values values.yaml .

helm list

helm rollback hello-helm
```



