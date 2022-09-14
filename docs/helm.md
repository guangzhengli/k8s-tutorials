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

在使用已经创建好的 hello-helm charts 来创建整个 hellok8s 资源后，你可能还是有很多的疑惑，包括 Chart 是如何生成和发布的，如何创建一个新的 Chart？在这节教程中，我们会尝试自己来创建 hello-helm Chart 来完成之前的操作。

首先建议使用 `helm create` 命令来创建 Chart，默认会帮你创建一些 k8s 资源定义的初始文件，并且会生成官网推荐的目录结构，如下所示：

```shell
helm create hello-helm

.
├── Chart.yaml
├── charts
├── templates
│   ├── NOTES.txt
│   ├── _helpers.tpl
│   ├── deployment.yaml
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── service.yaml
│   ├── serviceaccount.yaml
│   └── tests
│       └── test-connection.yaml
└── values.yaml
```

我们将默认生成在 templates 目录下面的 `yaml` 文件删除，用之前教程中 `yaml` 文件替换它，最终的结构长这样：

```shell
.
├── Chart.yaml
├── Dockerfile
├── _helpers.tpl
├── charts
├── hello-helm-0.1.0.tgz
├── index.yaml
├── main.go
├── templates
│   ├── hellok8s-configmaps.yaml
│   ├── hellok8s-deployment.yaml
│   ├── hellok8s-secret.yaml
│   ├── hellok8s-service.yaml
│   ├── ingress.yaml
│   ├── nginx-deployment.yaml
│   └── nginx-service.yaml
└── values.yaml
```

其中 `main.go` 定义的是 `hellok8s:v6` 版本的代码，主要是从系统中拿到 message，namespace，dbURL，dbPassword 这几个环境变量，拼接成字符串返回。

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
	message := os.Getenv("MESSAGE")
	namespace := os.Getenv("NAMESPACE")
	dbURL := os.Getenv("DB_URL")
	dbPassword := os.Getenv("DB_PASSWORD")

	io.WriteString(w, fmt.Sprintf("[v6] Hello, Helm! Message from helm values: %s, From namespace: %s, From host: %s, Get Database Connect URL: %s, Database Connect Password: %s", message, namespace, host, dbURL, dbPassword))
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}
```

为了让大家更加了解 helm charts values 使用和熟悉 k8s 资源配置，这几个环境变量 `MESSAGE`, `NAMESPACE`, `DB_URL`, `DB_PASSWORD` 分别有不同的来源。

首先修改根目录下的 `values.yaml` 文件，定义自定义的配置信息，从之前教程的 k8s 资源文件中，将一些易于变化的参数提取出来，放在 `values.yaml` 文件中。全部配置信息如下所示：

```yaml
application:
  name: hellok8s
  hellok8s:
    image: guangzhengli/hellok8s:v6
    replicas: 3
    message: "It works with Helm Values!"
    database:
      url: "http://DB_ADDRESS_DEFAULT"
      password: "db_password"
  nginx:
    image: nginx
    replicas: 2
```

那自定义好了这些配置后，如何在 k8s 资源定义中使用这些配置信息呢？Helm 默认使用 [Go template 的方式](https://helm.sh/zh/docs/howto/charts_tips_and_tricks/) 来完成。

例如之前教程中，将环境变量  `DB_URL` 定义在 k8s configmaps 中，那么该资源可以定义成如文件所示 `hellok8s-configmaps.yaml`。其中 `metadata.name` 的值是 `{{ .Values.application.name }}-config`，意思是从 `values.yaml` 文件中获取 `application.name` 的值 `hellok8s`，拼接 `-config` 字符串，这样创建出来的 configmaps 资源名称就是 `hellok8s-config`。

同理 `{{ .Values.application.hellok8s.database.url }}` 就是获取值为  `http://DB_ADDRESS_DEFAULT`  放入 configmaps 对应 key 为 DB_URL 的 value 中。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Values.application.name }}-config
data:
  DB_URL: {{ .Values.application.hellok8s.database.url }}
```

上面定义的最终效果和之前在 `configmaps` 教程中定义的资源没有区别，这种做的好处是可以将所有可变的参数定义在 `values.yaml` 文件中，使用该 helm charts 的人无需了解具体 k8s 的定义，只需改变成自己想要的参数，即可创建自定义的资源！

同样，我们可以根据之前的教程将 `DB_PASSWORD` 放入 secret 中，并且通过 `b64enc` 方法将值 Base64 编码。

```shell
# hellok8s-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Values.application.name }}-secret
data:
  DB_PASSWORD: {{ .Values.application.hellok8s.database.password | b64enc }}
```

最后，修改 `hellok8s-deployment` 文件，根据前面的教程，将 `metadata.name` `replicas` `image`  `configMapKeyRef.name` `secretKeyRef.name` 等值修改成从 `values.yaml` 文件中获取。

再添加代码中需要的 `NAMESPACE` 环境变量，从 `.Release.Namespace` [内置对象](https://helm.sh/zh/docs/chart_template_guide/builtin_objects/) 中获取。最后添加 `MESSAGE` 环境变量，直接从 `{{ .Values.application.hellok8s.message }}` 中获取。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.application.name }}-deployment
spec:
  replicas: {{ .Values.application.hellok8s.replicas }}
  selector:
    matchLabels:
      app: hellok8s
  template:
    metadata:
      labels:
        app: hellok8s
    spec:
      containers:
        - image: {{ .Values.application.hellok8s.image }}
          name: hellok8s-container
          env:
            - name: DB_URL
              valueFrom:
                configMapKeyRef:
                  name: {{ .Values.application.name }}-config
                  key: DB_URL
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.application.name }}-secret
                  key: DB_PASSWORD
            - name: NAMESPACE
              value: {{ .Release.Namespace }}
            - name: MESSAGE
              value: {{ .Values.application.hellok8s.message }}
```

修改  `ingress.yaml` 将 `metadata.name` 的值，其它没有变化

``` yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Values.application.name }}-ingress
...
...
...
```

`nginx-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: {{ .Values.application.nginx.replicas }}
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: {{ .Values.application.nginx.image }}
        name: nginx-container
```

`nginx-service.yaml` 和 `hellok8s-service.yaml` 没有变化。所有代码可以在 [这里](https://github.com/guangzhengli/k8s-tutorials/tree/main/hello-helm) 查看。

稍微修改下默认生成的`Chart.yaml`

```yaml
apiVersion: v2
name: hello-helm
description: A k8s tutorials in https://github.com/guangzhengli/k8s-tutorials
type: application
version: 0.1.0
appVersion: "1.16.0"
```

定义完成所有的 helm 资源后，首先**将 `hellok8s:v6` 镜像打包推送到 DockerHub**。

之后即可在 `hello-helm` 的目录下执行 `helm upgrade` 命令进行安装，安装成功后，执行 curl 命令便能直接得到结果！查看 pod 和 service 等资源，便会发现 helm 能一键安装所有资源！

```shell
helm upgrade --install hello-helm --values values.yaml .
# Release "hello-helm" does not exist. Installing it now.
# NAME: hello-helm
# NAMESPACE: default
# STATUS: deployed
# REVISION: 1

curl http://192.168.59.100/hello
# [v6] Hello, Helm! Message from helm values: It works with Helm Values!, From namespace: default, From host: hellok8s-deployment-57d7df7964-m6gcc, Get Database Connect URL: http://DB_ADDRESS_DEFAULT, Database Connect Password: db_password

kubectl get pods
# NAME                                  READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-f88f984c6-k8hpz   1/1     Running   0          32m
# hellok8s-deployment-f88f984c6-nzwg6   1/1     Running   0          32m
# hellok8s-deployment-f88f984c6-s89s7   1/1     Running   0          32m
# nginx-deployment-d47fd7f66-6w76b      1/1     Running   0          32m
# nginx-deployment-d47fd7f66-tsqj5      1/1     Running   0          32m
```

#### rollback

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

### helm chart 打包和发布

//TODO
