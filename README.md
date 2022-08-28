# kubernetes tutorials

## 准备工作

由于我本地环境是 MacOS 11.6.2 Intel 版本，教程也是在本地环境进行。windows 或 linux 环境的小伙伴需要自行安装 docker 和 minikube。

### 安装 docker

因为 docker desktop 各种协议和法律问题，已经不建议大家直接安装 desktop 使用，建议只安装 CLI。注意：如果本地已经安装了 docker desktop，那么可以忽略这一步，下一步也可以简化。

```bash
# Install Docker CLI
brew install docker
brew install docker-compose
```

### 安装 minikube

[minikube](https://minikube.sigs.k8s.io/docs/) 用于在本地环境中运行 Kubernetes 集群。在 macOS 上，minikube 可以基于多种虚拟化技术上，可以选择[hyperkit](https://minikube.sigs.k8s.io/docs/drivers/hyperkit/)，这里因为我本地之前已经安装过 virtualbox (brew install --cask virtualbox)，所以我用的是 virtualbox 虚拟化技术。而且如果你本地之前已经安装了 docker desktop 的话，可以不需要下载 `hyperkit` 或者 `virtualbox`。

>注意：如果本地已经安装了 docker desktop，那么可以使用 minikube start --vm-driver docker --container-runtime=docker 来快速启动 minikube

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

**minikube Cheatsheet**

`minikube stop` 不会删除任何数据，只是停止 VM 和 k8s 集群。

`minikube delete` 删除所有 minikube 启动后的数据。

`minikube ip` 集群和 docker enginer 运行的 IP 地址。

`minikube pause` 暂停当前的资源和集群

`minikube status` 查看当前集群状态

### 安装 k8s CLI 和 Terminal based UI

如果你不想使用 `minikube kubectl` 或者配置相关环境变量来进行下面的教学的话，可以考虑直接安装 `kubectl`。

```shell
brew install kubectl
```

### 注册 docker hub 账号登录

在 docker hun(https://hub.docker.com/) 中注册账号，并且使用 login 登录账号。

```shell
docker login
```

## Container

> Container (容器) 是一种沙盒技术。顾名思义，沙盒就是能够像一个集装箱一样，把你的应用“装”起来的技术。这样，应用与应用之间，就因为有了边界而不至于相互干扰;而被装进集装箱的应用，也可以被方便地搬来搬去。

我们来创建一个后续 k8s 教程需要的容器镜像，首先新建一个 `main.go` 的 golang 文件，里面写的是 `v1` 版本的代码，逻辑很简单，创建一个 `http server`，调用配置端口 `3000` 返回字符串 `[v1] Hello, Kubernetes!`。

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

接下来我们编写 `Dockerfile` 文件，简单的方案当然是直接使用 golang 的 alpine 镜像来打包，但是因为我们后续练习需要频繁的 push image 到 dockerhub 和 pull image 到 kubernetes 中，为了优化网络速度，可以先在 `golang:1.16-buster` 中将上述代码编译成二进制文件，再将二进制文件复制到 `base-debian10` 镜像中运行。

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

echo "hello kubernetes by nginx!" > /usr/share/nginx/html/index.html

kubectl port-forward nginx-pod 4000:80
```

最后可以通过浏览器或者 `curl` 来访问 `http://127.0.0.1:4000` , 查看是否成功启动 `nginx` 和返回字符串 `hello kubernetes by nginx!`。

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

根据我们在 `container` 的那节构建的 `hellok8s:v1` 的镜像，同时参考 `nginx` pod 的资源定义，我们很容易的编写出  `hellok8s:v1`  `pod` 的资源文件。并通过 `port-forward` 到本地的 `3000` 端口进行访问，最终得到字符串 `[v1] Hello, Kubernetes!`。

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

在生产环境中，我们基本上不会直接管理 pod，我们需要 `kubernetes` 来帮助我们来完成一些自动化操作，例如自动扩容或者自动升级版本。可以想象在生产环境中，我们手动部署了 10 个 `hellok8s:v1` 的 pod，这个时候我们需要升级成 `hellok8s:v2` 版本，我们难道需要一个一个的将 `hellok8s:v1` 的 pod 手动升级吗？

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

* 为什么 pod 不就绪 (Ready) 的话，`kubernetes` 不会将流量重定向到该 pod，这是怎么做到的？
* 前面访问服务的方式是通过 `port-forword` 将 pod 的端口暴露到本地，不仅需要写对 pod 的名字，一旦 deployment 重新创建新的 pod，pod 名字和 pod 的 IP 地址也会随之变化，有没有一个地址能让我们稳定访问？
* `port-forword` 的方式需要有权限访问 `kubernetes` 集群才能做到，难道生产环境也能这么做吗？
* 如果部署了多个副本 pod，如何做负载均衡？

`kubernetes` 提供了一种名叫 `Service` 的资源帮助解决这些问题，它为 pod 提供一个稳定的 Endpoint。Servie 位于 pod 的前面，负责接收请求并将它们传递给它后面的所有pod。一旦服务中的 Pod 集合发生更改，Endpoints 就会被更新，请求的重定向自然也会导向最新的 pod。

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

接下来是 `Service` 资源的定义，我们使用 `ClusterIP` 的方式定义 Service，通过 `kubernetes` 集群的内部 IP 暴露服务，当我们只需要让集群中运行的其他应用程序访问我们的pod时，就可以使用这种类型的服务。创建一个 service-hellok8s-clusterip.yaml` 文件。

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

![service-clusterip-fix](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/service-clusterip-fix.png)

除了上述的 `ClusterIp` 的方式外，Kubernetes `ServiceTypes` 允许指定你所需要的 Service 类型，默认是 `ClusterIP`。`Type` 的值包括如下：

- `ClusterIP`：通过集群的内部 IP 暴露服务，选择该值时服务只能够在集群内部访问。 这也是默认的 `ServiceType`。
- [`NodePort`](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)：通过每个节点上的 IP 和静态端口（`NodePort`）暴露服务。 `NodePort` 服务会路由到自动创建的 `ClusterIP` 服务。 通过请求 `<节点 IP>:<节点端口>`，你可以从集群的外部访问一个 `NodePort` 服务。
- [`LoadBalancer`](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)：使用云提供商的负载均衡器向外部暴露服务。 外部负载均衡器可以将流量路由到自动创建的 `NodePort` 服务和 `ClusterIP` 服务上。
- [`ExternalName`](https://kubernetes.io/docs/concepts/services-networking/service/#externalname)：通过返回 `CNAME` 和对应值，可以将服务映射到 `externalName` 字段的内容（例如，`foo.bar.example.com`）。 无需创建任何类型代理。

### NodePort

我们知道`kubernetes` 集群并不是单机运行，它管理着多台节点即 [Node](https://kubernetes.io/docs/concepts/architecture/nodes/)，可以通过每个节点上的 IP 和静态端口（`NodePort`）暴露服务。如下图所示，如果集群内有两台 Node 运行着 `hellok8s:v3`，我们创建一个 `NodePort` 类型的 Service，将 `hellok8s:v3` 的 `3000` 端口映射到 Node 机器的 `30000` 端口 (在 30000-32767 范围内)，就可以通过访问 `http://node1-ip:30000` 或者 `http://node2-ip:30000` 访问到服务。

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

这里因为我们使用的是 `minikube`，可以使用 `minikube tunnel` 来辅助创建 LoadBalancer 的 `EXTERNAL_IP`，具体教程可以查看[官网文档](https://minikube.sigs.k8s.io/docs/handbook/accessing/#loadbalancer-access)，但是和实际云提供商的 LoadBalancer 还是有本质区别，所以 [Repository](https://github.com/guangzhengli/kubernetes_workshop) 不做更多阐述，有条件的可以使用 [AWS](https://aws.amazon.com) 的 [EKS](https://aws.amazon.com/eks/) 集群上创建一个 ELB ([Elastic Load Balancer](https://aws.amazon.com/elasticloadbalancing)) 试试。

下图显示 LoadBalancer 的 Service 架构图。

![service-loadbalancer](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/service-loadbalancer.png)

## ingress

[Ingress](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/#ingress-v1beta1-networking-k8s-io) 公开从集群外部到集群内[服务](https://kubernetes.io/docs/concepts/services-networking/service/)的 HTTP 和 HTTPS 路由。 流量路由由 Ingress 资源上定义的规则控制。Ingress 可为 Service 提供外部可访问的 URL、负载均衡流量、 SSL/TLS，以及基于名称的虚拟托管。你必须拥有一个 [Ingress 控制器](https://kubernetes.io/zh-cn/docs/concepts/services-networking/ingress-controllers) 才能满足 Ingress 的要求。 仅创建 Ingress 资源本身没有任何效果。 [Ingress 控制器](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers) 通常负责通过负载均衡器来实现 Ingress，例如 `minikube` 默认使用的是 [nginx-ingress](https://minikube.sigs.k8s.io/docs/tutorials/nginx_tcp_udp_ingress/)，目前  `minikube` 也支持 [Kong-Ingress](https://minikube.sigs.k8s.io/docs/handbook/addons/kong-ingress/)。

Ingress 可以“简单理解”为服务的网关 Gateway，它是所有流量的入口，经过配置的路由规则，将流量重定向到后端的服务。

在   `minikube` 中，可以通过下面命令开启 Ingress-Controller 的功能。默认使用的是 [nginx-ingress](https://minikube.sigs.k8s.io/docs/tutorials/nginx_tcp_udp_ingress/)。

```shell
minikube addons enable ingress
```

接着删除之前创建的所有 `pod`, `deployment`, `service` 资源。

``` shell
kubectl delete deployment,service --all
```

接着根据之前的教程，创建 `hellok8s:v3` 和 `nginx` 的`deployment`与 `service` 资源。Service 的 type 为 ClusterIP 即可。

`hellok8s:v3` 的端口映射为 `3000:3000`，`nginx` 的端口映射为 `4000:80`，这里后续写 Ingress Route 规则时会用到。

```yaml
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

---

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

```yaml
apiVersion: v1
kind: Service
metadata:
  name: service-nginx-clusterip
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
  - port: 4000
    targetPort: 80

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
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
# service/service-hellok8s-clusterip created
# deployment.apps/hellok8s-deployment created

kubectl apply -f nginx.yaml   
# service/service-nginx-clusterip created
# deployment.apps/nginx-deployment created

kubectl get pods            
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-5d5545b69c-4wvmf   1/1     Running   0          55s
# hellok8s-deployment-5d5545b69c-qcszp   1/1     Running   0          55s
# hellok8s-deployment-5d5545b69c-sn7mn   1/1     Running   0          55s
# nginx-deployment-d47fd7f66-d9r7x       1/1     Running   0          34s
# nginx-deployment-d47fd7f66-hp5nf       1/1     Running   0          34s

kubectl get service
# NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
# service-hellok8s-clusterip   ClusterIP   10.97.88.18      <none>        3000/TCP   77s
# service-nginx-clusterip      ClusterIP   10.103.161.247   <none>        4000/TCP   56s
```

这样在 k8s 集群中，就有 3 个 `hellok8s:v3` 的 pod，2 个 `nginx` 的 pod。并且`hellok8s:v3` 的端口映射为 `3000:3000`，`nginx` 的端口映射为 `4000:80`。在这个基础上，接下来编写 Ingress 资源的定义，`nginx.ingress.kubernetes.io/ssl-redirect: "false"` 的意思是这里关闭 `https` 连接，只使用 `http` 连接。

匹配前缀为 `/hello` 的路由规则，重定向到 `hellok8s:v3` 服务，匹配前缀为 `/` 的跟路径重定向到 `nginx`。

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
          - path: /hello
            pathType: Prefix
            backend:
              service:
                name: service-hellok8s-clusterip
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: service-nginx-clusterip
                port:
                  number: 4000

```

```shell
kubectl apply -f ingress.yaml
# ingress.extensions/hello-ingress created

kubectl get ingress          
# NAME            CLASS   HOSTS   ADDRESS   PORTS   AGE
# hello-ingress   nginx   *                 80      16s

# replace 192.168.59.100 by your minikube ip
curl http://192.168.59.100/hello
# [v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-sn7mn

curl http://192.168.59.100/
# (....Thank you for using nginx.....)
```

上面的教程中将所有流量都发送到 Ingress 中，如下图所示：

![ingress](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/ingress.png)

## Namespace

在实际的开发当中，有时候我们需要不同的环境来做开发和测试，例如 `dev` 环境给开发使用，`test` 环境给 QA 使用，那么 k8s 能不能在不同环境 `dev` `test` `uat` `prod` 中区分资源，让不同环境的资源独立互相不影响呢，答案是肯定的，k8s 提供了名为 Namespace 的资源来帮助隔离资源。

在 Kubernetes 中，**名字空间（Namespace）** 提供一种机制，将同一集群中的资源划分为相互隔离的组。 同一名字空间内的资源名称要唯一，但跨名字空间时没有这个要求。 名字空间作用域仅针对带有名字空间的对象，例如 Deployment、Service 等。

前面的教程中，默认使用的 namespace 是 `default`。

下面展示如何创建一个新的 namespace， `namespace.yaml` 文件定义了两个不同的 namespace，分别是 `dev` 和 `test`。

``` yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  
---

apiVersion: v1
kind: Namespace
metadata:
  name: test
```

可以通过`kubectl apply -f namespaces.yaml` 创建两个新的 namespace，分别是 `dev` 和 `test`。

```yaml
kubectl apply -f namespaces.yaml    
# namespace/dev created
# namespace/test created


kubectl get namespaces          
# NAME              STATUS   AGE
# default           Active   215d
# dev               Active   2m44s
# ingress-nginx     Active   110d
# kube-node-lease   Active   215d
# kube-public       Active   215d
# kube-system       Active   215d
# test              Active   2m44s
```

那么如何在新的 namespace 下创建资源和获取资源呢？只需要在命令后面加上 `-n namespace` 即可。例如根据上面教程中，在名为 `dev` 的 namespace 下创建 `hellok8s:v3` 的 deployment 资源。

```shell
kubectl apply -f deployment.yaml -n dev

kubectl get pods -n dev
```

## Configmap

上面的教程提到，我们在不同环境 `dev` `test` `uat` `prod` 中区分资源，可以让其资源独立互相不受影响，但是随之而来也会带来一些问题，例如不同环境的数据库的地址往往是不一样的，那么如果在代码中写同一个数据库的地址，就会出现问题。

K8S 使用 ConfigMap 来将你的配置数据和应用程序代码分开，将非机密性的数据保存到键值对中。ConfigMap 在设计上不是用来保存大量数据的。在 ConfigMap 中保存的数据不可超过 1 MiB。如果你需要保存超出此尺寸限制的数据，你可能考虑挂载存储卷。

下面我们可以来看一个例子，我们修改之前代码，假设不同环境的数据库地址不同，下面代码从环境变量中获取 `DB_URL`，并将它返回。

```go
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func hello(w http.ResponseWriter, r *http.Request) {
	host, _ := os.Hostname()
	dbURL := os.Getenv("DB_URL")
	io.WriteString(w, fmt.Sprintf("[v4] Hello, Kubernetes! From host: %s, Get Database Connect URL: %s", host, dbURL))
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

构建 `hellok8s:v4` 的镜像，推送到远程仓库。并删除之前创建的所有资源。

```shell
docker build . -t guangzhengli/hellok8s:v4
docker push guangzhengli/hellok8s:v4

kubectl delete deployment,service,ingress --all
```

接下来创建不同 namespace 的 configmap 来存放 `DB_URL`。

创建 `hellok8s-config-dev.yaml` 文件

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hellok8s-config
data:
  DB_URL: "http://DB_ADDRESS_DEV"
```

创建 `hellok8s-config-test.yaml` 文件

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hellok8s-config
data:
  DB_URL: "http://DB_ADDRESS_TEST"
```

分别在 `dev` `test` 两个 namespace 下创建相同的 `ConfigMap`，名字都叫 hellok8s-config，但是存放的 Pair 对中 Value 值不一样。

```shell
kubectl apply -f hellok8s-config-dev.yaml -n dev
# configmap/hellok8s-config created

kubectl apply -f hellok8s-config-test.yaml -n test 
# configmap/hellok8s-config created

kubectl get configmap --all-namespaces
NAMESPACE         NAME                                 DATA   AGE
dev               hellok8s-config                      1      3m12s
test              hellok8s-config                      1      2m1s
```

接着使用 POD 的方式来部署 `hellok8s:v4`，其中 `env.name` 表示的是将 configmap 中的值写进环境变量，这样代码从环境变量中获取 `DB_URL`，这个 KEY 名称必须保持一致。`valueFrom` 代表从哪里读取，`configMapKeyRef` 这里表示从名为 `hellok8s-config` 的 `configMap` 中读取 `KEY=DB_URL` 的 Value。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hellok8s-pod
spec:
  containers:
    - name: hellok8s-container
      image: guangzhengli/hellok8s:v4
      env:
        - name: DB_URL
          valueFrom:
            configMapKeyRef:
              name: hellok8s-config
              key: DB_URL
```

下面分别在 `dev` `test` 两个 namespace 下创建  `hellok8s:v4`，接着通过 `port-forward` 的方式访问不同 namespace 的服务，可以看到返回的 `Get Database Connect URL: http://DB_ADDRESS_TEST` 是不一样的！

```shell
kubectl apply -f hellok8s.yaml -n dev             
# pod/hellok8s-pod created

kubectl apply -f hellok8s.yaml -n test
# pod/hellok8s-pod created

kubectl port-forward hellok8s-pod 3000:3000 -n dev

curl http://localhost:3000
# [v4] Hello, Kubernetes! From host: hellok8s-pod, Get Database Connect URL: http://DB_ADDRESS_DEV

kubectl port-forward hellok8s-pod 3000:3000 -n test

curl http://localhost:3000
# [v4] Hello, Kubernetes! From host: hellok8s-pod, Get Database Connect URL: http://DB_ADDRESS_TEST
```

作业：如果环境变量有很多的话，还需要这样一个一个写吗？去官网找一种将所有环境变量都挂载的方式。

如何代码不是从环境变量中读取数据，而是从文件中读取呢？去官网找一种将 configmap 挂载到容器文件的方式。

## Secret

上面提到，我们会选择以 configmap 的方式挂载配置信息，但是当我们的配置信息需要加密的时候， configmap 就无法满足这个要求。例如上面要挂载数据库密码的时候，就需要明文挂载。

这个时候就需要 Secret 来存储加密信息，虽然在资源文件的编码上，只是通过 Base64 的方式简单编码，但是在实际生产过程中，可以通过 pipeline 或者专业的 [AWS KMS](https://aws.amazon.com/kms/) 服务进行密钥管理。这样就大大减少了安全事故。

> Secret 是一种包含少量敏感信息例如密码、令牌或密钥的对象。由于创建 Secret 可以独立于使用它们的 Pod， 因此在创建、查看和编辑 Pod 的工作流程中暴露 Secret（及其数据）的风险较小。 Kubernetes 和在集群中运行的应用程序也可以对 Secret 采取额外的预防措施， 例如避免将机密数据写入非易失性存储。
>
> 默认情况下，Kubernetes Secret 未加密地存储在 API 服务器的底层数据存储（etcd）中。 任何拥有 API 访问权限的人都可以检索或修改 Secret，任何有权访问 etcd 的人也可以。 此外，任何有权限在命名空间中创建 Pod 的人都可以使用该访问权限读取该命名空间中的任何 Secret； 这包括间接访问，例如创建 Deployment 的能力。
>
> 为了安全地使用 Secret，请至少执行以下步骤：
>
> 1. 为 Secret [启用静态加密](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)；
> 2. [启用或配置 RBAC 规则](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)来限制读取和写入 Secret 的数据（包括通过间接方式）。需要注意的是，被准许创建 Pod 的人也隐式地被授权获取 Secret 内容。
> 3. 在适当的情况下，还可以使用 RBAC 等机制来限制允许哪些主体创建新 Secret 或替换现有 Secret。

Secret 的资源定义和 ConfigMap 结构基本一致，唯一区别在于 kind 是 `Secret`，还有 Value 需要 Base64 编码，你可以通过下面命令快速  Base64 编解码。当然 Secret 也提供了一种 `stringData`，可以不需要 Base64 编码。

```shell
echo "db_password" | base64
# ZGJfcGFzc3dvcmQK

echo "ZGJfcGFzc3dvcmQK" | base64 -d
# db_password
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hellok8s-secret
data:
  DB_PASSWORD: "ZGJfcGFzc3dvcmQK"
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hellok8s-pod
spec:
  containers:
    - name: hellok8s-container
      image: guangzhengli/hellok8s:v4
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: hellok8s-secret
              key: DB_PASSWORD
```

Secret 的使用方法和前面教程中 ConfigMap 基本一致，这里就不再过多赘述。

## Job

在实际的开发过程中，还有一类任务是之前的资源不能满足的，即一次性任务。例如常见的计算任务，只需要拿到相关数据计算后得出结果即可，无需一直运行。而处理这一类任务的资源就是 Job。

> Job 会创建一个或者多个 Pod，并将继续重试 Pod 的执行，直到指定数量的 Pod 成功终止。 随着 Pod 成功结束，Job 跟踪记录成功完成的 Pod 个数。 当数量达到指定的成功个数阈值时，任务（即 Job）结束。 删除 Job 的操作会清除所创建的全部 Pod。 挂起 Job 的操作会删除 Job 的所有活跃 Pod，直到 Job 被再次恢复执行。
>
> 一种简单的使用场景下，你会创建一个 Job 对象以便以一种可靠的方式运行某 Pod 直到完成。 当第一个 Pod 失败或者被删除（比如因为节点硬件失效或者重启）时，Job 对象会启动一个新的 Pod。

下面来看一个 Job 的资源定义，其中 Kind 和 metadata.name 是资源类型和名字就不再解释，`completions` 指的是会创建 Pod 的数量，每个 pod 都会完成下面的任务。`parallelism` 指的是并发执行最大数量，例如下面就会先创建 3 个 pod 并发执行任务，一旦某个 pod 执行完成，就会再创建新的 pod 来执行，直到 5 个 pod 执行完成，Job 才会被标记为完成。

`restartPolicy = "OnFailure` 的含义和 Pod 生命周期相关，Pod 中的容器可能因为退出时返回值非零， 或者容器因为超出内存约束而被杀死等等。 如果发生这类事件，并且 `.spec.template.spec.restartPolicy = "OnFailure"`， Pod 则继续留在当前节点，但容器会被重新运行。因此，你的程序需要能够处理在本地被重启的情况，或者要设置 `.spec.template.spec.restartPolicy = "Never"`。 

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hello-job
spec:
  parallelism: 3
  completions: 5
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: echo
          image: busybox
          command: [for i in 9 8 7 6 5 4 3 2 1 ; do echo $i ; done]
```

通过下面的命令创建 job，可以通过 `kubectl get pods -w` 来观察 job 创建 pod 的过程和结果。最后可以通过 `logs` 命令查看日志。

```shell
kubectl apply -f hello-job.yaml

kubectl get jobs                  
# NAME        COMPLETIONS   DURATION   AGE
# hello-job   5/5           19s        83s

kubectl get pods                      
# NAME                                   READY   STATUS      RESTARTS   AGE
# hello-job--1-5gjjr                     0/1     Completed   0          34s
# hello-job--1-8ffmn                     0/1     Completed   0          26s
# hello-job--1-ltsvm                     0/1     Completed   0          34s
# hello-job--1-mttwv                     0/1     Completed   0          29s
# hello-job--1-ww2qp                     0/1     Completed   0          34s

kubectl logs -f hello-job--1-5gjjr 
# 1
# ...
```

Job 完成时不会再创建新的 Pod，不过已有的 Pod [通常](https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-backoff-failure-policy)也不会被删除。 保留这些 Pod 使得你可以查看已完成的 Pod 的日志输出，以便检查错误、警告或者其它诊断性输出。 可以使用 `kubectl` 来删除 Job（例如 `kubectl delete -f hello-job.yaml`)。当使用 `kubectl` 来删除 Job 时，该 Job 所创建的 Pod 也会被删除。

## CronJob

*CronJob* 可以理解为定时任务，创建基于 Cron 时间调度的 [Jobs](https://kubernetes.ion/docs/concepts/workloads/controllers/job/)。

> CronJob 用于执行周期性的动作，例如备份、报告生成等。 这些任务中的每一个都应该配置为周期性重复的（例如：每天/每周/每月一次）； 你可以定义任务开始执行的时间间隔。

Cron 时间表语法

```
# ┌───────────── 分钟 (0 - 59)
# │ ┌───────────── 小时 (0 - 23)
# │ │ ┌───────────── 月的某天 (1 - 31)
# │ │ │ ┌───────────── 月份 (1 - 12)
# │ │ │ │ ┌───────────── 周的某天 (0 - 6)（周日到周一；在某些系统上，7 也是星期日）
# │ │ │ │ │                          或者是 sun，mon，tue，web，thu，fri，sat
# │ │ │ │ │
# │ │ │ │ │
# * * * * *
```

用法除了需要加上 cron 表达式之外，其余基本和 Job 保持一致。

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello-cronjob
spec:
  schedule: "* * * * *" # Every minute
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: echo
              image: busybox
              command: [for i in 9 8 7 6 5 4 3 2 1 ; do echo $i ; done]
```

使用命令和 Job 也基本保持一致，这里就不过多赘述。

```shell
kubectl apply -f hello-cronjob.yaml
# cronjob.batch/hello-cronjob created

kubectl get cronjob                
# NAME            SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE   AGE
# hello-cronjob   * * * * *   False     0        <none>          8s

kubectl get pods   
# NAME                                   READY   STATUS      RESTARTS   AGE
# hello-cronjob-27694609--1-2nmdx        0/1     Completed   0          15s
```

## Helm(TODO)

经过前面的教程，想必你已经对 kubernetes 的使用有了一定的理解。但是不知道你是否想过这样一个问题，就是我们前面教程中提到的所有资源，包括用 `pod`, `deployment`, `service`, `ingress`, `configmap`,`secret` 所有资源来部署一套完整的 `hellok8s` 服务的话，难道需要一个一个的 `kubectl apply -f` 来创建吗？如果换一个 namespace，或者说换一套 kubernetes 集群部署的话，又要重复性的操作创建的过程吗？

我们平常使用操作系统时，需要安装一个应用的话，可以直接使用 `apt` 或者 `brew` 来直接安装，而不需要关心这个应用需要哪些依赖，哪些配置。在使用 kubernetes 安装应用服务 `hellok8s` 时，我们自然也希望能够一个命令就安装完成，而提供这个能力的，就是 CNCF 的毕业项目 [Helm](https://github.com/helm/helm)。

> Helm 帮助您管理 Kubernetes 应用—— Helm Chart，Helm 是查找、分享和使用软件构建 [Kubernetes](https://kubernetes.io/) 的最优方式。
>
> 复杂性管理 ——即使是最复杂的应用，Helm Chart 依然可以描述， 提供使用单点授权的可重复安装应用程序。
>
> 易于升级 ——随时随地升级和自定义的钩子消除您升级的痛苦。
>
> 分发简单 —— Helm Chart 很容易在公共或私有化服务器上发版，分发和部署站点。
>
> 回滚 —— 使用 `helm rollback` 可以轻松回滚到之前的发布版本。

我们通过 brew 来安装 helm。更多方式可以参考[官方文档](https://helm.sh/zh/docs/intro/install/)。

```shell
brew install helm
```

Helm 的使用方式可以解释为：Helm 安装 *charts* 到 Kubernetes 集群中，每次安装都会创建一个新的 *release*。你可以在 Helm 的 chart *repositories* 中寻找新的 chart。

### 安装 hellok8s chart 快速开始(TODO)

//TODO

### 创建 helm charts

我们来手把手创建一个自己的 helm charts，完成我们之前的那些功能。

使用 `helm create` 命令默认会帮你创建一些 k8s 资源定义的初始文件，如下所示：

```
helm create hello-helm

.
├── Chart.yaml
├── _helpers.tpl
├── charts
├── templates
│   ├── hellok8s-configmaps.yaml
│   ├── hellok8s-deployment.yaml
│   ├── hellok8s-service.yaml
│   ├── ingress.yaml
│   ├── nginx-deployment.yaml
│   └── nginx-service.yaml
└── values.yaml
```

而我们删减一下这些文件，用之前教程中 ingress + configmaps 那节中的资源文件替代它，最终的结构长这样：

```
.
├── Chart.yaml
├── _helpers.tpl
├── charts
├── templates
│   ├── hellok8s-configmaps.yaml
│   ├── hellok8s-deployment.yaml
│   ├── hellok8s-service.yaml
│   ├── ingress.yaml
│   ├── nginx-deployment.yaml
│   └── nginx-service.yaml
└── values.yaml
```

其中 `hellok8s-configmaps.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hellok8s-config
data:
  DB_URL: "http://DB_ADDRESS_DEV"
```

`hellok8s-deployment.yaml`

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
        - image: guangzhengli/hellok8s:v4
          name: hellok8s-container
          env:
            - name: DB_URL
              valueFrom:
                configMapKeyRef:
                  name: hellok8s-config
                  key: DB_URL
```

`hellok8s-service.yaml`

```yaml
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

`ingress.yaml`

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
          - path: /hello
            pathType: Prefix
            backend:
              service:
                name: service-hellok8s-clusterip
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: service-nginx-clusterip
                port:
                  number: 4000
```

`nginx-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
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

`nginx-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: service-nginx-clusterip
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
  - port: 4000
    targetPort: 80
```

`Chart.yaml`

```yaml
apiVersion: v2
name: hello-helm
description: A k8s tutorials in https://github.com/guangzhengli/k8s-tutorials
type: application
version: 0.1.0
appVersion: "1.16.0"

```

在 `hello-helm` 的跟路径下执行命令进行安装 chart，执行 curl 命令便能直接得到结果！查看 pod 和 service 等资源，便会发现 helm 能一键安装所有资源！

```shell
helm upgrade --install hello-helm --values values.yaml .

curl http://192.168.59.100/hello
#[v4] Hello, Kubernetes! From host: hellok8s-deployment-f88f984c6-nzwg6, Get Database Connect URL: http://DB_ADDRESS_DEV

kubectl get pods
# NAME                                  READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-f88f984c6-k8hpz   1/1     Running   0          32m
# hellok8s-deployment-f88f984c6-nzwg6   1/1     Running   0          32m
# hellok8s-deployment-f88f984c6-s89s7   1/1     Running   0          32m
# nginx-deployment-d47fd7f66-6w76b      1/1     Running   0          32m
# nginx-deployment-d47fd7f66-tsqj5      1/1     Running   0          32m
```

### 上传和下载其它 helm chart 使用 (TODO)

//TODO

## Dashboard(TODO)

//TODO: 介绍 kubernetes dashboard

### K9s(TODO)

//TODO: 介绍 k9s client

![83ybd4](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/83ybd4.png)
