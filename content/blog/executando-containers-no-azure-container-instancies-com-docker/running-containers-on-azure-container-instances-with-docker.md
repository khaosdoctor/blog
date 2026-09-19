---
title: Running Containers on Azure Container Instances with Docker
pubDate: 2020-08-03T13:00:00.000Z
updatedDate: 2026-07-16T16:27:22.000Z
category: infra
tags:
  - containers
  - docker
  - azure
  - technology
  - cloud
lang: en
description: Have you ever imagined what it would be like if you could run a container directly on cloud infrastructure without doing anything new?
slug: running-containers-on-azure-container-instances-with-docker
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

If you already use Docker, then you've probably run a container on your machine. But have you ever imagined what it would be like if you could run a container directly on cloud infrastructure without doing anything new?

Last month, the Docker team [announced](https://www.docker.com/blog/running-a-container-in-aci-with-docker-desktop-edge/) that the new versions of Docker for desktop (called _Edge_ versions) would gain **native** support for **[Azure Container Instances](https://azure.microsoft.com/services/container-instances/?WT.mc_id=personal-blog-ludossan)**, meaning we could run containers from our machine directly to a cloud environment without having to download any image locally!

## Azure Container Instances

[Azure Container Instances](https://azure.microsoft.com/services/container-instances/?WT.mc_id=personal-blog-ludossan) (ACI) is one of the products offered by [Azure](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan) that allows you to deploy an application in a container without worrying about virtual machines or any other kind of infrastructure.

I've used [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan) when we did a talk for #CodeInQuarentena. In the video below you can see where we created a complete API using Mongoke and [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan)

![](https://www.youtube.com/watch?v=wsDC5tXR7QA)

Essentially, [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan) is a way for you to run your application as a container online. That way the only thing you need is an [Azure account](https://azure.microsoft.com/free/search?WT.mc_id=personal-blog-ludossan) and an application that's already inside a container. The best part is that everything is charged by the **second** of usage, so you don't really pay for idle compute. Which is excellent for applications that need to be created and destroyed quickly.

But how can [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan) be integrated with Docker?

## Integrating ACI with Docker

Let's integrate Docker with [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan). Assuming you already have an [Azure account](https://azure.microsoft.com/free/search?WT.mc_id=personal-blog-ludossan) and know a bit about Docker, what you need to do is **download Docker Edge**.

### Docker Edge

Docker Edge is an experimental version of Docker that receives all updates that haven't yet been released in the general availability version. For the integration with [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan) to happen, since it's still an experimental flag, we need to download the Docker Edge version. [This repository](https://github.com/docker/aci-integration-beta#macos-and-windows-installation) has all the necessary links for installation on various platforms.

> If you **already** have Docker installed on your machine, you'll need to remove the official CE version and install Docker Edge. It's not possible to have both versions installed on the same machine.

Once Docker is installed, you should see this screen:

![](./image-9.png "Image showing the Docker Edge preferences main page")

Check the `Command Line` tab to see if you have the `Enable Cloud Experience` option enabled:

![](./image-10.png 'Image showing the "Enable Cloud Experience" option enabled in Docker tools')

With that you already have the integration active, now what we need to do is create a context!

### Docker Context

[Docker contexts](https://docs.docker.com/engine/context/working-with-contexts/) are not a new feature. The purpose of contexts is to allow you to change where you're working. This became particularly interesting after the advent of [Kubernetes for Docker](https://docs.docker.com/docker-for-windows/kubernetes/), because with contexts you can switch between using the Docker engine, Kubernetes within Docker, or even a Docker Swarm context.

With [ACI](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=personal-blog-ludossan) it's no different, we need to create a context for cloud integration! This is quite simple, first we need to log in to Azure using the following command:

```bash
$ docker login azure
```

After that, you'll be taken to the Azure website to log in, and once that's complete, you can go back to the CLI and run the following command:

```bash
$ docker context create aci nome-do-contexto
```

Next you'll need to choose your subscription and then the resource group that will be used to push the images. Once done, you can run the `docker context ls` command to see all existing contexts and your integration is complete!

## Creating a container

To run this example, we're going to use a public image I have on Docker Hub called [Simple Node API](https://hub.docker.com/repository/docker/khaosdoctor/simple-node-api).

Let's start by switching our context to the new context we created using the command `docker context use <context-name>`.

To deploy, we can run the command we're used to, `docker run`:

```bash
$ docker run -d -p 80:80 --name node-api -e PORT=80 khaosdoctor/simple-node-api
```

Here's the output we'll get:

To find the address we need to access to see our API online, we'll run `docker ps` and look for the contents of `PORTS`.

See that I need to access the IP `13.86.141.148` to see the API result in the browser, let's go!

![](./image-11.png 'Image showing the browser accessing the previous IP and the API result with the phrase "Hello World"')

See that if we access the Azure portal, we'll have our resource created as if we had created it manually!

![](./image-12.png 'Image of the Azure portal with our "node-api" resource created')

To remove it, just run the command `docker rm <name>`. Note that it's not possible to run the `docker stop` command because this type of integration doesn't allow us to stop the container remotely. If we run `docker rm node-api` we'll have our ACI removed from Azure and our container stopped!

## Other applications

We can also use ACI to create multi-container applications using Docker Compose. For this, we'll use the example that Docker gives us from the DockerCon website! We have the following YAML file:

```yaml
# docker-conpose.yaml
version: '3.3'

services:
  db:
    image: bengotch/acidemodb
  
  words:
    image: bengotch/acidemowords
  
  web:
    image: bengotch/acidemoweb
    ports:
      - "80:80"
```

We follow the same process. However, instead of running the `docker run` command we'll run the `docker compose up -d` command.

> Note that we don't have a `-` between `docker` and `compose` as you would expect when running the command locally. That's because `compose` is a command of the integration itself!

Then we can use the `docker ps` command normally to get the public IP and see the site live:

![](./image-13.png "DockerCon website live using the ACI integration")

### Limitations

-   ACI does not support port mapping, so you need to make sure your container is running on the same port on both the host and the container using the `-p port:port` flag (see [this issue](https://github.com/docker/aci-integration-beta/issues/5))
-   Not all commands present in Docker are present in the integration (see [this other issue](https://github.com/docker/aci-integration-beta/issues/4) for more details)

## Conclusion

With ACI integration we can integrate much faster with Azure and this greatly facilitates the development of cloud-focused applications! Try it yourself!

Don't forget to subscribe to the newsletter below for more exclusive content and weekly news! Like and share your feedback in the comments right after the post!

See you later.
