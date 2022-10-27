<h1 align=center>Kubernetes Tutorials ｜ k8s 教程</h1>

[![GitHub forks](https://img.shields.io/github/forks/guangzhengli/k8s-tutorials)](https://github.com/guangzhengli/k8s-tutorials/network)[![GitHub stars](https://img.shields.io/github/stars/guangzhengli/k8s-tutorials)](https://github.com/guangzhengli/k8s-tutorials/stargazers)[![GitHub issues](https://img.shields.io/github/issues/guangzhengli/k8s-tutorials)](https://github.com/guangzhengli/k8s-tutorials/issues)[![GitHub license](https://img.shields.io/github/license/guangzhengli/k8s-tutorials)](https://github.com/guangzhengli/k8s-tutorials/blob/main/LICENSE)

<h4 align=center>🌈 Kubernetes | 📰 Tutorials</h4>

K8s as a cloud-native operating system, the need to learn it speaks for itself, if you encounter any problems, you can comment in [Discussions]((https://github.com/guangzhengli/k8s-tutorials/discussions)) or Issue, if you think this repository is valuable to you, welcome to star or raise PR / Issue to make it better!

Before learning this tutorial, you need to note that this tutorial focuses on practical guidance to modify the code in an incremental way, starting from the most basic container definition, through `pod`, `deployment`, `service`, `ingress`, `configmap`, `secret` and other resources until the `helm` to packaged deployment of a complete set of services. So if you don't know much about the basics of containers and k8s, it is recommended to get the basic theoretical knowledge from the [official documentation]((https://kubernetes.io/docs/home/)) or other tutorials first, and then deepen your mastery of the knowledge through real-life practice!

Here is the index of this document：
* [Preparation](docs/pre.md)
* [container](docs/container.md)
* [pod](docs/pod.md)
* [deployment](docs/deployment.md)
* [service](docs/service.md)
* [ingress](docs/ingress.md)
* [namespace](docs/namespace.md)
* [configmap](docs/configmap.md)
* [secret](docs/secret.md)
* [job/cronjob](docs/job.md)
* [helm](docs/helm.md)
* [dashboard](docs/dashboard.md)
* Translate English(unfinished)

# kubernetes tutorials

## Preparation

Before starting this tutorial, you need to configure your local environment. Here are the dependencies and packages that need to be installed.

### Install docker

First we need to install `docker` to package the image, if you already have `docker` installed locally, then you can choose to skip this section.

#### Recommended installation method

The easiest way to install docker is to use [Docker Desktop](https://www.docker.com/products/docker-desktop/) currently, just open the official website and download the package that corresponds to your computer's operating system (https://www.docker.com/products/docker-desktop/)

When the installation is complete, you can quickly verify that the installation was successful by using `docker run hello-world`!

#### Other installation methods

Currently, Docker has announced that [Docker Desktop](https://www.docker.com/products/docker-desktop/) is only free for individual developers or small groups (no longer free for large companies from 2021), so if you can't install `docker` via [Docker Desktop](https://www.docker.com/products/docker-desktop/), you can refer to [this article](https://dhwaneetbhatt.com/blog/run-docker-) to download and install `docker`. without-docker-desktop-on-macos) to install only the [Docker CLI](https://github.com/docker/cli).

### Install minikube

We also need to build a local cluster of k8s (either using a cloud vendor or another k8s cluster). The recommended way to build a local k8s cluster is to use [minikube](https://minikube.sigs.k8s.io/docs/).

You can download and install according to [minikube quick install](https://minikube.sigs.k8s.io/docs/start/), here is a brief list of MacOS installation, Linux & Windows OS can refer to [official documentation](https://minikube.sigs.k8s.io/docs/start/) for a quick installation.

```shell
brew install minikube
```

#### Start minikube

Because minikube supports many containers and virtualization technologies ([Docker](https://minikube.sigs.k8s.io/docs/drivers/docker/), [Hyperkit](https://minikube.sigs.k8s.io/docs/drivers/hyperkit/), [Hyper-V](https://minikube.sigs.k8s.io/docs/drivers/hyperv/), [KVM](https://minikube.sigs.k8s.io/docs/drivers/kvm2/), [Parallels](https://minikube.sigs.k8s.io/docs/drivers/parallels/), [Podman](https://minikube.sigs.k8s.io/docs/drivers/podman/), [VirtualBox](https://minikube.sigs.k8s.io/docs/drivers/virtualbox/), or [VMware Fusion/Workstation](https://minikube.sigs.k8s.io/docs/drivers/vmware/)), is also the place where the problem appears more often, so it is better to explain it here a little.

If you are using the `docker` solution recommended above [Docker Desktop](https://www.docker.com/products/docker-desktop/), then you can start minikube with the following command and wait patiently for the dependencies to download.

```shell
minikube start --vm-driver docker --container-runtime=docker
```

When you're done, run `minikube status` to check the current status to make sure it started successfully!

If you only have the Docker CLI locally, and the criterion is that if you execute a command like `docker ps` and it returns the error `Cannot connect to the Docker daemon at unix:///Users/xxxx/.colima/docker.sock. daemon running?` Then you need to run the following command.

```shell
brew install hyperkit
minikube start --vm-driver hyperkit --container-runtime=docker

# Tell Docker CLI to talk to minikube's VM
eval $(minikube docker-env)

# Save IP to a hostname
echo "`minikube ip` docker.local" | sudo tee -a /etc/hosts > /dev/null

# Test
docker run hello-world
```

**minikube command quick search**

`minikube stop` Does not delete any data, just stops the VM and k8s cluster.

`minikube delete` Delete all minikube data after startup.

`minikube ip` View the IP address where the cluster and docker engine are running.

`minikube pause` Suspend current resources and k8s clusters

`minikube status` View current cluster status

### Install kubectl

This step is optional, if not installed, all subsequent `kubectl` related commands will be replaced by the `minikube kubectl` command.

If you don't want to use `minikube kubectl` or configure the relevant environment variables for the following tutorial, you can consider installing `kubectl` directly.

```shell
brew install kubectl
```

### Register a docker hub account to log in

Since the default image address used by minikube is DockerHub, we also need to register an account in DockerHub (https://hub.docker.com/) and log in to the account using the login command.

```shell
docker login
```

## Container

Our journey begins with a piece of code. Create a new `main.go` file and copy the following code into it.

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

The above is a string of code written in [Go](https://go.dev/), the code logic is very simple, first start the HTTP server, listen on port `3000` and return the string `[v1] Hello, Kubernetes!` when the route `/` is accessed.

In the old days, if you wanted to get this code up and running and test it. You first needed to know how to download the golang installation package and install it, then you needed to know the basic use of `golang module`, and finally you needed to know the compile and run commands of golang to get that code up and running. Even in the process, it may fail to compile or run due to problems with environment variables, operating system issues, processor architecture, etc.

But with Container (container) technology, all you need is the above code with the corresponding container `Dockerfile` file, then you don't need any knowledge of golang to get the code running smoothly.


> **Container** is a sandbox technology. It is based on a combination of Namespace / Cgroups / chroot technologies in Linux. For more technical details, please refer to this video [How to implement a container by yourself](https://www.youtube.com/watch?v=8fi7uSYlOdc).


The following is the corresponding `Dockerfile` for the Go code. The simple solution is to use the golang alpine image to package it directly, but since we need to push the image to DockerHub and pull the image to the k8s cluster frequently for subsequent exercises, we choose to run the Go code in `golang:1.16-buster` first in order to optimize the network speed. and then copy the binaries to the `base-debian10` image (it doesn't matter if you don't understand the Dockerfile, it doesn't affect the learning process).

This way we can turn a 300MB image into a 20MB image, or even compress it and upload it to DockerHub with a size of 10MB!

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

Note that the `main.go` file needs to be in the same directory as the `Dockerfile` file, execute the `docker build` command below, and wait patiently for the first time to pull the base image. And **be careful to replace `guangzhengli` in the command with your `DockerHub` registered account name**. This will allow us to push the image to our `DockerHub` repository.

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

After the `docker build` command finishes we can check if the image was built successfully with the `docker images` command, and finally we execute the `docker run` command to start the container, with `-p` specifying `3000` as the port and `-d` specifying the name of the image that was just packaged successfully.

```shell
docker run -p 3000:3000 --name hellok8s -d guangzhengli/hellok8s:v1
```

After running successfully, you can access `http://127.0.0.1:3000` via your browser or `curl` to see if the string `[v1] Hello, Kubernetes!` was successfully returned.

Here because I only use Docker CLI locally, and docker runtime is using `minikube`, so I need to call `minikube ip` first to return the minikube IP address, for example, `192.168.59.100` is returned, so I need to visit `http://192.168. 59.100:3000` to determine if the string `[v1] Hello, Kubernetes!` was successfully returned.

Finally, make sure there are no problems, and use `docker push` to upload the image to the remote `DockerHub` repository, so that others can download and use it, as well as to facilitate the subsequent `Minikube` downloads.  **Be careful to replace `guangzhengli` with your own `DockerHub` account name**.

```shell
docker push guangzhengli/hellok8s:v1
```

After the exercises in this section, do you have an initial understanding of the power of containers? Imagine when you want to deploy a more complex service, such as Nginx, MySQL, Redis. All you need to do is go to [DockerHub search](https://hub.docker.com/search?q=) and search for the corresponding image, download the image via `docker pull`, and `docker run` to start the service. and start the service! No need to care about dependencies and configuration!
