# 准备工作

在开始本教程之前，需要配置好本地环境，以下是需要安装的依赖和包。

## 安装 docker

首先我们需要安装 `docker` 来打包镜像，如果你本地已经安装了 `docker`，那么你可以选择跳过这一小节。

### 推荐安装方法

目前使用 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 来安装 docker 还是最简单的方案，打开官网下载对应你电脑操作系统的包即可 (https://www.docker.com/products/docker-desktop/)，

当安装完成后，可以通过 `docker run hello-world` 来快速校验是否安装成功！

### 其它安装方法

目前  Docker 公司宣布  [Docker Desktop](https://www.docker.com/products/docker-desktop/) 只对个人开发者或者小型团体免费 (2021年起对大型公司不再免费)，所以如果你不能通过  [Docker Desktop](https://www.docker.com/products/docker-desktop/) 的方式下载安装 `docker`，可以参考 [这篇文章](https://dhwaneetbhatt.com/blog/run-docker-without-docker-desktop-on-macos) 只安装  [Docker CLI](https://github.com/docker/cli)。

## 安装 minikube

我们还需要搭建一套 k8s 本地集群 (使用云厂商或者其它 k8s 集群都可) 。本地搭建 k8s 集群的方式推荐使用 [minikube](https://minikube.sigs.k8s.io/docs/)。

可以根据 [minikube 快速安装](https://minikube.sigs.k8s.io/docs/start/) 来进行下载安装，这里简单列举 MacOS 的安装方式，Linux & Windows 操作系统可以参考[官方文档](https://minikube.sigs.k8s.io/docs/start/) 快速安装。

```shell
brew install minikube
```

### 启动 minikube

因为 minikube 支持很多容器和虚拟化技术 ([Docker](https://minikube.sigs.k8s.io/docs/drivers/docker/), [Hyperkit](https://minikube.sigs.k8s.io/docs/drivers/hyperkit/), [Hyper-V](https://minikube.sigs.k8s.io/docs/drivers/hyperv/), [KVM](https://minikube.sigs.k8s.io/docs/drivers/kvm2/), [Parallels](https://minikube.sigs.k8s.io/docs/drivers/parallels/), [Podman](https://minikube.sigs.k8s.io/docs/drivers/podman/), [VirtualBox](https://minikube.sigs.k8s.io/docs/drivers/virtualbox/), or [VMware Fusion/Workstation](https://minikube.sigs.k8s.io/docs/drivers/vmware/))，也是问题出现比较多的地方，所以这里还是稍微说明一下。

如果你使用 `docker` 的方案是上面推荐的 [Docker Desktop](https://www.docker.com/products/docker-desktop/) ，那么你以下面的命令启动 minikube 即可，需要耐心等待下载依赖。

```shell
minikube start --vm-driver docker --container-runtime=docker
```

启动完成后，运行 `minikube status` 查看当前状态确定是否启动成功！

如果你本地只有 Docker CLI，判断标准如果执行 `docker ps` 等命令，返回错误 `Cannot connect to the Docker daemon at unix:///Users/xxxx/.colima/docker.sock. Is the docker daemon running?` 那么就需要操作下面的命令。

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

**minikube 命令速查**

`minikube stop` 不会删除任何数据，只是停止 VM 和 k8s 集群。

`minikube delete` 删除所有 minikube 启动后的数据。

`minikube ip` 查看集群和 docker enginer 运行的 IP 地址。

`minikube pause` 暂停当前的资源和 k8s 集群

`minikube status` 查看当前集群状态

## 安装 kubectl

这一步是可选的，如果不安装的话，后续所有 `kubectl` 相关的命令，使用 `minikube kubectl` 命令替代即可。

如果你不想使用 `minikube kubectl` 或者配置相关环境变量来进行下面的教学的话，可以考虑直接安装 `kubectl`。

```shell
brew install kubectl
```

## 注册 docker hub 账号登录

因为默认 minikube 使用的镜像地址是 DockerHub，所以我们还需要在 DockerHub(https://hub.docker.com/) 中注册账号，并且使用 login 命令登录账号。

```shell
docker login
```
