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
