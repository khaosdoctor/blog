---
title: '"How to take control of your Kubernetes cluster with affinity and tolerations"'
pubDate: 2021-03-02T12:00:00.000Z
updatedDate: 2026-07-16T16:17:48.000Z
category: infra
tags:
  - kubernetes
  - aks
  - azure
  - cloud
  - containers
  - development
  - devops
  - docker
  - technology
lang: en
description: "\"Do you control your Kubernetes cluster? Let's learn techniques and concepts that will help you have control of your applications within the distributed model\""
slug: how-to-control-your-kubernetes-cluster-with-affinity-and-tolerations
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

When working with Kubernetes clusters, it's common to have applications that need to be on specific nodes. This is even more common when we have a series of nodes that are part of our cluster through **Node Pools**.

In this article we'll learn to control our nodes with selectors, we'll learn the concept of **Node Pools** and also the concept of **Node Affinity**. Finally we'll understand the entire idea behind **taints and tolerations**. And with this, we'll learn to have complete control of our cluster and where we want our applications.[^n1]

## Why do we need control?

By default, Kubernetes has a scheduler that makes a very good separation of its pods and containers, for example, it will always try to make an equal distribution of all applications across the cluster, avoiding placing applications that need more resources than the node currently has.

In general, this is a good separation and a good strategy, however many times we have the need to have more than one type of machine for our applications, and that's where we need to have the exact control of where we need to place our applications. For example, for Machine Learning applications, for instance, the best machines are those that have an integrated GPU, this way we can have more than one **node pool** with different machines.

However we can't place all of our applications inside a node with GPU, because if we did we would exhaust the node without having the applications that really need it. In the same way, we can't have only GPU nodes because those machines are very expensive.

So that's where the concept of selectors comes in.

## Node Selectors

Every way of restricting an application to some node is called a _node constraint_. The simplest way to create a restriction is through a node selector. With this technique, you essentially force a Pod to be registered to run inside a specific node.

Like any other Kubernetes resource, nodes also allow grouping and tagging through _labels_. A label is a key and value pair that can be created of your choosing. It will be through these pairs that you will restrict an application.

### Creating a label for a node

When we create a node in a managed Kubernetes cluster, like [AKS](https://azure.microsoft.com/services/kubernetes-service/?WT.mc_id=containers-12308-ludossan), we can see that the cloud itself already places some labels on these nodes, in addition to these, there are [other known and common labels](https://kubernetes.io/docs/reference/labels-annotations-taints/) that are added to all nodes by default in a cluster.

We can get this information with the command `kubectl describe nodes {name}`, as we can see on this node in a cluster I created:

```output
Labels:             agentpool=nodepool1
                    beta.kubernetes.io/arch=amd64
                    beta.kubernetes.io/instance-type=Standard_B2s
                    beta.kubernetes.io/os=linux
                    failure-domain.beta.kubernetes.io/region=eastus
                    failure-domain.beta.kubernetes.io/zone=0
                    kubernetes.azure.com/cluster=MC_keda_keda_eastus
                    kubernetes.azure.com/mode=system
                    kubernetes.azure.com/node-image-version=AKSUbuntu-1804-2021.01.06
                    kubernetes.azure.com/role=agent
                    kubernetes.io/arch=amd64
                    kubernetes.io/hostname=aks-nodepool1-24389357-vmss000000
                    kubernetes.io/os=linux
                    kubernetes.io/role=agent
                    node-role.kubernetes.io/agent=
                    node.kubernetes.io/instance-type=Standard_B2s
                    storageprofile=managed
                    storagetier=Premium_LRS
                    topology.kubernetes.io/region=eastus
                    topology.kubernetes.io/zone=0
```

Let's create a new label for this node, let's say it has a GPU through a label `processingtype=gpu`, to do this we'll use the `label` command:

```bash
kubectl label nodes {node name} processingtype=gpu
```

> If we want to change a label that already exists we can add the `--overwrite` flag with the label name, for example, if we want to change the value of the `processingtype` label to CPU we can run `kubectl label nodes {name} processingtype=cpu --overwrite`

It's important to note that labels can only have one value per key, that is, we can't have two keys `processingtype` with two different values.

### Using Node Selectors

Now that we have the application of labels on a node, let's create a simple Pod.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
```

Now we can add another key inside `spec` that specifies that we want a selector so that the application runs only on nodes that have the key `processingtype` with the value `gpu`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
  nodeSelector:
    processingtype: gpu
```

Now this application will **always** be sent to this node.

## Node Affinity

**Node Affinity** is another concept very close to what we just talked about as Node Selectors. The difference is the slightly more expressive syntax that allows you to create more complex selectors with models like `label in (value, value)` or `label=value`.

The main difference between the two is that we have another specific key for the affinity within a Pod spec. In this spec we'll have two types of affinity:

-   `requiredDuringSchedulingIgnoredDuringExecution`: Think of this as a node selector, pods with this key will have to be on a node that is compatible with the descriptions of this affinity.
-   `preferredDuringSchedulngIgnoredDuringExecution`: This is a softer version of the previous one. It says that, basically, the pod will try to run on a node with these labels, but if there isn't one available, then it will run on another node.

Both can coexist on the same pod, and it's important to pay attention to the `IgnoredDuringExecution` part, this means that, if a node loses a certain label that allows a series of pods to run on it, these pods continue to exist until they are recreated.

See an example of a Pod that will forcibly create the containers within zones 1 or 2 and will prefer Linux environments, but if there aren't any, then they can be run on other OSes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: node-affinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - 1
            - 2
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: kubernetes.io/os
            operator: In
            values:
            - Linux
  containers:
  - name: affinity
    image: khaosdoctor/go-vote-api
```

> You can use the operators `In`, `NotIn`, `Exists`, `DoesNotExist`, `Gt`, `Lt`. Using `NotIn` and `DoesNotExist` we can achieve what is called **anti-affinity**, which is to repel a Pod from running on certain nodes

### Weight

The `weight` key is a quite interesting option because we can use the weight so that a node has more priority than others. What happens is that, when the scheduler goes through these rules, it will sum the `weight` of all rules for a node that are satisfied by the labels of this node. The nodes that get the highest sum will be preferred to have this container.

## Taints and Tolerations

We know that _affinity_ is a property of a Pod that attracts this pod to a group of nodes. We also have the opposite of this property, another property that pushes Pods away from a group of nodes, we call these properties **taints**.

**Taints** are applied to nodes, so a node has one or more taints that will repel pods from being sent to it. On the other hand, we have **tolerations** that are applied to Pods. A pod that has a _toleration_ that is compatible with a _taint_ will be able to be scheduled to start on this node, otherwise it will be permanently repelled.

Think of taints and tolerations as a permanent way to repel Pods from nodes. While a NodeSelector or NodeAffinity work when you explicitly specify a series of labels, if you don't specify these properties, the Pod will continue to be scheduled on another node. With a taint on a node, you repel **permanently** all pods that don't have tolerations.

> Remember: Taints and Tolerations work together, we can have one without the other, but they simply wouldn't work. Every toleration needs a taint.

### Creating a taint

In the same way as we create labels, we can create taints with the command `kubectl taint nodes {name}`, but unlike labels, taints have an effect. Let's look at an example:

```bash
kubectl taint node {name} processingtype=gpu:NoSchedule
```

See that we have the template `key=value:effect`, the `NoSchedule` effect will prevent any pod that doesn't have a compatible toleration from being created on this node. Besides this effect, we have two others:

-   `PreferNoSchedule`: a soft version of `NoSchedule`, the system will try to avoid any pod that doesn't have a toleration to this from being created on this node.
-   `NoExecute`: It's an even more radical form, it means that if a taint of this type is added to a node, all Pods that don't support this taint with a compatible toleration will be **immediately removed** from the node. This type of effect has another property called `tolerationSeconds`, which says how long it will take for the node to be able to remove the pods that don't have a compatible toleration.

Let's look at examples of all this. First, let's imagine we have 3 nodes, each will have a different taint:

```bash
kubectl taint nodes node1 processingtype=cpu:PreferNoSchedule && \
kubectl taint nodes node2 processingtype=gpu:NoSchedule && \
kubectl taint nodes node3 processingtype=tpu:NoExecute
```

> A taint can have more than one effect at the same time, although that doesn't make as much sense

What we have here are:

-   `node1` will allow the execution of pods inside it if there's no kind of toleration on the pods. Since it's a simple CPU node
-   `node2` won't allow any Pod that doesn't have a compatible toleration to be executed, since we only want GPU pods running there
-   `node3` besides not allowing any kind of scheduling for it, will also automatically remove all pods that are already being executed that don't have the given toleration. This is an expensive node since it uses TPUs, so we want maximum control over there

### Tolerating Taints

Now that we created the taint on our node, let's create a series of pods that tolerate certain taints.

First let's create the pod that tolerates the TPU taint:

```yaml title="c"
apiVersion: v1
kind: Pod
metadata:
  name: tpu
  labels:
    env: test
spec:
  containers:
  - name: tpu
    image: khaosdoctor/go-vote-api
  tolerations:
  - key: "processingtype"
    operator: "Equals"
    value: "tpu"
    effect: "NoExecute"
```

> Unlike an affinity, tolerations can have the operators `Equals` and `Exists`

This Pod will be able to run on the node that contains TPUs. Now let's do the same for the CPU and GPU setup:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu
  labels:
    env: test
spec:
  containers:
  - name: gpu
    image: khaosdoctor/go-vote-api
  tolerations:
  - key: "processingtype"
    operator: "Equals"
    value: "gpu"
    effect: "NoSchedule"
---
apiVersion: v1
kind: Pod
metadata:
  name: cpu
  labels:
    env: test
spec:
  containers:
  - name: cpu
    image: khaosdoctor/go-vote-api
  tolerations:
  - key: "processingtype"
    operator: "Equals"
    value: "cpu"
    effect: "PreferNoSchedule"
```

Besides this, when we're working with tolerations, the `value` key is not mandatory, we can have just a taint of key without needing a value.

For these two pods, we'll have that they can be included on each of the nodes that they tolerate. However, a new Pod that is created without any toleration will probably be created on the CPU node.

### Default taints

When a Kubernetes node enters certain states, such as "no disk", "no memory" or any other state that prevents it from having new Pods being scheduled for it, the system automatically adds [default taints](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/#taint-based-evictions) that remove Pods according to each of those taints.

You can create tolerations for these taints, for example, when a node becomes unreachable, we can tell its Pods that they should wait at least 5 minutes before being removed and reallocated with the `tolerationSeconds` key:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu
  labels:
    env: test
spec:
  containers:
  - name: gpu
    image: khaosdoctor/go-vote-api
  tolerations:
  - key: "node.kubernetes.io/unreachable"
    operator: "Exists"
    effect: "NoExecute"
    tolerationSeconds: 300
```

This way the nodes won't immediately remove the Pods that aren't compatible in the hope that your network comes back before that. You can also apply this toleration time to any other taint.

## Best practices for labels

There are some practices for naming your labels so that they stay efficient and you can accomplish your tasks in a practical way

### Prefixes

As you could see in the previous example, some of the labels look like a fully qualified domain name (FQDN) separated by a resource, like in `topology.kubernetes.io/region`, the DNS part is called a **prefix**.

Prefixes are used to give the intention that the prefixed labels are public, any label without any prefix is considered a private label only to the user, although it can be seen by other users.

[As the official documentation says](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set), any application that adds labels to user objects (as is the case with Azure itself), must have a label with a prefix.

### Reserved prefixes

All labels with prefixes that end in `kubernetes.io` or `k8s.io` are generally reserved for core Kubernetes objects, this is not an obligation or something that is forced on the user, but it's a convention that should be followed.

### Recommended labels

[The official documentation recommends a series of labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) to be placed **on all resources** created within the cluster. They are only recommended and are not mandatory on all applications. Besides these labels, some other labels that I particularly like to put are:

-   Labels that define the team responsible for the application like `team=campaign`
-   Labels to define the people responsible for the application with `owner=lucas_santos`
-   Definition of the application environment with `env=production`
-   Last commit of the current version with `sha=5acffe34d`, just for version control

## Conclusion

With taints, tolerations, affinity and selectors we take a step forward in controlling our clusters so that we can have even better control of our ecosystem!

See you later!

[^n1]: Since this article already assumes that you know a little bit more about Kubernetes, I won't give the basics to understand it, but if you want to understand a little more, check out [my free Kubernetes course on Channel9](https://aka.ms/aks-bootcamp) and, to dig deeper, [take a look at my Kubernetes book from Casa do Código](https://tudosobrekubernetes.tech).
