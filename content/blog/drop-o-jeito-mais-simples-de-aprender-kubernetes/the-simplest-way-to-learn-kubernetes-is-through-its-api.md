---
title: The simplest way to learn Kubernetes is through its API
pubDate: 2021-05-06T18:50:34.000Z
updatedDate: 2026-07-16T16:16:01.000Z
category: infra
tags:
  - kubernetes
  - drop
  - containers
lang: en
description: In this short article we'll discover the simplest way to learn the concepts behind Kubernetes in a practical way.
slug: the-simplest-way-to-learn-kubernetes-is-through-its-api
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

> **NEWS!**  
> This is the first article in a new type of content I'm calling [_drop_](/tags/drop/). Drops are short texts (up to 5 minutes of reading) that show interesting aspects of a topic. Generally, they'll be small tutorials or interesting tips.  
>   
> The goal of these drops is so I can create content more frequently, instead of creating long content weekly, which was becoming quite heavy for me, as the blog's only writer/editor.  
>   
> Hope you like it :)

---

One point almost every dev agrees on is that Kubernetes is quite complicated. Especially for those who are learning and those just entering the world of distributed applications and containers.

Despite there being [excellent books](https://amzn.to/3tksp5H) on the subject, the content is still complex and requires people to think a bit outside what we're used to seeing in a traditional deploy environment. In part, this comes because we need to configure many extensions and Kubernetes is [absurdly extensible](https://amzn.to/3b9EELZ), so we think Kubernetes is one big system, but actually it's made up of various small APIs that manipulate files.

## The big idea

The big idea behind Kubernetes is that everything is a small file, just like Unix showed us before, this is an excellent idea when working with extensible configurations.

Simplifying the flow A LOT. When we create a Deployment, a Pod, a Service, what we're actually doing is adding an item to a database (etcd) which, in turn, is monitored by a series of _control loops_ that we call _controllers_. And it's these controllers that actually do the work of synchronizing the desired and existing states of this cluster.

The coolest part of all this is that Kubernetes has a very good API for us to get these resources.

## Understanding the API

The entire Kubernetes API follows REST strictly. So we'll always have a resource that starts like this:

```http
http://<dns do control plane>/api/<version>/namespaces/<namespace>/<resource>/[name][?options]
```

First we need to get the address of our control plane. This is super simple, we can just run the command `kubectl cluster-info --context <context name>`.

> The context can be omitted if you want the information from the cluster in the current context.

This will give us output like this:[^n1]

```output
Kubernetes control plane is running at https://algundns.subdominio.tld:443
CoreDNS is running at https://algundns.subdominio.tld:443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
Metrics-server is running at https://algundns.subdominio.tld:443/api/v1/namespaces/kube-system/services/https:metrics-server:/proxy
```

### Security

The Kubernetes API is a simple REST server, but the security features used to keep your cluster secure, since this API has total control within the control plane, are well-developed.

The use of digital certificates attached to [user](/criando-e-gerenciando-usuarios-no-kubernetes/) and [RBAC](/dando-permissoes-a-usuarios-com-kubernetes/) objects of the system (or even using more advanced techniques [like AD](/azure-ad-aks/)) are employed to protect the information.

Since we're just doing a demonstration, we can use `kubectl` itself to manage this access for us, since it has all access data for all clusters. We just need to run `kubectl proxy &` to run a background process that will do port forwarding of the kubernetes API to a local port, so we can access the API data without worrying about permission settings.

```bash
$ kubectl proxy &
[1] 5705
Starting to serve on 127.0.0.1:8001
```

## Manipulating the API

Now that we have the cluster running locally, you can use your preferred request manager, such as cURL, wget, [postman](https://www.postman.com/). I'm using [insomnia](https://insomnia.rest/).

Let's get the list of pods from my cluster using the API with the request `GET http://localhost:8001/api/v1/namespaces/default/pods`:

![](./image.png "Insomnia manager showing the output of the request to get the Kubernetes pods")

Some resources, like deployments, are not in what we call the "core API" of Kubernetes. The core API is when we don't need to specify anything in the `apiVersion` field of the resource, like in Pods, which is `apiVersion: v1`, this means we can access it with `/api/v1`.

Deployments are part of `apps/v1`, for this we have a new base resource called `apis`, so we can get the list of deployments with `http://localhost:8001/apis/apps/v1/namespaces/default/deployments`:

![](./image-1.png "Insomnia with the response for the list of Kubernetes deployments")

The same applies to ingresses which are in `networking.k8s.io/v1beta1` (or in `v1` depending on your cluster version). This way the address is `http://localhost:8001/apis/networking.k8s.io/v1/namespaces/default/ingresses`

![](./image-2.png "Insomnia showing the output of the request for the list of ingresses")

> When we're dealing with the `default` namespace, which is the default, we can completely omit the `/namespaces/default` part, leaving just `http://localhost:8001/api/v1/pods`.

## Want to know more?

Take a look at the [Kubernetes API documentation](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.20/), or also pass the `-v6` flag to any `kubectl` command to see the path it's calling (if you pass `-v8` you'll also see the response body):

```bash
 $ kubectl get pods -v6
I0506 15:28:38.203647    6011 loader.go:379] Config loaded from file:  /home/khaosdoctor/.kube/config
I0506 15:28:38.796623    6011 round_trippers.go:445] GET https://dominio.subdominio.tld:443/api/v1/namespaces/default/pods?limit=500 200 OK in 580 milliseconds
```

And here's a list of excellent books about Kubernetes you can use to learn more!

https://www.amazon.com.br/gp/product/B07X2MQL1Q/ref=as_li_qf_asin_il_tl?ie=UTF8&tag=lsantosdev0e-20&creative=9325&linkCode=as2&creativeASIN=B07X2MQL1Q&linkId=c7a24400879d4b0f6d8a253d384c82f3

https://www.amazon.com.br/gp/product/B08455LHMY/ref=as_li_qf_asin_il_tl?ie=UTF8&tag=lsantosdev0e-20&creative=9325&linkCode=as2&creativeASIN=B08455LHMY&linkId=d14f51aed9a0a71eb8c2e832a51b5f71

https://www.amazon.com.br/gp/product/8575227785/ref=as_li_qf_asin_il_tl?ie=UTF8&tag=lsantosdev0e-20&creative=9325&linkCode=as2&creativeASIN=8575227785&linkId=b39929203ebd04959db95912ff457c26

https://www.amazon.com.br/gp/product/B088Q38BCR/ref=as_li_qf_asin_il_tl?ie=UTF8&tag=lsantosdev0e-20&creative=9325&linkCode=as2&creativeASIN=B088Q38BCR&linkId=2d0a398b3f5b0c6a290ab240b8af0736

https://www.amazon.com.br/gp/product/B08T21NW4Z/ref=as_li_qf_asin_il_tl?ie=UTF8&tag=lsantosdev0e-20&creative=9325&linkCode=as2&creativeASIN=B08T21NW4Z&linkId=80120ba132817865bb9b7c36e81033b3

[^n1]: This output may vary depending on where you're hosting your cluster.
