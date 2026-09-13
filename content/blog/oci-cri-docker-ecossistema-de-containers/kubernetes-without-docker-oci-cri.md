---
title: "Kubernetes without Docker? – Understanding OCI, CRI and the container ecosystem"
pubDate: 2021-02-02T13:00:00.000Z
updatedDate: 2026-07-16T16:19:22.000Z
category: "infra"
tags: ["docker", "containerd", "oci", "cri", "kubernetes", "containers", "architecture", "technology"]
lang: en
description: "Recently Kubernetes began deprecating Docker. What does this mean for you? What is this alphabet soup of OCI, CRI, RunC? Let's dive in and learn more about the container ecosystem!"
seoTitle: "OCI, CRI, Runtimes? Understanding the container ecosystem."
seoDescription: "Recently Kubernetes began deprecating Docker. What does this mean for you? Let's dive in and learn more about the container ecosystem"
slug: "kubernetes-without-docker-oci-cri"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

_Cover image by [ItsVit](https://itsvit.com/blog/docker-kubernetes-till-death-us-part/)_

Recently the Kubernetes team announced they would be [discontinuing Docker support](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md#deprecation) starting with version 1.22. In this article we'll discuss this change and I'll explain what all the tools we have available today to run our containers are. So let's dive into this alphabet soup of CRI, OCI, ContainerD and much more!

## Docker and Kubernetes

Docker and Kubernetes have been walking hand in hand for quite some time. Every node in a Kubernetes cluster is equipped with a Docker implementation, which makes it possible to use the Docker socket for various implementations. In short, you can mount the socket inside your pod and use the "Docker" that is available on the node from within your container.

Starting with version 1.22, the team announced they would no longer use Docker as the default runtime. In other words, if you're using the Docker socket or mounting it inside a pod in some way, you'll need to look for other options. But don't worry, **docker images (produced by `docker build`) will continue to be accepted by the cluster normally**, and we're about to understand why. The reason is that in reality Docker was causing more problems than solutions.

### CRI - Container Runtime Interface

Since earlier versions of Kubernetes, like 1.3 and 1.5, there have been discussions about Kubernetes supporting various types of container execution runtimes (like [Docker](https://docker.com) and [RKT](https://coreos.com/rkt/)). Until that point, both runtimes were already supported, but they were so tightly integrated with the tool that they were ceasing to be an abstraction and becoming part of what the Kubelet (the container management daemon) was.

Below we have a nice diagram [made by Michael Brown, from](https://developer.ibm.com/technologies/containers/blogs/kube-cri-overview/) [IBM](https://developer.ibm.com/technologies/containers/blogs/kube-cri-overview/), about how we can imagine the Kubernetes architecture and where the Kubelet fits in all of this.

![](./image-1.png)

Kubernetes, among all things, is a tool that starts and stops containers. For this to happen, the Kubelet needs to communicate with the runtime managing the containers. This was done directly in the code, meaning the Kubelet had a specific code layer to handle each runtime. Whenever the runtime was changed, the application needed to be recompiled and reexecuted.

Furthermore, implementing a runtime directly opens up a huge possibility that the implemented tools (like Docker, for example), which are constantly changing and evolving, could break Kubernetes itself due to their updates.

To have the ability to switch runtimes without needing to recompile the entire cluster, the [Kubernetes team created](https://kubernetes.io/blog/2016/12/container-runtime-interface-cri-in-kubernetes/) what was called the **CRI, or Container Runtime Interface**.

CRI is a plugin that allows a Kubelet to distance itself from the runtime layer by using an API made with gRPC. In short, the team decoupled the Kubelet application from the runtime, allowing them to be inserted as plugins, requiring only that they implement the corresponding gRPC interface. Now, instead of the Kubelet having to adapt to changes in runtime interfaces, the runtimes would have to create a plugin that would follow a mandatory Kubelet interface. This way, maintenance and contribution become much easier.

![](./image.png "Diagram of how CRI works")

We won't go into details about gRPC implementation, but the list of supported services is described in a fairly intuitive protofile:

```protobuf
service RuntimeService {

    // Sandbox operations.

    rpc RunPodSandbox(RunPodSandboxRequest) returns (RunPodSandboxResponse) {}  
    rpc StopPodSandbox(StopPodSandboxRequest) returns (StopPodSandboxResponse) {}  
    rpc RemovePodSandbox(RemovePodSandboxRequest) returns (RemovePodSandboxResponse) {}  
    rpc PodSandboxStatus(PodSandboxStatusRequest) returns (PodSandboxStatusResponse) {}  
    rpc ListPodSandbox(ListPodSandboxRequest) returns (ListPodSandboxResponse) {}  

    // Container operations.  
    rpc CreateContainer(CreateContainerRequest) returns (CreateContainerResponse) {}  
    rpc StartContainer(StartContainerRequest) returns (StartContainerResponse) {}  
    rpc StopContainer(StopContainerRequest) returns (StopContainerResponse) {}  
    rpc RemoveContainer(RemoveContainerRequest) returns (RemoveContainerResponse) {}  
    rpc ListContainers(ListContainersRequest) returns (ListContainersResponse) {}  
    rpc ContainerStatus(ContainerStatusRequest) returns (ContainerStatusResponse) {}

    ...  
}
```

Now it's enough for the Kubelet to access the CRI's gRPC API as a client and it can communicate with any runtime that implements this same functionality, thus decoupling the logic of dealing with the runtime directly from Kubernetes and passing it to the responsible CRI that can be executed as a plugin.

To complement the list of supported runtimes, a series of CRIs were developed:

-   [CRI-O](https://cri-o.io/): a runtime that conforms to the OCI specification (which we'll see soon)
-   [rktlet](https://github.com/kubernetes-incubator/rktlet): runtime for RKT
-   [dockershim](https://github.com/kubernetes/kubernetes/tree/release-1.5/pkg/kubelet/dockershim): The CRI for Docker (which caused all this problem)

### The problem

The big problem is that Docker was built to be a separate application, maintained by its own company, and was not made to be included inside a cluster like Kubernetes (in fact, Docker has its own "Kubernetes" with Docker Swarm).

This happens because Docker itself is not just a single application, but an entire stack: a CLI, APIs, sockets, the Docker Engine, and a runtime called ContainerD (more details [in this article](https://medium.com/better-programming/an-overview-to-docker-architecture-15407c482c52#id_token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ijc4M2VjMDMxYzU5ZTExZjI1N2QwZWMxNTcxNGVmNjA3Y2U2YTJhNmYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYmYiOjE2MTA1NTgzMzMsImF1ZCI6IjIxNjI5NjAzNTgzNC1rMWs2cWUwNjBzMnRwMmEyamFtNGxqZGNtczAwc3R0Zy5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjExNjIyOTU0MTc3NjU0NjQyOTk5NiIsImVtYWlsIjoibGhzLnNhbnRvc3NAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF6cCI6IjIxNjI5NjAzNTgzNC1rMWs2cWUwNjBzMnRwMmEyamFtNGxqZGNtczAwc3R0Zy5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsIm5hbWUiOiJMdWNhcyBTYW50b3MiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EtL0FPaDE0R2otc1JnRWpFTXJZMzh4aEVZcFRnYlV6a3VkNlpYTEFaQ0M1Nk5PLWdJPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6Ikx1Y2FzIiwiZmFtaWx5X25hbWUiOiJTYW50b3MiLCJpYXQiOjE2MTA1NTg2MzMsImV4cCI6MTYxMDU2MjIzMywianRpIjoiMWEwYTBlZmMyMmFjNmI4MjNlM2FmYzQ1Y2I2N2UxOWM2NWI5ZDUxZSJ9.ZK7VFwyD51uOQ8IjMcSXUBxUI1YDhZUuvEUJhWf_zCNtOoc4w6QVZ63x2j3dugxn3xkkbXJFxeYpGA2qHnWemp4_60faoY-V6zjT9Gmafwk2Ubp2h6pxoB9X1-VPZ_vahjRu_U4lbPEcsr_hLmWvpaHKPGOCQMABe2D5vtc0BIX3JHGSpEWBMd3lNuqRolcADW32a6AmFcNOQnQ90hk1RgAiBKwRvnVL938wwfvUG7ES0TBsL814VfHi5Apuuzq60VpPa1NFLz6JGzz2PwKw8gl6ZX4pL5SFYuuONwT8-KgRes7LSi_iSJQjiitPqXMECT7ZTnajiUD8fGmLnBgqBQ)). What Docker did for society and the dev world was transform the way developers use containers in Linux environments (as I already explained [in this article](https://www.freecodecamp.org/news/what-is-docker-used-for-a-docker-container-tutorial-for-beginners/)). However, all of that serves no purpose for Kubernetes, because it is not a human.

So, to use only the important part of Docker (the `containerd`), the Kubernetes team had to develop what is called Dockershim, a [shim](https://en.wikipedia.org/wiki/Shim_\(computing\)) (a library that modifies calls to the docker API transparently). This is terrible because it adds a new tool that needs to be maintained by the team and another point of failure that could break the entire ecosystem. And it was Dockershim that was deprecated in version 1.20 and will be discontinued in 1.23.

The issue behind all this is that Docker is not compatible with CRI, never was, and probably never will be. As the team itself says:

> If it were, it wouldn't need the shim, and this wouldn't be happening.

### And now?

Now what's left is to find a new runtime to be able to run containers inside Kubernetes. It's not a difficult task, since Docker itself was using ContainerD, so we just need to extract ContainerD and use it independently!

Many people are wondering if this change will break the entire ecosystem and no one will be able to run containers on Kubernetes anymore. That's not true. As we said in the first paragraphs, the runtime we use on our machines to build Docker containers is an installation aimed at human users that prioritizes UX, but produces an image that is compatible with the **OCI (Open Container Initiative)**. For Kubernetes, every OCI image is the same image and can be executed by a runtime compatible with the same specification.

## What is OCI?

[OCI](https://opencontainers.org/about/overview/) stands for Open Container Initiative. It's an open source governance structure formed along the same lines as the Linux Foundation. OCI's main objective is to create a market standard followed by all companies working with containers, so that everyone follows the same interfaces for container and image formats. This greatly facilitates interoperability between tools and runtimes, so that an image compatible with OCI can be executed by any runtime that is also compatible.

It was created in 2015 by Docker itself, CoreOS, and other leaders in the container market.

In essence, OCI has two specifications, one for images (called `image-spec`) and another for runtimes (called `runtime-spec`). The image specification describes, among other things, how an image should be formed, what its manifest structure should be, and what system architecture-specific information an image needs to have so it can be executed in any OCI runtime implementation. The complete `image-spec` specification can be found [here](https://github.com/opencontainers/image-spec/blob/master/spec.md).

Similarly, the `runtime-spec` describes how a runtime should behave, including how the filesystem should manage and unpack images on disk. It also specifies some UX rules that should be expected from any runtime that follows the specification, such as running an image with no arguments, like in `docker run nginx:latest`. The entire specification can be found [here](https://github.com/opencontainers/runtime-spec/blob/master/spec.md).

### RunC

In addition to creating the specification, OCI also maintains an implementation of its own specification called `runc`, which was donated by Docker at the beginning of the project.

[RunC](https://github.com/opencontainers/runc) is the default runtime behind both ContainerD and CRI-O, and is currently one of the most comprehensive implementations available. We can see the implementation of ContainerD and RunC directly in Docker's architecture in the image below from [this article](https://www.docker.com/blog/what-is-containerd-runtime/) by Docker:

![](./image-3.png)

## Kubernetes after Docker

After deprecating the Dockershim interface, using ContainerD directly makes the overall Kubernetes architecture much simpler to understand.

This comes in part because ContainerD itself already has integration with CRI via a plugin that is enabled by default. So the Kubelet communicates with ContainerD's CRI plugin, which in turn executes the `runc` implementation and then the actual containers, as shown in the diagram below, also by Michael Brown:

![](./image-2.png "Diagram of how ContainerD works with the Kubelet")

The ContainerD daemon handles all Kubelet calls through the CRI plugin, calling the necessary shims for modification (which are maintained by the ContainerD team itself) and executing containers through `runc`.

## Conclusion

In this article we didn't show as much about ContainerD as I would have liked, but I'm splitting it into two parts so we can have a specific article where we can talk a bit more about ContainerD alone!

I hope you enjoyed it!
