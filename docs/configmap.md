---
prev:
  text: 'Namespace'
  link: 'namespaces'
next:
  text: 'Secret'
  link: 'secert'
---

# ConfigMap

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
