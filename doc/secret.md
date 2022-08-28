## Secret

上面提到，我们会选择以 configmap 的方式挂载配置信息，但是当我们的配置信息需要加密的时候， configmap 就无法满足这个要求。例如上面要挂载数据库密码的时候，就需要明文挂载。

这个时候就需要 Secret 来存储加密信息，虽然在资源文件的编码上，只是通过 Base64 的方式简单编码，但是在实际生产过程中，可以通过 pipeline 或者专业的 [AWS KMS](https://aws.amazon.com/kms/) 服务进行密钥管理。这样就大大减少了安全事故。

> Secret 是一种包含少量敏感信息例如密码、令牌或密钥的对象。由于创建 Secret 可以独立于使用它们的 Pod， 因此在创建、查看和编辑 Pod 的工作流程中暴露 Secret（及其数据）的风险较小。 Kubernetes 和在集群中运行的应用程序也可以对 Secret 采取额外的预防措施， 例如避免将机密数据写入非易失性存储。
>
> 默认情况下，Kubernetes Secret 未加密地存储在 API 服务器的底层数据存储（etcd）中。 任何拥有 API 访问权限的人都可以检索或修改 Secret，任何有权访问 etcd 的人也可以。 此外，任何有权限在命名空间中创建 Pod 的人都可以使用该访问权限读取该命名空间中的任何 Secret； 这包括间接访问，例如创建 Deployment 的能力。
>
> 为了安全地使用 Secret，请至少执行以下步骤：
>
> 1. 为 Secret [启用静态加密](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)；
> 2. [启用或配置 RBAC 规则](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)来限制读取和写入 Secret 的数据（包括通过间接方式）。需要注意的是，被准许创建 Pod 的人也隐式地被授权获取 Secret 内容。
> 3. 在适当的情况下，还可以使用 RBAC 等机制来限制允许哪些主体创建新 Secret 或替换现有 Secret。

Secret 的资源定义和 ConfigMap 结构基本一致，唯一区别在于 kind 是 `Secret`，还有 Value 需要 Base64 编码，你可以通过下面命令快速  Base64 编解码。当然 Secret 也提供了一种 `stringData`，可以不需要 Base64 编码。

```shell
echo "db_password" | base64
# ZGJfcGFzc3dvcmQK

echo "ZGJfcGFzc3dvcmQK" | base64 -d
# db_password
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hellok8s-secret
data:
  DB_PASSWORD: "ZGJfcGFzc3dvcmQK"
```

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
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: hellok8s-secret
              key: DB_PASSWORD
```

Secret 的使用方法和前面教程中 ConfigMap 基本一致，这里就不再过多赘述。
