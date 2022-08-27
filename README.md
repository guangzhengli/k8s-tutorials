# Kubenates workshop

- [Kubenates workshop](#kubenates-workshop)
  - [准备工作](#准备工作)
    - [安装 docker](#安装-docker)
    - [安装 minikube](#安装-minikube)
    - [安装 k8s CLI 和 Terminal based UI](#安装-k8s-cli-和-terminal-based-ui)
    - [注册 docker hub 账号登录](#注册-docker-hub-账号登录)
  - [Container](#container)
  - [Pod](#pod)
    - [Pod 与 Container 的不同](#pod-与-container-的不同)
    - [Pod 其它命令](#pod-其它命令)
    - [作业一：Hellok8s Pod](#作业一hellok8s-pod)
  - [Deployment](#deployment)
    - [扩容](#扩容)
    - [升级版本](#升级版本)
    - [Rolling Update(滚动更新)](#rolling-update滚动更新)
    - [存活 / 就绪探针](#存活--就绪探针)
    - [Automatically blocking bad releases by readinessProbe](#automatically-blocking-bad-releases-by-readinessprobe)
  - [Service](#service)
  - [ingress](#ingress)
  - [Configmap](#configmap)
    - [env var](#env-var)
    - [configmap](#configmap-1)
    - [Getting all the variables from a ConfigMap](#getting-all-the-variables-from-a-configmap)
    - [Exposing ConfigMap as files](#exposing-configmap-as-files)
  - [Secret](#secret)
    - [Using stringData](#using-stringdata)
  - [helm](#helm)

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

 `docker build`  完成后我们可以通过 `docker images` 查看镜像基础信息，执行 `docker run` 命令将容器启动， `-p` 指定 `3000` 作为端口，`-d` 指定刚打包成功的镜像名称。

```shell
docker run -p 3000:3000 --name hellok8s -d guangzhengli/hellok8s:v1
```

运行成功后，可以通过浏览器或者 `curl` 来访问 `http://127.0.0.1:3000` , 查看是否成功返回字符串 `[v1] Hello, Kubernetes!`。

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

```go
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

这个时候我们就需要滚动更新 (rolling update)，在保证新版本 `v2` 的 pod 还没有 `ready` 之前，先不删除 `v1` 版本的 pod。

在 deployment 的资源定义中, `spec.strategy.type` 有两种选择:

- **RollingUpdate:** 逐渐增加新版本的 pod，逐渐减少旧版本的 pod。
- **Recreate:** 在新版本的 pod 增加前，先将所有旧版本 pod 删除。

大多数情况下我们会采用滚动更新 (RollingUpdate) 的方式，滚动更新又可以通过 `maxSurge` 和 `maxUnavailable` 字段来控制升级 pod 的速率，具体可以详细看[官网定义](https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/deployment/)。：

- [**maxSurge:**](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#max-surge) 最大峰值，用来指定可以创建的超出期望 Pod 个数的 Pod 数量。
- [**maxUnavailable:**](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#max-unavailable,) 最大不可用，用来指定更新过程中不可用的 Pod 的个数上限。

我们先输入命令回滚我们的 deployment，输入 `kubectl describe pod` 会发现 deployment 已经把 `v2` 版本的 pod 回滚到 ` v1` 的版本。

``` shell
kubectl rollout undo deployment hellok8s-deployment

kubectl get pods                                    
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-77bffb88c5-cvm5c   1/1     Running   0          39s
# hellok8s-deployment-77bffb88c5-lktbl   1/1     Running   0          41s
# hellok8s-deployment-77bffb88c5-nh82z   1/1     Running   0          37s

kubectl describe pod hellok8s-deployment-77bffb88c5-cvm5c
# Image: guangzhengli/hellok8s:v1
```

除了上面的命令，还可以用 `history` 来查看历史版本，`--to-revision=2` 来回滚到指定版本。

```shell
kubectl rollout history deployment hellok8s-deployment
kubectl rollout undo deployment/hellok8s-deployment --to-revision=2
```

接着设置 `strategy=rollingUpdate` , `maxSurge=1` , `maxUnavailable=1` 和 `replicas=3`  到 deployment.yaml 文件中。这个参数配置意味着最大可能会创建 4 个 hellok8s pod (replicas + maxSurge)，最小会有 2 个 hellok8s pod 存活 (replicas - maxUnavailable)。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s-deployment
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

![rollingupdate](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/rollingupdate.png)

### 存活探针 (livenessProb)

> 存活探测器来确定什么时候要重启容器。 例如，存活探测器可以探测到应用死锁（应用程序在运行，但是无法继续执行后面的步骤）情况。 重启这种状态下的容器有助于提高应用的可用性，即使其中存在缺陷。-- [LivenessProb](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

在生产中，有时候因为某些 bug 导致应用死锁或者线程耗尽了，最终会导致应用无法继续提供服务，这个时候如果没有手段来自动监控和处理这一问题的话，可能会导致很长一段时间无人发现。[kubelet](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) 使用存活探测器 (livenessProb) 来确定什么时候要重启容器。

接下来我们写一个 `/healthz` 接口来说明 `livenessProb` 如何使用。 `/healthz` 接口会在启动成功的 15s 内正常返回 200 状态码，在 15s 后，会一直返回 500 的状态码。

```go
package main

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

func hello(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "[v2] Hello, Kubernetes!")
}

func main() {
	started := time.Now()
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		duration := time.Since(started)
		if duration.Seconds() > 15 {
			w.WriteHeader(500)
			w.Write([]byte(fmt.Sprintf("error: %v", duration.Seconds())))
		} else {
			w.WriteHeader(200)
			w.Write([]byte("ok"))
		}
	})

	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

```yaml
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

`Dockerfile` 的编写和原来保持一致，我们把 `tag` 修改为 `liveness` 并推送到远程仓库。

```shell
docker build . -t guangzhengli/hellok8s:liveness
docker push guangzhengli/hellok8s:liveness
```

最后编写 deployment 的定义，这里使用存活探测方式是使用 HTTP GET 请求，请求的是刚才定义的 `/healthz` 接口，`periodSeconds` 字段指定了 kubelet 每隔 3 秒执行一次存活探测。 `initialDelaySeconds` 字段告诉 kubelet 在执行第一次探测前应该等待 3 秒。如果服务器上 `/healthz` 路径下的处理程序返回成功代码，则 kubelet 认为容器是健康存活的。 如果处理程序返回失败代码，则 kubelet 会杀死这个容器并将其重启。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s-deployment
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
        - image: guangzhengli/hellok8s:liveness
          name: hellok8s-container
          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 3
            periodSeconds: 3
```

通过 `get` 或者 `describe` 命令可以发现 pod 一直处于重启当中。

```shell
kubectl apply -f deployment.yaml

kubectl get pods
# NAME                                   READY   STATUS    RESTARTS     AGE
# hellok8s-deployment-5995ff9447-d5fbz   1/1     Running   4 (6s ago)   102s
# hellok8s-deployment-5995ff9447-gz2cx   1/1     Running   4 (5s ago)   101s
# hellok8s-deployment-5995ff9447-rh29x   1/1     Running   4 (6s ago)   102s

kubectl describe pod hellok8s-68f47f657c-zwn6g

# ...
# ...
# ...
# Events:
#  Type     Reason     Age                   From               Message
#  ----     ------     ----                  ----               -------
#  Normal   Scheduled  12m                   default-scheduler  Successfully assigned default/hellok8s-deployment-5995ff9447-rh29x to minikube
#  Normal   Pulled     11m (x4 over 12m)     kubelet            Container image "guangzhengli/hellok8s:liveness" already present on machine
#  Normal   Created    11m (x4 over 12m)     kubelet            Created container hellok8s-container
#  Normal   Started    11m (x4 over 12m)     kubelet            Started container hellok8s-container
#  Normal   Killing    11m (x3 over 12m)     kubelet            Container hellok8s-container failed liveness probe, will be restarted
#  Warning  Unhealthy  11m (x10 over 12m)    kubelet            Liveness probe failed: HTTP probe failed with statuscode: 500
#  Warning  BackOff    2m41s (x36 over 10m)  kubelet            Back-off restarting failed container
```

### 就绪探针 (readiness)

> 就绪探测器可以知道容器何时准备好接受请求流量，当一个 Pod 内的所有容器都就绪时，才能认为该 Pod 就绪。 这种信号的一个用途就是控制哪个 Pod 作为 Service 的后端。 若 Pod 尚未就绪，会被从 Service 的负载均衡器中剔除。-- [ReadinessProb](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

在生产环境中，升级服务的版本是日常的需求，这时我们需要考虑一种场景，即当发布的版本存在问题，就不应该让它升级成功。kubelet 使用就绪探测器可以知道容器何时准备好接受请求流量，当一个 pod 升级后不能就绪，即不应该让流量进入该 pod，在配合 `rollingUpate` 的功能下，也不能允许升级版本继续下去，否则服务会出现全部升级完成，导致所有服务均不可用的情况。

这里我们把服务回滚到 `hellok8s:v2` 的版本，可以通过上面学习的方法进行回滚。

```shell
kubectl rollout undo deployment hellok8s-deployment --to-revision=2
```

这里我们将应用的 `/healthz` 接口直接设置成返回 500 状态码，代表该版本是一个有问题的版本。

```go
package main

import (
	"io"
	"net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
	io.WriteString(w, "[v2] Hello, Kubernetes!")
}

func main() {
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(500)
	})

	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

在 `build` 阶段我们将 `tag` 设置为 `bad`，打包后 push 到远程仓库。

``` shell
docker build . -t guangzhengli/hellok8s:bad

docker push guangzhengli/hellok8s:bad
```

接着编写 deployment 资源文件，[Probe](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/#probe-v1-core) 有很多配置字段，可以使用这些字段精确地控制就绪检测的行为：

- `initialDelaySeconds`：容器启动后要等待多少秒后才启动存活和就绪探测器， 默认是 0 秒，最小值是 0。
- `periodSeconds`：执行探测的时间间隔（单位是秒）。默认是 10 秒。最小值是 1。
- `timeoutSeconds`：探测的超时后等待多少秒。默认值是 1 秒。最小值是 1。
- `successThreshold`：探测器在失败后，被视为成功的最小连续成功数。默认值是 1。 存活和启动探测的这个值必须是 1。最小值是 1。
- `failureThreshold`：当探测失败时，Kubernetes 的重试次数。 对存活探测而言，放弃就意味着重新启动容器。 对就绪探测而言，放弃意味着 Pod 会被打上未就绪的标签。默认值是 3。最小值是 1。

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hellok8s-deployment
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
        - image: guangzhengli/hellok8s:bad
          name: hellok8s-container
          readinessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 1
            successThreshold: 5
```

通过 `get` 命令可以发现两个 pod 一直处于还没有 Ready 的状态当中，通过 `describe` 命令可以看到是因为 `Readiness probe failed: HTTP probe failed with statuscode: 500` 的原因。又因为设置了最小不可用的服务数量为`maxUnavailable=1`，这样能保证剩下两个 `v2` 版本的 `hellok8s` 能继续提供服务！

```shell
kubectl apply -f deployment.yaml

kubectl get pods                
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-66799848c4-8xzsz   1/1     Running   0          102s
# hellok8s-deployment-66799848c4-m9dl5   1/1     Running   0          102s
# hellok8s-deployment-9c57c7f56-rww7k    0/1     Running   0          26s
# hellok8s-deployment-9c57c7f56-xt9tw    0/1     Running   0          26s


kubectl describe pod hellok8s-deployment-9c57c7f56-rww7k
# Events:
#   Type     Reason     Age                From               Message
#   ----     ------     ----               ----               -------
#   Normal   Scheduled  74s                default-scheduler  Successfully assigned default/hellok8s-deployment-9c57c7f56-rww7k to minikube
#   Normal   Pulled     73s                kubelet            Container image "guangzhengli/hellok8s:bad" already present on machine
#   Normal   Created    73s                kubelet            Created container hellok8s-container
#   Normal   Started    73s                kubelet            Started container hellok8s-container
#   Warning  Unhealthy  0s (x10 over 72s)  kubelet            Readiness probe failed: HTTP probe failed with statuscode: 500
```

## Service

经过前面几节的练习，可能你会有一些疑惑：

* 为什么 pod 不就绪 (Ready) 的话，`kubenates` 不会将流量重定向到该 pod，这是怎么做到的？
* 前面访问服务的方式是通过 `port-forword` 将 pod 的端口暴露到本地，不仅需要写对 pod 的名字，一旦 deployment 重新创建新的 pod，pod 名字和 pod 的 IP 地址也会随之变化，有没有一个地址能让我们稳定访问？
* `port-forword` 的方式需要有权限访问 `kubenates` 集群才能做到，难道生产环境也能这么做吗？
* 如果部署了多个副本 pod，如何做负载均衡？

`kubenates` 提供了一种名叫 `Service` 的资源帮助解决这些问题，它为 pod 提供一个稳定的 Endpoint。Servie 位于 pod 的前面，负责接收请求并将它们传递给它后面的所有pod。一旦服务中的 Pod 集合发生更改，Endpoints 就会被更新，请求的重定向自然也会导向最新的 pod。

### ClusterIP

我们先来看看 `Service` 默认使用的 `ClusterIP` 类型，首先做一些准备工作，在之前的 `hellok8s:v2` 版本上加上返回当前服务所在的 `hostname` 功能，升级到 `v3` 版本。

``` go
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func hello(w http.ResponseWriter, r *http.Request) {
	host, _ := os.Hostname()
	io.WriteString(w, fmt.Sprintf("[v3] Hello, Kubernetes!, From host: %s", host))
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

`Dockerfile` 和之前保持一致，打包 `tag=v3` 并推送到远程仓库。

``` shell
docker build . -t guangzhengli/hellok8s:v3

docker push guangzhengli/hellok8s:v3
```

修改 deployment 的 `hellok8s` 为 `v3` 版本。执行 `kubectl apply -f deployment.yaml` 更新 deployment。

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
        - image: guangzhengli/hellok8s:v3
          name: hellok8s-container
```

接下来是 `Service` 资源的定义，我们使用 `ClusterIP` 的方式定义 Service，通过 `kubenates` 集群的内部 IP 暴露服务，当我们只需要让集群中运行的其他应用程序访问我们的pod时，就可以使用这种类型的服务。创建一个 service-hellok8s-clusterip.yaml` 文件。

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: service-hellok8s-clusterip
spec:
  type: ClusterIP
  selector:
    app: hellok8s
  ports:
  - port: 3000
    targetPort: 3000
```

```shell
kubectl apply -f service-hellok8s-clusterip.yaml

kubectl get service
# NAME                         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# service-hellok8s-clusterip   ClusterIP   10.104.96.153   <none>        3000/TCP   10s
```

我们可以通过在集群其它应用中访问 `service-hellok8s-clusterip` 的 IP 地址 `10.104.96.153` 来访问 `hellok8s:v3` 服务。

这里通过在集群内创建一个 `nginx` 来访问。创建后进入 `nginx` 容器来用 `curl` 命令访问 `service-hellok8s-clusterip` 。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
    - name: nginx-container
      image: nginx
```

```shell
kubectl get pods
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-5d5545b69c-24lw5   1/1     Running   0          27m
# hellok8s-deployment-5d5545b69c-9g94t   1/1     Running   0          27m
# hellok8s-deployment-5d5545b69c-9gm8r   1/1     Running   0          27m
# nginx                                  1/1     Running   0          41m

kubectl get service
# NAME                         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# service-hellok8s-clusterip   ClusterIP   10.104.96.153   <none>        3000/TCP   10s

kubectl exec -it nginx-pod /bin/bash
# root@nginx-pod:/# curl 10.104.96.153:3000
# [v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-9gm8r
# root@nginx-pod:/# curl 10.104.96.153:3000
#[v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-9g94t
```

可以看到，我们多次 `curl 10.104.96.153:3000` 访问 `hellok8s` Service IP 地址，返回的 `hellok8s:v3` `hostname` 不一样，说明 Service 可以接收请求并将它们传递给它后面的所有 pod，还可以自动负载均衡。你也可以试试增加或者减少 `hellok8s:v3` pod 副本数量，观察 Service 的请求是否会动态变更。调用过程如下图所示：

![service-clusterip](/Users/guangzheng.li/Downloads/service-clusterip.png)

除了上述的 `ClusterIp` 的方式外，Kubernetes `ServiceTypes` 允许指定你所需要的 Service 类型，默认是 `ClusterIP`。`Type` 的值包括如下：

- `ClusterIP`：通过集群的内部 IP 暴露服务，选择该值时服务只能够在集群内部访问。 这也是默认的 `ServiceType`。
- [`NodePort`](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)：通过每个节点上的 IP 和静态端口（`NodePort`）暴露服务。 `NodePort` 服务会路由到自动创建的 `ClusterIP` 服务。 通过请求 `<节点 IP>:<节点端口>`，你可以从集群的外部访问一个 `NodePort` 服务。
- [`LoadBalancer`](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)：使用云提供商的负载均衡器向外部暴露服务。 外部负载均衡器可以将流量路由到自动创建的 `NodePort` 服务和 `ClusterIP` 服务上。
- [`ExternalName`](https://kubernetes.io/docs/concepts/services-networking/service/#externalname)：通过返回 `CNAME` 和对应值，可以将服务映射到 `externalName` 字段的内容（例如，`foo.bar.example.com`）。 无需创建任何类型代理。

### NodePort

我们知道`kubenates` 集群并不是单机运行，它管理着多台节点即 [Node](https://kubernetes.io/docs/concepts/architecture/nodes/)，可以通过每个节点上的 IP 和静态端口（`NodePort`）暴露服务。如下图所示，如果集群内有两台 Node 运行着 `hellok8s:v3`，我们创建一个 `NodePort` 类型的 Service，将 `hellok8s:v3` 的 `3000` 端口映射到 Node 机器的 `30000` 端口 (在 30000-32767 范围内)，就可以通过访问 `http://node1-ip:30000` 或者 `http://node2-ip:30000` 访问到服务。

![service-nodeport-final](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/service-nodeport-final.png)

这里以 `minikube` 为例，我们可以通过 `minikube ip` 命令拿到 k8s cluster node  IP地址。下面的教程都以我本机的 `192.168.59.100` 为例，需要替换成你的 IP 地址。

```shell
minikube ip
# 192.168.59.100
```

接着以 NodePort 的 ServiceType 创建一个 Service 来接管 pod 流量。通过`minikube` 节点上的 IP `192.168.59.100` 暴露服务。 `NodePort` 服务会路由到自动创建的 `ClusterIP` 服务。 通过请求 `<节点 IP>:<节点端口>` -- `192.168.59.100`:30000，你可以从集群的外部访问一个 `NodePort` 服务，最终重定向到 `hellok8s:v3` 的 `3000` 端口。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: service-hellok8s-nodeport
spec:
  type: NodePort
  selector:
    app: hellok8s
  ports:
  - port: 3000
    nodePort: 30000
```

创建 `service-hellok8s-nodeport` Servcie 后，使用 `curl` 命令或者浏览器访问 `http://192.168.59.100:30000` 可以得到结果。

```shell
kubectl apply -f service-hellok8s-nodeport.yaml

kubectl get service
# NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
# service-hellok8s-nodeport    NodePort    10.109.188.161   <none>        3000:30000/TCP   28s

kubectl get pods
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-5d5545b69c-24lw5   1/1     Running   0          27m
# hellok8s-deployment-5d5545b69c-9g94t   1/1     Running   0          27m
# hellok8s-deployment-5d5545b69c-9gm8r   1/1     Running   0          27m

curl http://192.168.59.100:30000
# [v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-9g94t

curl http://192.168.59.100:30000
# [v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-24lw5
```

### LoadBalancer

[`LoadBalancer`](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer) 是使用云提供商的负载均衡器向外部暴露服务。 外部负载均衡器可以将流量路由到自动创建的 `NodePort` 服务和 `ClusterIP` 服务上，假如你在 [AWS](https://aws.amazon.com) 的 [EKS](https://aws.amazon.com/eks/) 集群上创建一个 Type 为 `LoadBalancer`  的 Service。它会自动创建一个 ELB ([Elastic Load Balancer](https://aws.amazon.com/elasticloadbalancing)) ，并可以根据配置的 IP 池中自动分配一个独立的 IP 地址，可以供外部访问。

这里因为我们使用的是 `minikube`，可以使用 `minikube tunnel` 来辅助创建 LoadBalancer 的 `EXTERNAL_IP`，具体教程可以查看[官网文档](https://minikube.sigs.k8s.io/docs/handbook/accessing/#loadbalancer-access)，但是和实际云提供商的 LoadBalancer 还是有本质区别，所以 [Repository](https://github.com/guangzhengli/kubenates_workshop) 不做更多阐述，有条件的可以使用 [AWS](https://aws.amazon.com) 的 [EKS](https://aws.amazon.com/eks/) 集群上创建一个 ELB ([Elastic Load Balancer](https://aws.amazon.com/elasticloadbalancing)) 试试。

下图显示 LoadBalancer 的 Service 架构图。

![service-loadbalancer](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/service-loadbalancer.png)

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



