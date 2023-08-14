# Dashboard

## kubernetes dashboard

> Dashboard 是基于网页的 Kubernetes 用户界面。 你可以使用 Dashboard 将容器应用部署到 Kubernetes 集群中，也可以对容器应用排错，还能管理集群资源。 你可以使用 Dashboard 获取运行在集群中的应用的概览信息，也可以创建或者修改 Kubernetes 资源 （如 Deployment，Job，DaemonSet 等等）。 例如，你可以对 Deployment 实现弹性伸缩、发起滚动升级、重启 Pod 或者使用向导创建新的应用。

在本地 minikube 环境，可以直接通过下面命令开启 Dashboard。更多用法可以参考官网或者自行探索。

```shell
minikube dashboard
```

![eB3MYd](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/eB3MYd.png)

## K9s

[K9s](https://k9scli.io/) 是一个基于 Terminal 的轻量级 UI，可以更加轻松的观察和管理已部署的 k8s 资源。使用方式非常简单，安装后输入 `k9s` 即可开启 Terminal Dashboard，更多用法可以参考官网。

![83ybd4](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/83ybd4.png)
