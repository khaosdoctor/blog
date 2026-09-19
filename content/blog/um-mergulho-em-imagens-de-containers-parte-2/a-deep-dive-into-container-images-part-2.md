---
title: A Deep Dive into Container Images - Part 2
pubDate: 2020-07-29T13:00:00.000Z
updatedDate: 2026-07-16T16:27:56.000Z
category: infra
tags:
  - containers
  - docker
  - golang
  - development
  - technology
series: container-images
seriesOrder: 2
lang: en
description: We already know what each type of image is for. Let's apply our knowledge to a compiled application! Is the smallest image always the best?
seoDescription: Now that we know what each type of image is for, it's time to apply our knowledge to an application!
slug: a-deep-dive-into-container-images-part-2
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In the [previous post](/um-mergulho-em-imagens-de-containers-parte-1/?utm_source=series&utm_medium=post&utm_campaign=deep_dive_2) of our series we talked a bit about what container images are and how they are divided. We covered what a `slim` image is, a `full` image, and we talked about `alpine` images. But what impact does this have on your application?

## The Application

We're going to build a simple application using Go that serves a static HTML file to describe how we can optimize our image for our application.

We're not going to develop this application here, we're just going to imagine the following situation:

-   We have a Go application that serves a static HTML file
-   This application compiles without errors, is small and fast

## Optimizing the Build

For compiled languages like Go, C#, Java and others, a good practice even before choosing any base operating system is to optimize the compilation, or **build** of the application. For this, what is generally used, but not widely known, is what is called **[multistage builds](https://docs.docker.com/develop/develop-images/multistage-build/).**

When we compile an application, the container that is doing this compilation generally has all the tools necessary for the compilation to be done. This includes tools that **are not** necessary in the runtime environment. For example, with Go, we don't need to have the entire runtime installed, because it's already capable of running as a single binary, so it doesn't make sense to have all this tooling installed in our container that will be executed in production.

And that's what **[multistage builds](https://docs.docker.com/develop/develop-images/multistage-build/)** do. We start with a container, containing all the tooling for the build of the application, usually a container specific to that language, and then we move only the generated binary at the end to a new empty container. In this empty container we don't have any of these tools that we won't need to use in production.

This type of build is used to keep production images as small as possible, so we don't have network input and output problems and we also have less data to download! And the great advantage is that we can do this directly from our Dockerfile!

### Creating an Optimized Build

To start, we're going to create a Dockerfile. Inside it we'll create the steps responsible for having the application built:

```Dockerfile
FROM golang:1.11-stretch as build

WORKDIR /go/src/github.com/khaosdoctor/webapp

COPY web.go web.go

RUN CGO_ENABLED=0 GOOS=linux go build -o ./bin/webapp github.com/khaosdoctor/webapp

FROM debian:stretch

RUN mkdir -p /web/static/ 

COPY --from=build /go/src/github.com/khaosdoctor/webapp/bin/webapp /usr/bin
COPY index.html /web/static/index.html

WORKDIR /web

EXPOSE 3000

ENTRYPOINT ["webapp"]
```

Notice that we're naming the first container as `FROM <imagem>:<tag> as build`. The `as build` is what names our intermediate container and tells us that this container will not be the final step in our build pipeline.

Notice that we're using a `full` image in the build. This is okay because this container will be discarded.

Let's skip a line and create our next container, which will be the final container with our application already built for production:

```Dockerfile
# Start of build container
FROM golang:1.11-stretch as build

WORKDIR /go/src/github.com/khaosdoctor/webapp

COPY web.go web.go

RUN CGO_ENABLED=0 GOOS=linux go build -o ./bin/webapp github.com/khaosdoctor/webapp

# Start of production container
FROM debian:stretch-slim

RUN mkdir -p /web/static/ 

COPY --from=build /go/src/github.com/khaosdoctor/webapp/bin/webapp /usr/bin
COPY index.html /web/static/index.html

WORKDIR /web

EXPOSE 3000

ENTRYPOINT ["webapp"]
```

Notice an important instruction. We're using COPY --from=build, in other words, we're telling Docker to copy the files not from our filesystem, but from another intermediate container! This is what defines a multistage build.

## Reducing Image Size

Now notice that we're using a `debian:stretch-slim` image. As we've already seen, this image is smaller than a full image, so it has fewer vulnerabilities and takes up less space. A build test of the two images shows that the full image has roughly 110mb compared to 62mb of the slim image.

Beyond these two images, we have one more type of image we mentioned, `alpine`, which is based on Alpine Linux. For this we just need to change the base image to `alpine:3.8`

```Dockerfile
# Start of build container
FROM golang:1.11-stretch as build

WORKDIR /go/src/github.com/khaosdoctor/webapp

COPY web.go web.go

RUN CGO_ENABLED=0 GOOS=linux go build -o ./bin/webapp github.com/khaosdoctor/webapp

# Start of production container
FROM alpine:3.8

RUN mkdir -p /web/static/ 

COPY --from=build /go/src/github.com/khaosdoctor/webapp/bin/webapp /usr/bin
COPY index.html /web/static/index.html

WORKDIR /web

EXPOSE 3000

ENTRYPOINT ["webapp"]
```

Now we have an image of **11mb** with no vulnerabilities or external dependencies. So we can see that moving an image to `Alpine` is an excellent choice when we're working with compiled applications that already have their runtime together with their binary.

## Optimizing from Scratch

To finish, let's try to put our application in a `scratch` image. If we remember correctly, a scratch image actually has nothing installed at all, in other words, it's an image "_from scratch"._ Here we'll be able to see two main changes.

The first will be in our `build` container:

```Dockerfile
# Start of build container
FROM golang:1.11.2-alpine3.8 as build

WORKDIR /go/src/github.com/khaosdoctor/webapp

COPY web.go web.go

RUN CGO_ENABLED=0 GOOS=linux go build -o ./bin/webapp github.com/khaosdoctor/webapp
```

Notice that we're using Alpine to build our application, since `scratch` has absolutely nothing. So we'll build the image in an Alpine container and copy the binary to the `scratch` production container.

> We can also do this with the build image in the Slim container. This will make the build even faster because the build image will be smaller.

Now let's copy the Go binary into the `scratch` image:

```Dockerfile
# Start of build container
FROM golang:1.11.2-alpine3.8 as build

WORKDIR /go/src/github.com/khaosdoctor/webapp

COPY web.go web.go
COPY index.html /web/static/index.html

RUN CGO_ENABLED=0 GOOS=linux go build -o ./bin/webapp github.com/khaosdoctor/webapp

# Start of production container
FROM scratch

RUN mkdir -p /web/static/ 

COPY --from=build /go/src/github.com/khaosdoctor/webapp/bin/webapp /usr/bin
COPY --from=build /web/static/index.html /web/static/index.html

EXPOSE 3000

ENTRYPOINT ["/usr/bin/webapp"]
```

Notice that we made two main changes:

1.  We removed the `WORKDIR` instruction, because `scratch` doesn't have an initial file system, so everything is in the same directory
2.  The `ENTRYPOINT` is now a full path, because the `scratch` container doesn't have a `PATH` to look at since it doesn't have an OS

With this, we reduced the image size even further to **7mb**. And, on top of that, we have the best possible security, since we don't have any kind of package installed in our image.

## Conclusion

We learned how to better build an image for a compiled language. In this case it was Go, but you can transpose this creation to any other language that needs prior compilation!

Don't forget to subscribe to the newsletter below for more exclusive content and weekly news! Like and share your feedback in the comments right after the post!

See you soon.
