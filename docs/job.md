## Job

在实际的开发过程中，还有一类任务是之前的资源不能满足的，即一次性任务。例如常见的计算任务，只需要拿到相关数据计算后得出结果即可，无需一直运行。而处理这一类任务的资源就是 Job。

> Job 会创建一个或者多个 Pod，并将继续重试 Pod 的执行，直到指定数量的 Pod 成功终止。 随着 Pod 成功结束，Job 跟踪记录成功完成的 Pod 个数。 当数量达到指定的成功个数阈值时，任务（即 Job）结束。 删除 Job 的操作会清除所创建的全部 Pod。 挂起 Job 的操作会删除 Job 的所有活跃 Pod，直到 Job 被再次恢复执行。
>
> 一种简单的使用场景下，你会创建一个 Job 对象以便以一种可靠的方式运行某 Pod 直到完成。 当第一个 Pod 失败或者被删除（比如因为节点硬件失效或者重启）时，Job 对象会启动一个新的 Pod。

下面来看一个 Job 的资源定义，其中 Kind 和 metadata.name 是资源类型和名字就不再解释，`completions` 指的是会创建 Pod 的数量，每个 pod 都会完成下面的任务。`parallelism` 指的是并发执行最大数量，例如下面就会先创建 3 个 pod 并发执行任务，一旦某个 pod 执行完成，就会再创建新的 pod 来执行，直到 5 个 pod 执行完成，Job 才会被标记为完成。

`restartPolicy = "OnFailure` 的含义和 Pod 生命周期相关，Pod 中的容器可能因为退出时返回值非零， 或者容器因为超出内存约束而被杀死等等。 如果发生这类事件，并且 `.spec.template.spec.restartPolicy = "OnFailure"`， Pod 则继续留在当前节点，但容器会被重新运行。因此，你的程序需要能够处理在本地被重启的情况，或者要设置 `.spec.template.spec.restartPolicy = "Never"`。 

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hello-job
spec:
  parallelism: 3
  completions: 5
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: echo
          image: busybox
          command:
            - "/bin/sh"
          args:
            - "-c"
            - "for i in 9 8 7 6 5 4 3 2 1 ; do echo $i ; done"
```

通过下面的命令创建 job，可以通过 `kubectl get pods -w` 来观察 job 创建 pod 的过程和结果。最后可以通过 `logs` 命令查看日志。

```shell
kubectl apply -f hello-job.yaml

kubectl get jobs                  
# NAME        COMPLETIONS   DURATION   AGE
# hello-job   5/5           19s        83s

kubectl get pods                      
# NAME                                   READY   STATUS      RESTARTS   AGE
# hello-job--1-5gjjr                     0/1     Completed   0          34s
# hello-job--1-8ffmn                     0/1     Completed   0          26s
# hello-job--1-ltsvm                     0/1     Completed   0          34s
# hello-job--1-mttwv                     0/1     Completed   0          29s
# hello-job--1-ww2qp                     0/1     Completed   0          34s

kubectl logs -f hello-job--1-5gjjr 
# 1
# ...
```

Job 完成时不会再创建新的 Pod，不过已有的 Pod [通常](https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-backoff-failure-policy)也不会被删除。 保留这些 Pod 使得你可以查看已完成的 Pod 的日志输出，以便检查错误、警告或者其它诊断性输出。 可以使用 `kubectl` 来删除 Job（例如 `kubectl delete -f hello-job.yaml`)。当使用 `kubectl` 来删除 Job 时，该 Job 所创建的 Pod 也会被删除。

## CronJob

*CronJob* 可以理解为定时任务，创建基于 Cron 时间调度的 [Jobs](https://kubernetes.ion/docs/concepts/workloads/controllers/job/)。

> CronJob 用于执行周期性的动作，例如备份、报告生成等。 这些任务中的每一个都应该配置为周期性重复的（例如：每天/每周/每月一次）； 你可以定义任务开始执行的时间间隔。

Cron 时间表语法

```
# ┌───────────── 分钟 (0 - 59)
# │ ┌───────────── 小时 (0 - 23)
# │ │ ┌───────────── 月的某天 (1 - 31)
# │ │ │ ┌───────────── 月份 (1 - 12)
# │ │ │ │ ┌───────────── 周的某天 (0 - 6)（周日到周一；在某些系统上，7 也是星期日）
# │ │ │ │ │                          或者是 sun，mon，tue，web，thu，fri，sat
# │ │ │ │ │
# │ │ │ │ │
# * * * * *
```

用法除了需要加上 cron 表达式之外，其余基本和 Job 保持一致。

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello-cronjob
spec:
  schedule: "* * * * *" # Every minute
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: echo
              image: busybox
              command: [for i in 9 8 7 6 5 4 3 2 1 ; do echo $i ; done]
```

使用命令和 Job 也基本保持一致，这里就不过多赘述。

```shell
kubectl apply -f hello-cronjob.yaml
# cronjob.batch/hello-cronjob created

kubectl get cronjob                
# NAME            SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE   AGE
# hello-cronjob   * * * * *   False     0        <none>          8s

kubectl get pods   
# NAME                                   READY   STATUS      RESTARTS   AGE
# hello-cronjob-27694609--1-2nmdx        0/1     Completed   0          15s
```
