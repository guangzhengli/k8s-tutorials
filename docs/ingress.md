---
prev:
  text: 'Service'
  link: 'service'
next:
  text: 'Namespace'
  link: 'namespace'
---

# Ingress

[Ingress](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/#ingress-v1beta1-networking-k8s-io) 公开从集群外部到集群内[服务](https://kubernetes.io/docs/concepts/services-networking/service/)的 HTTP 和 HTTPS 路由。 流量路由由 Ingress 资源上定义的规则控制。Ingress 可为 Service 提供外部可访问的 URL、负载均衡流量、 SSL/TLS，以及基于名称的虚拟托管。你必须拥有一个 [Ingress 控制器](https://kubernetes.io/zh-cn/docs/concepts/services-networking/ingress-controllers) 才能满足 Ingress 的要求。 仅创建 Ingress 资源本身没有任何效果。 [Ingress 控制器](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers) 通常负责通过负载均衡器来实现 Ingress，例如 `minikube` 默认使用的是 [nginx-ingress](https://minikube.sigs.k8s.io/docs/tutorials/nginx_tcp_udp_ingress/)，目前  `minikube` 也支持 [Kong-Ingress](https://minikube.sigs.k8s.io/docs/handbook/addons/kong-ingress/)。

Ingress 可以“简单理解”为服务的网关 Gateway，它是所有流量的入口，经过配置的路由规则，将流量重定向到后端的服务。

在   `minikube` 中，可以通过下面命令开启 Ingress-Controller 的功能。默认使用的是 [nginx-ingress](https://minikube.sigs.k8s.io/docs/tutorials/nginx_tcp_udp_ingress/)。

```shell
minikube addons enable ingress
```

接着删除之前创建的所有 `pod`, `deployment`, `service` 资源。

``` shell
kubectl delete deployment,service --all
```

接着根据之前的教程，创建 `hellok8s:v3` 和 `nginx` 的`deployment`与 `service` 资源。Service 的 type 为 ClusterIP 即可。

`hellok8s:v3` 的端口映射为 `3000:3000`，`nginx` 的端口映射为 `4000:80`，这里后续写 Ingress Route 规则时会用到。

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

---

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
        - image: guangzhengli/hellok8s:v3
          name: hellok8s-container
```

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

---

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

```shell
kubectl apply -f hellok8s.yaml                 
# service/service-hellok8s-clusterip created
# deployment.apps/hellok8s-deployment created

kubectl apply -f nginx.yaml   
# service/service-nginx-clusterip created
# deployment.apps/nginx-deployment created

kubectl get pods            
# NAME                                   READY   STATUS    RESTARTS   AGE
# hellok8s-deployment-5d5545b69c-4wvmf   1/1     Running   0          55s
# hellok8s-deployment-5d5545b69c-qcszp   1/1     Running   0          55s
# hellok8s-deployment-5d5545b69c-sn7mn   1/1     Running   0          55s
# nginx-deployment-d47fd7f66-d9r7x       1/1     Running   0          34s
# nginx-deployment-d47fd7f66-hp5nf       1/1     Running   0          34s

kubectl get service
# NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
# service-hellok8s-clusterip   ClusterIP   10.97.88.18      <none>        3000/TCP   77s
# service-nginx-clusterip      ClusterIP   10.103.161.247   <none>        4000/TCP   56s
```

这样在 k8s 集群中，就有 3 个 `hellok8s:v3` 的 pod，2 个 `nginx` 的 pod。并且`hellok8s:v3` 的端口映射为 `3000:3000`，`nginx` 的端口映射为 `4000:80`。在这个基础上，接下来编写 Ingress 资源的定义，`nginx.ingress.kubernetes.io/ssl-redirect: "false"` 的意思是这里关闭 `https` 连接，只使用 `http` 连接。

匹配前缀为 `/hello` 的路由规则，重定向到 `hellok8s:v3` 服务，匹配前缀为 `/` 的跟路径重定向到 `nginx`。

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

```shell
kubectl apply -f ingress.yaml
# ingress.extensions/hello-ingress created

kubectl get ingress          
# NAME            CLASS   HOSTS   ADDRESS   PORTS   AGE
# hello-ingress   nginx   *                 80      16s

# replace 192.168.59.100 by your minikube ip
curl http://192.168.59.100/hello
# [v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-sn7mn

curl http://192.168.59.100/
# (....Thank you for using nginx.....)
```
这里和service一样，如果本地使用 Docker Desktop（minikube start --driver=docker）的话，那你大概率无法通过minikube ip获取到的ip地址来请求，你可以先通过`minikube service list`来查看服务列表，然后通过`minikube service ingress-nginx-controller -n ingress-nginx --url`来公开服务，然后通过`curl`或者浏览器来访问。
```shell
minikube service list
# |---------------|------------------------------------|--------------|---------------------------|
# |   NAMESPACE   |                NAME                | TARGET PORT  |            URL            |
# |---------------|------------------------------------|--------------|---------------------------|
# | default       | kubernetes                         | No node port |
# | default       | service-hellok8s-clusterip         | No node port |
# | default       | service-nginx-clusterip            | No node port |
# | ingress-nginx | ingress-nginx-controller           | http/80      | http://192.168.49.2:32339 |
# |               |                                    | https/443    | http://192.168.49.2:32223 |
# | ingress-nginx | ingress-nginx-controller-admission | No node port |
# | kube-system   | kube-dns                           | No node port |
# |---------------|------------------------------------|--------------|---------------------------|
minikube service ingress-nginx-controller -n ingress-nginx --url
# http://127.0.0.1:61691      http
# http://127.0.0.1:61692      https
# ❗  Because you are using a Docker driver on windows, the terminal needs to be open to run it.
# 第一个是http，第二个是https，这里我们只需要http，所以我们只需要第一个地址
curl http://127.0.0.1:61691/hello
# [v3] Hello, Kubernetes!, From host: hellok8s-deployment-5d5545b69c-sn7mn
curl http://127.0.0.1:61691/
# (....Thank you for using nginx.....)
```

上面的教程中将所有流量都发送到 Ingress 中，如下图所示：

![ingress](https://cdn.jsdelivr.net/gh/guangzhengli/PicURL@master/uPic/ingress.png)
