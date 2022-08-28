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
