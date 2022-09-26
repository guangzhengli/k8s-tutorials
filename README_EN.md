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