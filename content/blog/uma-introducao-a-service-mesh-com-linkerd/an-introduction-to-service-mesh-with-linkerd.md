---
title: An Introduction to Service Mesh with Linkerd
pubDate: 2020-09-10T21:26:02.000Z
updatedDate: 2026-07-16T16:24:46.000Z
category: infra
tags:
  - kubernetes
  - containers
  - linkerd
  - architecture
  - technology
  - development
  - cloud
lang: en
description: Observability, logging, traffic control. Everything you've always wanted for microservices in a simple and fast way with Linkerd
slug: an-introduction-to-service-mesh-with-linkerd
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

We [recently](/service-mesh-1/) discussed **Service Mesh** and how this architectural pattern can save your project by giving it more observability and ease of use.

We talked about Service Mesh in a very conceptual way. Now let's get hands-on and create our own mesh using [Linkerd](https://linkerd.io/)!

## Linkerd

![](./image.png "A brief history of Linkerd")

Linkerd is a project created inside Twitter in 2013, when the network was migrating its architecture from a layered platform to a microservices architecture. The **Linkerd** project was made open source in 2016 in what became known as version 0.1.

In 2017, the project was donated to [CNCF](https://www.cncf.io/) (Cloud Native Computing Foundation), which is an arm of the Linux Foundation dedicated to managing open source projects. Some [projects](https://www.cncf.io/projects/) like Kubernetes, Helm, Brigade, Harbor, Envoy, and CoreDNS are part of this incredible foundation.

Recently, in 2018, Linkerd reached version 2.0. Linkerd v2 was released fixing a series of problems and based on lessons learned in v1. The original project intended to be highly configurable, powerful, and cross-platform. Version 2, on the other hand, aimed to be much simpler. The main design objectives for version two were:

-   Zero configuration
-   Simple and lightweight
-   Designed for Kubernetes

By default, Linkerd already provides us with a series of native features:

-   **Protocol detection**: Linkerd can, in addition to proxying TCP and gRPC protocols, automatically detect whether traffic is HTTP or gRPC.
-   **HTTP 1.1/2 and gRPC proxy:** If any of these protocols is used, Linkerd can natively extract metrics, proxy, retry logic, and load balancing.
-   **Automatic injection and zero configuration:** As we'll see later, Linkerd is super simple to install, even in clusters with existing applications. This greatly facilitates tool adoption.
-   **Automatic mTLS by default:** By default, all internal communication is encrypted using mTLS.
-   **Observability:** In addition to logs and metrics, Linkerd can build a service graph based solely on incoming and outgoing traffic. All with metrics and data.
-   **Traffic splitting:** A technique quite common for distributed applications is called _Canary Deployment_. This is when we deploy applications partially, by redirecting part of the traffic gradually to the new application while the old application is still running. Linkerd natively provides this functionality.

### Architecture

To better understand what we're doing, let's try to understand how Linkerd works and what architecture it follows. For this we have two concepts that are inherent to **service mesh**.

-   **Control Plane:** Responsible for collecting and storing all information about requests and also controlling the flow of information.
-   **Data Plane:** Where your application is located and where we have data transfers.

![](./image-1.png "Overview of Linkerd architecture")

I won't go through all the layers of the system completely, as that's not the intent of the article, but I'll talk a bit about each one so we can understand how all the parts communicate.

#### Proxy

The only part that exists in the **data plane**. It's responsible for capturing information and metrics from the containers where your applications are running.

This is done through the injection of two containers within your Kubernetes pods:

-   Init Container: It will be executed before the pod's container and will configure access rules, IP, and routes so that all communication first goes through the Linkerd proxy.
-   Proxy Container: It's the layer that will capture requests and extract metrics for analysis.

#### Controller

It's the part with the most responsibilities. It contains the core of Linkerd and has several functions:

-   Hosts the API server
-   Acts as a CA (Certificate Authority) for mTLS
-   Service discovery information and load balancing for the proxy
-   Enables **tap**, which is real-time inspection of network traffic on one or more routes/applications
-   Automatically injects proxies into initiated containers

#### Web

One of the great conveniences of Linkerd is the existence of a web interface that shows and controls all aspects of the mesh.

![](./image-2.png "Linkerd web interface")

#### Prometheus

Service for collecting metrics from the proxy. Fetches and temporarily stores metrics collected from your applications.

Often the Kubernetes cluster already comes with a Prometheus service, the Linkerd service is not configured for analysis, only for performance, so it **does not store more than 6 hours of metrics**.

#### Grafana

Fetches metrics and displays them as graphs and dashboards.

![](./image-3.png "Grafana dashboard")

## What about Istio?

One of the main questions people ask when they look at Linkerd is:

> What's the difference between Linkerd and Istio?

Basically, we have some differences in the platform's focus and also in architecture. However, in short, Linkerd is a tool more focused on performance than Istio.

Istio is more focused on providing more tools and functionality and, therefore, is more complex than Linkerd. In my opinion, using Linkerd is much easier for those starting with **Service Mesh** than Istio.

## Creating a service mesh

It's time to move from theory to practice! Let's get hands-on and understand how we can create a service mesh using Linkerd.

To do this hands-on I will create a cluster on [AKS](https://docs.microsoft.com/azure/aks/?WT.mc_id=personal-blog-ludossan), but you can choose to do it on any Kubernetes cluster you have, **even on a cluster already in production** since Linkerd is non-destructive and installs its information in another namespace.[^n1]

Within this cluster I will deploy the application present in the repository below

https://github.com/Azure-Samples/aks-bootcamp-sample/tree/finished

This is a demonstration application that uses a front-end and a backend for communication. You can also follow using another application, for example, the [Linkerd sample application](https://linkerd.io/2/getting-started/#step-5-install-the-demo-app).

I will assume that the cluster is already created and that the application is already running so we can jump straight to the part that matters.

## Installation

To run Linkerd, first we need to install the command line tool with the command:

```sh
curl -sL https://run.linkerd.io/install | sh
```

And add it to our path with the command:

```sh
export PATH=$PATH:$HOME/.linkerd2/bin
```

> If you use Mac, then you can install Linkerd with Homebrew via `brew install linkerd`

### Validation

Before we install Linkerd on the cluster itself, let's perform a validation by running the command:

```sh
linkerd check --pre
```

This will ensure that all names and services are available for Linkerd to be installed.

![](./image-4.png "Successful command output")

Then we run the command:

```bash
linkerd install | kubectl apply -f -
```

Notice that this command is actually a combination, because Linkerd doesn't do any installation on the cluster, it only generates the output of a YAML file that can be used by the cluster to create its workloads, that's why we pipe to `kubectl apply -f -`. Try running just `linkerd install` and see the files displayed on the screen.

Then, we'll run the following command so we can check if the entire process was executed successfully:

```bash
linkerd check
```

If all went well, you should have an output like this:

![](./image-5.png "Successful output of linkerd check")

All Linkerd workloads are installed within their own _namespace_ called `linkerd`, so you can search for all the resources we mentioned through **kubectl** with the command:

```sh
kubectl get all -n linkerd
```

## First impressions

To start understanding how Linkerd works, you can type the command `linkerd dashboard &` and wait a few seconds for the web panel to open.

![](./image-6.png "Linkerd web panel")

Through this panel you will be able to execute all Linkerd features as well as check the status of your cluster, it can also act as a _dashboard_ for Kubernetes in a way. We just need to see the **Workloads** section in the left menu:

![](./image-7.png)

See that we're working in the _default_ namespace. This can be changed through the selection menu.

### Control Plane

If we click on the **Control Plane** section, we will have an overview of our entire **Service Mesh**.

![](./image-8.png "Control Plane visualization panel")

See that this panel shows us the entire system status and also the number of components we have installed.

Further down, we can see the number of namespaces that are _"meshed,"_ meaning they are injected by the Linkerd proxy so they are generating metrics:

![](./image-9.png "Notice that only one namespace is generating metrics")

## Adding metrics

Our application is in the `default` namespace, how do we include it in the **Service Mesh**? Simple! Let's execute the following command:

```bash
kubectl get deploy -o yaml
```

See that we have all the YAML files of our deployments, so let's create a pipe from this command to the `linkerd inject` command:

```bash
kubectl get deploy -o yaml | linkerd inject -
```

Now see the difference between the two files. The injected file will have an _annotation_ in the pod template like this:

![](./image-10.png "Linkerd annotation on the pod")

This is the only change made to your deployments, meaning it's very easy to inject Linkerd into services that **are already in production** without causing many side effects.

Let's apply the changes through another pipe to the `apply` command:

```bash
kubectl get deploy -o yaml | linkerd inject - | kubectl apply -f -
```

As soon as we apply the change we can see a movement in the _Control Plane_ so it will be reloading our pods again to include them in the metrics:

![](./image-11.png "The namespace is entering the mesh")

See that we don't have one of the pods sending metrics... The MongoDB pod is out of the mesh, but why?

Because in this example, it's a **StatefulSet** not a deployment! So let's execute the same command we executed earlier, but we'll replace `deploy` with `sts`.

```bash
kubectl get sts -o yaml | linkerd inject - | kubectl apply -f -
```

> **Important:** For this example I'm using a simple version of MongoDB within the local cluster, you can use a version hosted by any provider, such as Mongo Atlas, for example, or other solutions. The application only needs a MongoDB to function.

Now we have all the details:

![](./image-12.png)

## Tools

Linkerd gives us a series of interesting tools, let's explore some of them.

### Grafana

Click on the _namespace_ name in the Control Plane tab.

In addition to being able to verify the metrics within the Linkerd panel, we can also find a Grafana dashboard by clicking on the small orange icon in the right corner.

![](./image-13.png)

Let's open the panel for the `porto-backend` deployment:

![](./image-14.png "Our dashboard is empty")

See that the dashboard doesn't show any data... Why? Because we haven't made any requests that can be captured yet! Let's go into our application and create some access. To find the URL of your application use the `kubectl get ing` command to search for the ingresses and thus the URLs.

![](./image-15.png)

As soon as we start making some access we can see some data arriving:

![](./image-16.png)

And we can see what's happening in the grafana charts too!

![](./image-17.png)

We also have TCP traffic metrics:

![](./image-18.png)

In addition to this dashboard, we have other internal dashboards that Linkerd itself created.

### Real-time view

By clicking on our deployment within the namespace view, we can see in real-time the calls being made.

![](./image-19.png)

We can also see a map of the application that shows us which services are connected.

### Top

If we click on the `Top` menu in the Tools section of the left menu. We'll be able to select a namespace or resource so we can monitor in real-time. Select the `default` namespace and make some requests to the application. See that we start to have metrics tracking:

![](./image-20.png)

### Tap

Still in the same view, see that we have the icon of a microscope, this icon allows us to observe that specific route for more details.

Let's open the `Tap` tab in the left menu. Select the `default` namespace at the top and click `start`. As soon as we make some requests, we can see all of them in real-time.

![](./image-21.png)

By clicking on the left arrow, we'll have a detailed view of the request.

![](./image-22.png)

### Service graph

In my opinion, one of the coolest features of Linkerd is the service graph. To better represent how it works, let's go back to the **namespaces** view in the left menu and click on the `linkerd` namespace.

![](./image-23.png)

At the top of the screen we'll have a representation of the services that are talking to each other and which ones are sending requests. This is **very** useful when we're talking about very large meshes.

## Removing Linkerd

To remove linkerd from a namespace just run the command

```bash
kubectl get deploy -o yaml | linkerd uninject - | kubectl apply -f -
```

That is, the same way we run `inject`, we also run `uninject`.

## Conclusion

Linkerd can greatly ease the life of those developing distributed applications, because it's simple and easy to install, it has a great advantage over other Service Mesh systems and can prove to be an excellent addition to your infrastructure.

Don't forget to subscribe to the newsletter to receive this content and also weekly news! Like and share your feedback in the comments!

See you later!

[^n1]: You can also use solutions to run K8S locally with [minikube](https://kubernetes.io/docs/tasks/tools/install-minikube/), [Docker](https://www.docker.com/products/docker-desktop), or [other options](https://kubernetes.io/docs/setup/)
