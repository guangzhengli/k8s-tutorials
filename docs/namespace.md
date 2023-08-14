# Namespace

在实际的开发当中，有时候我们需要不同的环境来做开发和测试，例如 `dev` 环境给开发使用，`test` 环境给 QA 使用，那么 k8s 能不能在不同环境 `dev` `test` `uat` `prod` 中区分资源，让不同环境的资源独立互相不影响呢，答案是肯定的，k8s 提供了名为 Namespace 的资源来帮助隔离资源。

在 Kubernetes 中，**名字空间（Namespace）** 提供一种机制，将同一集群中的资源划分为相互隔离的组。 同一名字空间内的资源名称要唯一，但跨名字空间时没有这个要求。 名字空间作用域仅针对带有名字空间的对象，例如 Deployment、Service 等。

前面的教程中，默认使用的 namespace 是 `default`。

下面展示如何创建一个新的 namespace， `namespace.yaml` 文件定义了两个不同的 namespace，分别是 `dev` 和 `test`。

``` yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  
---

apiVersion: v1
kind: Namespace
metadata:
  name: test
```

可以通过`kubectl apply -f namespaces.yaml` 创建两个新的 namespace，分别是 `dev` 和 `test`。

```yaml
kubectl apply -f namespaces.yaml    
# namespace/dev created
# namespace/test created


kubectl get namespaces          
# NAME              STATUS   AGE
# default           Active   215d
# dev               Active   2m44s
# ingress-nginx     Active   110d
# kube-node-lease   Active   215d
# kube-public       Active   215d
# kube-system       Active   215d
# test              Active   2m44s
```

那么如何在新的 namespace 下创建资源和获取资源呢？只需要在命令后面加上 `-n namespace` 即可。例如根据上面教程中，在名为 `dev` 的 namespace 下创建 `hellok8s:v3` 的 deployment 资源。

```shell
kubectl apply -f deployment.yaml -n dev

kubectl get pods -n dev
```
