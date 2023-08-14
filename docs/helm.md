---
prev:
  text: 'Job'
  link: '/docs/job'
next:
  text: 'Dashboard'
  link: '/docs/dashboard'
---

# Helm

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

## 用 helm 安装 hellok8s
开始本节教程前，我们先把之前手动创建的 hellok8s 相关的资源删除(防止使用 helm 创建同名的 k8s 资源失败)。

在尝试自己创建 hellok8s helm chart 之前，我们可以先来熟悉一下怎么使用 helm chart。在这里我先创建好了一个 hellok8s（包括会创建 deployment, service, ingress, configmaps, secret）的 helm chart。通过 GitHub actions 生成放在了 [gh-pages](https://github.com/guangzhengli/k8s-tutorials/tree/gh-pages/) 分支下的 `index.yaml` 文件中。

接着可以使用下面命令进行快速安装，其中 `helm repo add` 表示将我创建好的 hellok8s chart 添加到自己本地的仓库当中，`helm install` 表示从仓库中安装 hellok8s/hello-helm 到 k8s 集群当中。

```shell
helm repo add hellok8s https://guangzhengli.github.io/k8s-tutorials/
# "hellok8s" has been added to your repositories

helm install my-hello-helm hellok8s/hello-helm --version 0.1.0
# NAME: my-hello-helm
# NAMESPACE: default
# STATUS: deployed
# REVISION: 1
```

创建完成后，通过 `kubectl get` 等命令可以看到所有 hellok8s 资源都创建成功，`helm` 一条命令即可做到之前教程中所有资源的创建！通过 `curl` k8s 集群的 ingress 地址，也可以看到返回字符串！

```shell
kubectl get pods
# NAME                                  READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-f88f984c6-k8hpz   1/1     Running   0          15h
# hellok8s-deployment-f88f984c6-nzwg6   1/1     Running   0          15h
# hellok8s-deployment-f88f984c6-s89s7   1/1     Running   0          15h
# nginx-deployment-d47fd7f66-6w76b      1/1     Running   0          15h
# nginx-deployment-d47fd7f66-tsqj5      1/1     Running   0          15h

kubectl get deployments
# NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
# hellok8s-deployment   3/3     3            3           15h
# nginx-deployment      2/2     2            2           15h

kubectl get service
# NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
# kubernetes                   ClusterIP   10.96.0.1        <none>        443/TCP    13d
# service-hellok8s-clusterip   ClusterIP   10.107.198.175   <none>        3000/TCP   15h
# service-nginx-clusterip      ClusterIP   10.100.144.49    <none>        4000/TCP   15h

kubectl get ingress
# NAME               CLASS   HOSTS   ADDRESS     PORTS   AGE
# hellok8s-ingress   nginx   *       localhost   80      15h

kubectl get configmap
# NAME               DATA   AGE
# hellok8s-config    1      15h

kubectl get secret
# NAME                                  TYPE                                  DATA   AGE
# hellok8s-secret                       Opaque                                1      15h
# sh.helm.release.v1.my-hello-helm.v1   helm.sh/release.v1

curl http://192.168.59.100/hello
# [v6] Hello, Helm! Message from helm values: It works with Helm Values[v2]!, From namespace: default, From host: hellok8s-deployment-598bbd6884-ttk78, Get Database Connect URL: http://DB_ADDRESS_DEFAULT, Database Connect Password: db_password
```

## 创建 helm charts

这段代码无法渲染，请查看：https://github.com/guangzhengli/k8s-tutorials#helm

## rollback

Helm 也提供了 Rollback 的功能，我们先修改一下 `message: "It works with Helm Values[v2]!"` 加上 [v2]。

```
application:
  name: hellok8s
  hellok8s:
    image: guangzhengli/hellok8s:v6
    replicas: 3
    message: "It works with Helm Values[v2]!"
    database:
      url: "http://DB_ADDRESS_DEFAULT"
      password: "db_password"
  nginx:
    image: nginx
    replicas: 2
```

再执行 `helm upgrade` 命令更新 k8s 资源，通过 `curl http://192.168.59.100/hello` 可以看到资源已经更新。

```shell
➜  hello-helm git:(main) ✗ helm upgrade --install hello-helm --values values.yaml .
# Release "hello-helm" has been upgraded. Happy Helming!
NAME: hello-helm
NAMESPACE: default
STATUS: deployed
REVISION: 2

curl http://192.168.59.100/hello
# [v6] Hello, Helm! Message from helm values: It works with Helm Values[v2]!, From namespace: default, From host: hellok8s-deployment-598bbd6884-4b9bw, Get Database Connect URL: http://DB_ADDRESS_DEFAULT, Database Connect Password: db_password
```

如果这一次更新有问题的话，可以通过 ` helm rollback` 快速回滚。通过下面命令看到，和 deployment 的 rollback 一样，回滚后 REVISION 版本都会增大到 3 而不是回滚到 1，回滚后使用  `curl` 命令返回的 v1 版本的字符串。

```shell
helm ls
# NAME            NAMESPACE       REVISION          STATUS          CHART                   APP VERSION
# hello-helm      default         2                 deployed        hello-helm-0.1.0        1.16.0 

helm rollback hello-helm 1
# Rollback was a success! Happy Helming!

helm ls
# NAME            NAMESPACE       REVISION          STATUS          CHART                   APP VERSION
# hello-helm      default         3                 deployed        hello-helm-0.1.0        1.16.0 

curl http://192.168.59.100/hello
# [v6] Hello, Helm! Message from helm values: It works with Helm Values!, From namespace: default, From host: hellok8s-deployment-57d7df7964-482xw, Get Database Connect URL: http://DB_ADDRESS_DEFAULT, Database Connect Password: db_password
```

### 多环境配置

使用 Helm 也很容易多环境部署，新建 `values-dev.yaml` 文件，里面内容自定义 `dev` 环境需要的配置信息。

```yaml
application:
  hellok8s:
    message: "It works with Helm Values values-dev.yaml!"
    database:
      url: "http://DB_ADDRESS_DEV"
      password: "db_password_dev"
```

可以多次指定'--values -f'参数，最后（最右边）指定的文件优先级最高，这里最右边的是 `values-dev.yaml` 文件，所以 `values-dev.yaml` 文件中的值会覆盖 `values.yaml` 中相同的值，`-n dev` 表示在名字为 dev 的 namespace 中创建 k8s 资源，执行完成后，我们可以通过 `curl` 命令看到返回的字符串中读取的是 `values-dev.yaml` 文件的配置，并且 `From namespace = dev`。

```shell
helm upgrade --install hello-helm -f values.yaml -f values-dev.yaml -n dev .

# Release "hello-helm" does not exist. Installing it now.
# NAME: hello-helm
# NAMESPACE: dev
# STATUS: deployed
# REVISION: 1

curl http://192.168.59.100/hello
# [v6] Hello, Helm! Message from helm values: It works with Helm Values values-dev.yaml!, From namespace: dev, From host: hellok8s-deployment-f5fff9df-89sn6, Get Database Connect URL: http://DB_ADDRESS_DEV, Database Connect Password: db_password_dev

kubectl get pods -n dev
# NAME                                 READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-f5fff9df-89sn6   1/1     Running   0          4m23s
# hellok8s-deployment-f5fff9df-tkh6g   1/1     Running   0          4m23s
# hellok8s-deployment-f5fff9df-wmlpb   1/1     Running   0          4m23s
# nginx-deployment-d47fd7f66-cdlmf     1/1     Running   0          4m23s
# nginx-deployment-d47fd7f66-cgst2     1/1     Running   0          4m23s
```

除此之外，还可以使用 '--set-file' 设置独立的值，类似于 `helm upgrade --install hello-helm -f values.yaml -f values-dev.yaml --set application.hellok8s.message="It works with set helm values" -n dev .` 方式在命令中设置 values 的值，可以随意修改相关配置，此方法在 CICD 中经常用到。

## helm chart 打包和发布

上面的例子展示了我们可以用一行命令在一个新的环境中安装所有需要的 k8s 资源！那么如何将 helm chart 打包、分发和下载呢？在官网中，提供了两种教程，一种是以 [GCS 存储的教程](https://helm.sh/zh/docs/howto/chart_repository_sync_example/)，还有一种是以 [GitHub Pages 存储的教程](https://helm.sh/zh/docs/howto/chart_releaser_action/)。

这里我们使用第二种，并且使用 [chart-releaser-action](https://github.com/helm/chart-releaser-action) 来做自动发布，该 action 会默认生成 helm chart 发布到 `gh-pages` 分支上，本教程的 hellok8s helm chart 就发布在了本仓库的[gh-pages](https://github.com/guangzhengli/k8s-tutorials/tree/gh-pages/) 分支上的 `index.yaml` 文件中。


在使用 action 自动生成 chart 之前，我们可以先熟悉一下如何手动生成，在 `hello-helm` 目录下，执行 `helm package` 将chart目录打包到chart归档中。`helm repo index` 命令可以基于包含打包chart的目录，生成仓库的索引文件 `index.yaml`。

最后，可以使用 `helm upgrade --install *.tgz` 命令将该指定包进行安装使用。

```shell
helm package hello-helm
# Successfully packaged chart and saved it to: /Users/guangzheng.li/workspace/k8s-tutorials/hello-helm/hello-helm-0.1.0.tgz

helm repo index .

helm upgrade --install hello-helm hello-helm-0.1.0.tgz
```

基于上面的步骤，你可能已经想到，所谓的 helm 打包和发布，就是 `hello-helm-0.1.0.tgz` 文件和 `index.yaml` 生成和上传的一个过程。而 helm 下载和安装，就是如何将 `.tgz` 和 `index.yaml` 文件下载和 `helm upgrade --install` 的过程。

接下来我们发布生成的 hellok8s helm chart，先将手动生成的 `hello-helm-0.1.0.tgz` 和 `index.yaml` 文件删除，后续使用 GitHub action 自动生成和发布这两个文件。

GitHub action 的代码可以参考 [官网文档](https://helm.sh/zh/docs/howto/chart_releaser_action/) 或者本仓库 `.github/workflows/release.yml` 文件。代表当 push 代码到远程仓库时，将 `helm-charts` 目录下的所有 charts 自动打包和发布到 `gh-pages` 分支去(需要保证 `gh-pages` 分支已经存在，否则会报错)。


```yaml
name: Release Charts

on:
  push:
    branches:
      - main

jobs:
  release:
    # depending on default permission settings for your org (contents being read-only or read-write for workloads), you will have to add permissions
    # see: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#modifying-the-permissions-for-the-github_token
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: Configure Git
        run: |
          git config user.name "$GITHUB_ACTOR"
          git config user.email "$GITHUB_ACTOR@users.noreply.github.com"

      - name: Install Helm
        uses: azure/setup-helm@v1
        with:
          version: v3.8.1

      - name: Run chart-releaser
        uses: helm/chart-releaser-action@v1.4.0
        with: 
          charts_dir: helm-charts
        env:
          CR_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

接着配置仓库的 `Settings -> Pages -> Build and deployment -> Branch`，选择 `gh-pages` 分支，GitHub 会自动在 `https://username.github.io/project` 发布 helm chart。

最后，你可以将自己的 helm charts 发布到社区中去，可以考虑发布到 [ArtifactHub](https://artifacthub.io/) 中，像本仓库生成的 helm charts 即发布在 [ArtifactHub hellok8s](https://artifacthub.io/packages/helm/hellok8s/hello-helm) 中。

![tnvYFS](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/tnvYFS.png)
