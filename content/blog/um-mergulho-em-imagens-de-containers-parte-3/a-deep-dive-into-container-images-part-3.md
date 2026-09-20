---
title: A Deep Dive into Container Images - Part 3
pubDate: 2020-08-14T17:34:25.000Z
updatedDate: 2026-07-16T16:26:37.000Z
category: technology
tags: ["docker", "containers", "javascript", "typescript", "infrastructure", "nodejs"]
series: container-images
seriesOrder: 3
lang: en
description: How to build a fast, lightweight, and efficient image for your application using a dynamic language like JavaScript?
slug: a-deep-dive-into-container-images-part-3
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In the [previous article](/um-mergulho-em-imagens-de-containers-parte-2/) we discussed how to create a Docker image the best way for languages considered static, like C or Go. In this article we will explore a bit more about creating images using **dynamic** languages, like Python or JavaScript.

## Goodbye Scratch Images

As we discussed in the [first article](/um-mergulho-em-imagens-de-containers-parte-1/), we have a type of image called **scratch**, which is a completely empty image, really just an empty filesystem. We used this type of image to build our container in the previous article.

However, the bad news is that we cannot use this type of image to create our dynamic containers, because we need the language runtime installed in the operating system, so we will only be using **full**, **slim**, and **alpine** images.

## Multi-stage Builds

Just like we did in the previous article, it is possible to take advantage of a multi-stage build process, that is, we have a container that contains all the resources and development tools to build our application, but we don't use this container for production, instead we use another container that will contain the minimum possible.

This also applies to dynamic languages, but we have some modifications we need to make for these builds to be more efficient. Since we won't have a single binary to copy, the ideal would be to copy the entire directory. Some languages like Python have a good relationship with this type of build because this language has VirtualEnv, which allows us to logically separate the environments we are working in.

We will do this test with a simple application, a JavaScript API that sends emails, the source code can be seen [here](https://github.com/khaosdoctor/zaqar). To start, let's analyze the `Dockerfile` with the build image:

```Dockerfile
FROM node:12 AS builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

## Install dependencies
COPY ["./package.json", "./package-lock.json", "/usr/src/app/"]

RUN npm install

## Add source code
COPY ["./tsconfig.json", "/usr/src/app/"]
COPY "./src" "/usr/src/app/src/"

## Build
RUN npm run build
```

The Node:12 image may vary in space used, but the raw image has about 340Mb. As you can see, base images for dynamic languages are much larger than images for compiled languages because we need the runtime to be included.

However, we will make a change since full images can have many vulnerabilities, we will switch to the **slim** image which has approximately **40mb**

```Dockerfile
FROM node:12-slim AS builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

## Install dependencies
COPY ["./package.json", "./package-lock.json", "/usr/src/app/"]

RUN npm install

## Add source code
COPY ["./tsconfig.json", "/usr/src/app/"]
COPY "./src" "/usr/src/app/src/"

## Build
RUN npm run build
```

We can make it even better if we change our image to an **alpine** image!

```Dockerfile
FROM node:12-alpine AS builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

## Install dependencies
COPY ["./package.json", "./package-lock.json", "/usr/src/app/"]

RUN npm install

## Add source code
COPY ["./tsconfig.json", "/usr/src/app/"]
COPY "./src" "/usr/src/app/src/"

## Build
RUN npm run build
```

Now the build image has only 28mb initially to be downloaded.

## Production Image

We have already created our builder, now let's create our production image. For this, we will use the **alpine** image which is much smaller!

```Dockerfile
# PRODUCTION IMAGE

FROM node:12-alpine

RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY --from=builder [\
  "/usr/src/app/package.json", \
  "/usr/src/app/package-lock.json", \
  "/usr/app/" \
  ]

COPY --from=builder "/usr/src/app/dist" "/usr/app/dist"
COPY ["./scripts/install_renderers.sh", "/usr/app/scripts/"]

RUN npm install --only=prod

EXPOSE 3000

ENTRYPOINT [ "npm", "start" ]
```

We are copying only the TypeScript output folder into our production image and we are only installing the dependencies needed for a production application with `npm install --only=prod`.

In the same way we are exposing the necessary ports and creating the startup script only in this image and not in the build image, since it will not be used.

Putting them all together we have:

```Dockerfile
FROM node:12-slim AS builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

## Install dependencies
COPY ["./package.json", "./package-lock.json", "/usr/src/app/"]

RUN npm install

## Add source code
COPY ["./tsconfig.json", "/usr/src/app/"]
COPY "./src" "/usr/src/app/src/"

## Build
RUN npm run build

# PRODUCTION IMAGE

FROM node:12-alpine

RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY --from=builder [\
  "/usr/src/app/package.json", \
  "/usr/src/app/package-lock.json", \
  "/usr/app/" \
  ]

COPY --from=builder "/usr/src/app/dist" "/usr/app/dist"
COPY ["./scripts/install_renderers.sh", "/usr/app/scripts/"]

RUN npm install --only=prod

EXPOSE 3000

ENTRYPOINT [ "npm", "start" ]
```

The final image has approximately **120mb**, but the alpine Node image is 28Mb, that is, we have approximately 90mb of applications and dependencies in this image. If we were using a full image, this size would easily be larger than 1gb.

## Conclusion

Knowing how to create your images is an important skill, because with it we can reduce the size and transform our application into something much more concise and lightweight that makes downloading and using our images much easier.

Don't forget to subscribe to the newsletter for more exclusive content and weekly news! Like and share your feedback in the comments!

See you!
