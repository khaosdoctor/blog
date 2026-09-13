---
title: "Introducing the KEDA HTTP Add-on"
pubDate: 2021-07-02T20:01:58.000Z
updatedDate: 2026-07-16T16:13:51.000Z
category: "infra"
tags: ["keda", "kubernetes", "containers"]
lang: en
description: "Learn how to scale your Kubernetes applications based on HTTP requests in Kubernetes with the KEDA HTTP Add-on"
slug: "introducing-the-keda-http-add-on"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

One of the things that makes me even happier about working with open source is when we can turn projects into reality and help a lot of people with what we set out to do!

A while back, I started a journey helping the [KEDA](https://keda.sh) maintainers create a new add-on for the ecosystem and, finally, this add-on has been published and is in beta!

## What is KEDA

Today we have a number of ways to scale workloads in Kubernetes, all of them use the native Autoscaling API to create what we call _HorizontalPodAutoscalers_.

These scalers let us scale based on machine resources, like CPU and memory, and also (with a fair amount of difficulty) custom metrics coming from other services such as the request count or requests per second of a standard ingress controller.

But precisely because of how hard it is to do this kind of scaling natively, other projects appeared to make scaling easier not only through local metrics, but also from external services. And, most importantly, to let us scale applications down to **zero**.

The most common case is when we have an application that is a _worker_, meaning it listens to a message queue and processes only one message at a time. It makes no sense for this application to be running all the time, since it will not be doing any work most of the time, just consuming machine resources. It would be far more efficient to have no active workers until a message exists in the queue.

And that is where **KEDA** (which stands for _Kubernetes Event Driven Autoscaling_) comes in. KEDA works with a set of _scalers_, each scaler is itself a small application that connects to a metrics source and passes them along to the main controller, which decides whether or not to scale a target application.

That way we can scale based on several services. In fact, KEDA has [an extensive list of already supported scalers](https://keda.sh/docs/2.3/scalers/), but none of them allowed something very simple yet very useful: scaling based on the number of HTTP requests.

## HTTP Add-on

Scaling applications based on their incoming traffic is something we do not think about much, because almost always we have a site that keeps receiving thousands of requests per minute or per second, meaning we always have to keep that site up.

But maybe that is not the reality, and that is why, with KEDA, we could plug in a scaler using Prometheus to extract request metrics, but that would require instrumentation and also installing Prometheus on your instance, even if you were not using it as your main monitor. With that in mind, we started developing the idea of what would become an add-on for KEDA itself, not a scaler, but part of the product.

[The official launch article](https://keda.sh/blog/2021-06-24-announcing-http-add-on/) for the project explains a bit about the configuration and gives a short tutorial on how to start working with the KEDA Add-on, but I am still going to write a short tutorial and explain some of the base concepts we came up with.

### How does it work?

The add-on is based on three main components that follow the same idea as the kubernetes _operator_ pattern:

-   **Interceptor:** This is the main component, it intercepts all HTTP requests coming to your application's service and checks whether the service already has at least one application to serve the request, then it counts and does a simple forwarding to the destination application. Otherwise, it "holds" the request until the application is scaled.
-   **External Scaler**: This is a component that already exists in KEDA, the ability to create your own scaler and implement a defined gRPC interface makes it very scalable. This is a [push type scaler](https://keda.sh/docs/2.1/scalers/external-push/) that pings the interceptor to find out the pending queue count and then transforms this data so KEDA can understand it.
-   **Operator:** The operator is the control brain, it runs for the convenience of not having to create all these applications manually. Since the add-on is based on [CRDs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/), creating a new CRD of type `HTTPScaledObject` causes both the service and the interceptor and the scaler to be created for your application.

The architecture works like this:

![](./image.png "KEDA HTTP project architecture")

Note that the add-on does not interfere with the user's application, which keeps full control over the load balancer and the ingress, as well as the services and the application deploy.

## How to use it

Since this project is a KEDA add-on, we first need to install KEDA on a Kubernetes cluster. To make it easier, let's install everything using Helm:

```sh
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install --create-namespace -n <namespace> keda kedacore/keda
```

Then we can install the add-on operator from the same charts service:

```sh
helm install \
  --create-namespace <namespace> \
  http-add-on \
  kedacore/keda-add-ons-http
```

Then we can create an `HTTPScaledObject`:

```yaml
apiVersion: http.keda.sh/v1alpha1
kind: HTTPScaledObject
metadata:
  name: meuApp
spec:
  scaleTargetRef:
    deployment: meuDeployment
    service: meuService
    port: 8080
```

That is enough for the add-on to create everything for you and start scaling your app!

## Conclusion and next steps

Right now the **application is still in beta** so we do not recommend using it in production, since the API may change drastically in the future. There are several new proposals we are considering, like north-south traffic through Ingresses and the [Gateway API](https://github.com/kedacore/http-add-on/issues/33) and also east-west (service to service communication) using [service meshes](https://github.com/kedacore/http-add-on/issues/6).

On top of that, we are [constantly updating the project](https://github.com/kedacore/http-add-on/) and creating new issues and helping with the future development of the project!

This project is a joint effort by many people, including myself, and the thanks go to:

-   [Aaron Schlesinger](https://github.com/arschles)
-   [Aaron Wislang](https://github.com/asw101)
-   [Tom Kerkhove](https://github.com/tomkerkhove/) and the whole [KEDA maintainers](https://github.com/orgs/kedacore/teams/keda-maintainers) group
