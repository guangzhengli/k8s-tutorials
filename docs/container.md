---
prev:
  text: 'Pre'
  link: '/docs/pre'
next:
  text: 'Pod'
  link: '/docs/pod'
---

# Container

我们的旅程从一段代码开始。新建一个 `main.go` 文件，复制下面的代码到文件中。

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

上面是一串用 [Go](https://go.dev/) 写的代码，代码逻辑非常的简单，首先启动 HTTP 服务器，监听 `3000` 端口，当访问路由 `/`的时候 返回字符串 `[v1] Hello, Kubernetes!`。

在以前，如果你想将这段代码运行起来并测试一下。你首先需要懂得如何下载 golang 的安装包进行安装，接着需要懂得 `golang module` 的基本使用，最后还需要了解 golang 的编译和运行命令，才能将该代码运行起来。甚至在过程中，可能会因为环境变量问题、操作系统问题、处理器架构等问题导致编译或运行失败。

但是通过 Container (容器) 技术，只需要上面的代码，附带着对应的容器 `Dockerfile` 文件，那么你就不需要 golang 的任何知识，也能将代码顺利运行起来。

> Container (容器) 是一种沙盒技术。它是基于 Linux 中 Namespace / Cgroups / chroot 等技术结合而成，更多技术细节可以参看这个视频 [如何自己实现一个容器](https://www.youtube.com/watch?v=8fi7uSYlOdc)。

下面就是 Go 代码对应的 `Dockerfile`，简单的方案是直接使用 golang 的 alpine 镜像来打包，但是因为我们后续练习需要频繁的推送镜像到 DockerHub 和拉取镜像到 k8s 集群中，为了优化网络速度，我们选择先在 `golang:1.16-buster` 中将上述 Go 代码编译成二进制文件，再将二进制文件复制到 `base-debian10` 镜像中运行 (Dockerfile 不理解没有关系，不影响后续教程学习)。

这样我们可以将 300MB 大小的镜像变成只有 20MB 的镜像，甚至压缩上传到 DockerHub 后大小只有 10MB！

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

需要注意 `main.go` 文件需要和 `Dockerfile` 文件在同一个目录下，执行下方 `docker build` 命令，第一次需要耐心等待拉取基础镜像。并且**需要注意将 `guangzhengli` 替换成自己的 `DockerHub` 账号名称**。 这样我们后续可以推送镜像到自己注册的  `DockerHub` 仓库当中。

```shell
docker build . -t guangzhengli/hellok8s:v1
# Step 1/11 : FROM golang:1.16-buster AS builder
# ...
# ...
# Step 11/11 : ENTRYPOINT ["/main"]
# Successfully tagged guangzhengli/hellok8s:v1


docker images
# guangzhengli/hellok8s          v1         f956e8cf7d18   8 days ago      25.4MB
```

 `docker build`  命令完成后我们可以通过 `docker images` 命令查看镜像是否 build 成功，最后我们执行 `docker run` 命令将容器启动， `-p` 指定 `3000` 作为端口，`-d` 指定刚打包成功的镜像名称。

```shell
docker run -p 3000:3000 --name hellok8s -d guangzhengli/hellok8s:v1
```

运行成功后，可以通过浏览器或者 `curl` 来访问 `http://127.0.0.1:3000` , 查看是否成功返回字符串 `[v1] Hello, Kubernetes!`。

这里因为我本地只用 Docker CLI，而 docker runtime 是使用 `minikube`，所以我需要先调用  `minikube ip` 来返回 minikube IP 地址，例如返回了 `192.168.59.100`，所以我需要访问  `http://192.168.59.100:3000` 来判断是否成功返回字符串 `[v1] Hello, Kubernetes!`。

最后确认没有问题，使用 `docker push` 将镜像上传到远程的 `DockerHub` 仓库当中，这样可以供他人下载使用，也方便后续  `Minikube` 下载镜像使用。  **需要注意将 `guangzhengli` 替换成自己的 `DockerHub` 账号名称**。

```shell
docker push guangzhengli/hellok8s:v1
```

经过这一节的练习，有没有对容器的强大有一个初步的认识呢？可以想象当你想部署一个更复杂的服务时，例如 Nginx，MySQL，Redis。你只需要到 [DockerHub 搜索](https://hub.docker.com/search?q=) 中搜索对应的镜像，通过 `docker pull` 下载镜像，`docker run` 启动服务即可！而无需关系依赖和各种配置！
