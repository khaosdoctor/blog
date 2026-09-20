---
title: Cost Optimization with Kubernetes and AKS
pubDate: 2020-09-03T15:41:57.000Z
updatedDate: 2026-07-16T16:25:10.000Z
category: technology
tags: ["kubernetes", "azure", "cloud", "containers", "docker", "infrastructure"]
lang: en
description: Kubernetes is often seen as a much more expensive approach than normal for most applications. Want to know how you can efficiently optimize your costs?
seoDescription: Kubernetes is often seen as a much more expensive approach than normal for most applications. How can you efficiently optimize your costs?
slug: optimizing-costs-with-kubernetes-and-aks
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Since the early days of distributed computing and the arrival of the cloud, everyone has had to deal with cost optimization in some way. Whether that optimization is in the form of reducing storage space or even reducing network traffic!

One of the most expensive tools when talking about distributed computing is **[Kubernetes](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan)**. This is fairly obvious for two simple reasons:

1. [**Kubernetes**](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) works with a cluster of machines
2. Because it's a cluster, we have more resources to manage

Unfortunately, this issue causes many great solutions to stop running in their ideal environment, which is a distributed and highly scalable environment, and instead run in smaller environments purely due to cost.

But it doesn't have to be this way!

## Billing Models

To understand how we can optimize costs in a cloud architecture with distributed computing using [Kubernetes](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan), we first need to understand the billing models.

Each cloud provider has its own billing model. Here we will work only with [**AKS**](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) (Azure Kubernetes Service), which runs on [Microsoft Azure](https://azure.microsoft.com/?WT.mc_id=blog-personal-ludossan).

> If you use another cloud provider, check the provider's website for pricing and billing options for each service offered. However, the optimization options I'll show here work for all clouds, of course, with some changes in the command line.

![](./image-17.png "Description of AKS billing models")

As we can see, in the case of [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan), billing is done only for the resources used, and cluster management as a whole does not have any extra charges. This means that, in a standard [Kubernetes](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) architecture, what we call the **Control Plane**, or the control plane where all system resources are created, is not charged. Instead, all other resources that [Kubernetes](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) uses to function are charged.

This is a common practice among several cloud providers. Some other providers also charge for control plane allocation, usually because they are not fully managed and allow people administering them to modify part of its content, meaning they offer greater customization capability.

And what resources would those be?

## Billable Resources

In general, creating a [Kubernetes](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) cluster requires a series of small resources ranging from [virtual machines](https://azure.microsoft.com/services/virtual-machines/?WT.mc_id=blog-personal-ludossan), which support the nodes, to network interfaces and traffic controllers. Depending on the type of features you're choosing for your cluster, you may have DNS zones and other resources in that list.

In the case of [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan), when we create a cluster, we select what is called a **Resource Group**. In this resource group, Azure will create a control resource called **Kubernetes Service**, as we can see below:

![](./image-18.png "We create a demo-cluster in a resource group")

However, where are all the billable resources I mentioned at the beginning of the paragraph? For this, because of internal management, Azure creates another resource group that starts with the name `MC_<resource-group>-<cluster>_<region>`. All the billable resources will be placed in it:

![](./image-19.png "Resources billed for a cluster")

Notice we have eight different resources, but we can be charged for more than that because what is called `Virtual Machine Scale Set` is actually a list of [VMs](https://azure.microsoft.com/services/virtual-machines/?WT.mc_id=blog-personal-ludossan) that can be scaled according to what we need.

## Optimizing Costs with AKS

To build this article, I'm using an excellent material available **for free** on Microsoft Learn. The course "[Cost Optimization with AKS and Node Pools](https://docs.microsoft.com/learn/modules/aks-optimize-compute-costs?WT.mc_id=blog-personal-ludossan)".

> In this article, we'll go through the complete material, but I'll give some examples outside the context and explain some things beyond what is being shown. However, it is strongly recommended that you complete the module, it is free and takes only a few minutes.

### Setting Up the Environment

To start, we'll need three important items:

1. You need to have [Azure CLI installed on your machine](https://docs.microsoft.com/cli/azure/install-azure-cli?view=azure-cli-latest&WT.mc_id=blog-personal-ludossan)
2. You need to have [Kubectl installed on your machine](https://docs.microsoft.com/cli/azure/aks?view=azure-cli-latest&WT.mc_id=blog-personal-ludossan#az-aks-install-cli)
3. You need to have an [Azure account](https://azure.microsoft.com/free/?WT.mc_id=blog-personal-ludossan)

As a second option, **if you already have an Azure account**, you can go to [Azure Cloud Shell](https://shell.azure.com/?WT.mc_id=blog-personal-ludossan) and run all the commands there, because Cloud Shell already has both Azure CLI and Kubectl installed. If it's your first time using Cloud Shell, then select **Bash** as your main shell.

Execute the following command to enable _preview_ mode in your Azure CLI:

```shell
az extension add --name aks-preview
```

Then execute the following command to register the permission features we'll need:

```shell
az feature register --namespace "Microsoft.ContainerService" --name "spotpoolpreview"
```

This command takes a few minutes to run. To check the progress, periodically run the command below:

```shell
az feature list -o table --query "[?contains(name,'Microsoft.ContainerService/spotpoolpreview')].{Name:name,State:properties.state}"
```

While the result of this query is `Registering`, wait until it is `Registered`. Once registered, run the command to update the CLI:

```shell
az provider register --namespace Microsoft.ContainerService
```

## Node Pools

Before we can proceed to create our cluster, we need to understand what are called [**Node Pools**](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan). They will be essential for us to save costs while using AKS.

Basically, a [Node Pool](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan) describes a group of Kubernetes _nodes_ that share common characteristics.

For example, we can have _nodes_ that are specific VMs for Machine Learning, or those that have more memory. The purpose of [Node Pools](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan) is precisely to allow people operating the cluster to have a choice to create their applications on the infrastructure that is most suitable for the type of work being performed.

In [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan), we have two types of [Node Pools](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan).

### System Node Pools

They are created automatically with the cluster and generally serve to store pods and deployments of the AKS and Kubernetes system. It's not a good practice to run custom workloads using the same [node pool](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan). Every [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) cluster must contain at least one system [Node Pool](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan) with at least one _node_.

### User Node Pools

As we can imagine, these are groups of _nodes_ created by the user. In these pools we have some interesting configurations, as we can specify both Windows and Linux for the machines that are executed, and we can also allocate machines of different sizes and categories than those defined in [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan).

### Execution Capacity

Each _node_ has a maximum pod execution capacity, meaning we can place a maximum number of pods within a VM before its resources are exhausted. For this reason, you can specify the number of _nodes_ within a pool up to a limit of 100.

In user pools you can set the number of _nodes_ to zero, while in system pools the minimum number is one.

### Creating a Node Pool

You can create a new pool in an existing cluster using [Azure CLI](https://docs.microsoft.com/cli/azure/?view=azure-cli-latest&WT.mc_id=blog-personal-ludossan) with the following command:

```bash
az aks nodepool add \
  -g <resource-group> \
  --cluster-name <cluster-name> \
  --name <pool-name> \
  --node-count <number-of-nodes> \
  --node-vm-size <VM-size-and-type>
```

## Scalability

When a _node_ reaches its maximum execution capacity, meaning when we've placed the maximum number of possible pods within that machine, we must increase, or scale, the number of _nodes_ within the pool. This can be done manually through the following command:

```bash
az aks nodepool scale \
  -g <resource-group> \
  --cluster-name <cluster-name> \
  --name <pool-name> \
  --node-count <new-number-of-nodes>
```

Scalability is one of the main reasons your cluster can become quite expensive. Mainly because the more machines, the more resources. And the more resources we use, the more we'll have to pay. For this reason it's highly recommended to use automatic ways to scale our pools, the primary one being [Cluster Autoscaler](https://docs.microsoft.com/azure/aks/cluster-autoscaler?WT.mc_id=blog-personal-ludossan).

### Cluster Autoscaler

Scalability should be automatic, as it's much safer and also saves much more money because it will always increase the number of _nodes_ when necessary and reduce the number of nodes when they no longer need to be used. You can activate the [autoscaler](https://docs.microsoft.com/azure/aks/cluster-autoscaler?WT.mc_id=blog-personal-ludossan) in an existing cluster through the command:

```bash
az aks update \
  -g <resource-group> \
  -n <cluster-name> \
  --enable-cluster-autoscaler \
  --min-count <minimum-number-of-nodes> \
  --max-count <maximum-number-of-nodes>
```

## Spot Instances with Node Pools

One of the most efficient ways to save money while using [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan) instances is through the use of multiple [node pools](https://docs.microsoft.com/azure/aks/use-multiple-node-pools?WT.mc_id=blog-personal-ludossan) with what are called [Spot Instances](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan).

### Spot VMs

[Spot VMs](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan) are virtual machines that offer all the scalability features a normal VM would have, but still reduce costs through the use of **spare computing capacity**. This means that [Spot VMs](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan) use computing power that is not currently being used by Azure, guaranteeing significant discounts on their prices.

However, this all comes with a price. [Spot Instances](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan), because they take advantage of unused computing power, **can be shut down or interrupted at any time**. This means that while using the VM, you'll receive a notification 30 seconds before the machine is deallocated. After this time, the machine will enter a deallocation state and its computing will be stopped abruptly.

For this reason, [Spot VMs](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan) are very good when we use applications that don't maintain state and can be interrupted at any time, restarting their processes whenever necessary. Some use cases:

- Batch processing
- Stateless applications
- Development environments
- CI/CD pipelines

### Combining Forces

Using [Spot VMs](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan) with node pools gives great power to save significant money when processing large-scale data. Mainly because, when we use [Spot VMs](https://docs.microsoft.com/azure/virtual-machines/spot-vms?WT.mc_id=blog-personal-ludossan) with node pools, we have the ability to choose between two deallocation policies:

- **Deallocate**: When the policy is set to deallocation, the machine will be stopped and deallocated when the VM reaches a state where there is no more computing power. You can deploy it again when capacity becomes available, but remember that all CPU allocation and disk costs continue to be charged.
- **Delete**: In this case, the machine will be completely removed and you will not be charged for any more resources consumed.

## Spot Node Pools

[Spot Node Pools](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan) allow you to set a maximum hourly value to pay. When the value is reached, the machine will be deallocated or removed according to the selected policy.

> Although they guarantee a reduction in costs, [Spot node pools](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan) are not recommended for any type of critical workload, as their availability is not guaranteed.

To create a [spot node pool](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan), we can use the following command:

```bash
az aks nodepool add \
  -g <resource-group> \
  --cluster-name <cluster-name> \
  --name <pool-name> \ 
  --enable-cluster-autoscaler \
  --min-count <minimum-number-of-nodes> \
  --max-count <maximum-number-of-nodes> \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
```

When we set the hourly price value to `-1`, the _nodes_ will not be removed based on price and the new instances created will be based on the lower value between the current price of spot VMs or the default value of a _node_.

### Creating Resources in the New Pool

To create resources in our [spot node pools](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan), we need to understand the concept of Kubernetes [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) (we'll have an article about this coming soon). And also the concept of [Node Affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/).

In short, each _node_ has a _taint_. These _taints_ repel new pods from being created on these _nodes_ unless these pods have a _toleration_ for that specific _taint_. It's a way to choose which VM your applications will be created on.

By default, all nodes created within a [spot node pool](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan) will have a _taint_ of type `kubernetes.azure.com/scalesetpriority=spot:NoSchedule`. This means that unless the pod has a _toleration_ of the same type, no other pod can be scheduled on that _node_.

To create a pod, or any other workload, within a _node_ that is present in a [spot node pool](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan), we need to define a new _toleration_ in the pod's declarative file, for example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
  labels:
    env: example
spec:
  containers:
  - name: example
    image: node
    imagePullPolicy: IfNotPresent
  tolerations:
  - key: "kubernetes.azure.com/scalesetpriority"
    operator: Equal
    value: spot
    effect: NoSchedule
```

Notice that we defined an operator so it equals the _taint_ of the _node_ in question, therefore new pods will be created on this _node_.

## Conclusion

Although it's extensive work, the use of [spot node pools](https://docs.microsoft.com/azure/aks/spot-node-pool?WT.mc_id=blog-personal-ludossan) can be a lifesaver in terms of resources when we're working on cost optimization in [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=blog-personal-ludossan), but always remember that spot machines are not machines that guarantee high availability!

I strongly recommend reading the documentation about [AKS cost optimization baseline](https://docs.microsoft.com/azure/architecture/reference-architectures/containers/aks/secure-baseline-aks?WT.mc_id=blog-personal-ludossan#cost-optimization), amazing documentation about how you can define policies and best practices for AKS clusters in production.

In this article we talked a lot about more advanced Kubernetes concepts, like _taints_ and _tolerations_. I'm preparing an article just about these concepts and also about another really interesting tool from this container orchestrator, so don't forget to subscribe to the newsletter to receive this content and also weekly news! Like and share your feedback in the comments!

See you soon
