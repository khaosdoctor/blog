---
title: "All about the new Docker compose file watch"
pubDate: 2023-07-06T11:00:05.000Z
updatedDate: 2026-07-16T15:59:28.000Z
category: "infra"
tags: ["docker", "containers", "development", "devops"]
lang: en
description: "Recently Docker announced a new API for Docker compose that allows you to take automatic actions based on modified files! Let's understand all about it!"
seoDescription: "Recently Docker announced a new API for Docker compose that allows you to take actions based on modified files! Let's understand it!"
slug: "docker-compose-file-watch"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

After many years of requests, Docker finally decided to implement a [watch](https://docs.docker.com/compose/file-watch/) mode in the compose command! With it we'll be able to start a kind of automatic update of our containers whenever our files are modified on disk!

## The Problem

One of the biggest problems for those who used (or still use) Docker compose is that whenever we have our container cluster active and we're developing locally with one of those containers, when we make a modification to one of the project's files, we need to restart the entire compose to create the new image.

Generally, when we're building an external API, for example, we don't have this problem as much because we can run the API itself outside of compose, while pointing to the dependency containers, for example, of some external API or something like that. But sometimes, this is not possible, usually when we need whatever we're doing to stay on the same Docker network, or it needs to be running inside a container. In that case, the only option is to run everything inside Docker compose.

However, whenever we update one of the project's files, we have to run that famous `docker compose down` followed by a `docker compose up --rebuild` to rebuild our service and continue developing.

## The Solution

For many years, people suggested that docker compose should have a watch mode, that is, a mode that could listen to what's happening with a given file or set of project files and run a specific command when they are changed. After a few years, we have the **[compose file watch](https://docs.docker.com/compose/file-watch/) mode**. And the coolest part is that you don't need to enable it for all your services.

This allows us to now start developing directly inside the compose containers, making the environment much easier to migrate from one side to the other, regardless of whether your project needs direct integration with Docker or not.

To activate `watch` mode, you just need to place the `watch` key in any service inside your `docker-compose.yml`. This key takes an array of objects with two properties, one is the `path` and the other is the `action`, basically the service will take an `action` when there's a change in a given `path`.

Let's see an example:

```yml
services:
	web:
    	build: .
        command: npm run dev
        x-develop:
        	watch:
            	- action: sync
                  path: ./web
                  target: /src/web
                  ignore:
                    - node_modules
```

> Currently, the compose watch mode is in experimental state, so we need to use the `x-develop` key to indicate we're enabling a beta command.

## Actions

There are two types of predefined actions you can take: `sync` and `rebuild`:

### Sync

This type of action will ensure that any change made to your local file, outside the container, is added to the container and replaces the file inside it.

It's very similar to the concept of bind mounts, or even volumes, which still exist within Docker, but unlike them, you have greater granularity with Sync than with volumes. An example of this is being able to ignore entire files or directories, something we can't do unless we had multiple volumes.

A very interesting use case for this is precisely with our beloved JavaScript, especially with Node.js. The ideal is to completely ignore the `node_modules` folder because, even though we have a lot of JS code in there, some dependencies use Native Modules, which won't work in environments different from where they were created and compiled to run.

### Rebuild

When we use Rebuild, we'll have the equivalent of running `docker compose up --build <service>` whenever we save the `path`.

While `sync` is more recommended for applications that can do a _hot reload_, that is, reloading the application is enough to verify the changes, like a front-end or something like that, `rebuild` is more suitable for when we have a modification to a key file (like `package.json`) that needs an image recompilation to reinstall or remove dependencies that may have been changed.

> Another use case is for compiled languages, which need to go through the complete build process to be remade, although there are cases where you can just swap the binary of an application and that will be enough.

### Path and Target

Both actions are accompanied by two other properties, `path` and `target`.

In short, `target` is the path of the observed file inside the container. For example, if my `package.json` file is in the root of my local folder, but inside the `/app` folder of my container, then my target will be `/app/package.json`.[^n1]

## Running

To run the docker compose watch, first we need to build our service with `docker compose up -d --build --wait`, this will make docker start the compose and build all the images.

Then, we can run `docker compose alpha watch` to start the watch mode which will read the configurations we want from our file.

## Conclusion

Docker watch is a command that will be very useful in most programming workflows, especially when we need to develop large applications that allow Hot Reload.

With this command we can open the doors to development inside containers more and more, that is, we won't have substantial differences between machines and no more "it works on my machine" once and for all!

> **Important:** Remember that the command is still in alpha state, so it's possible that its API may change in the coming months. If that happens, I'll try to update the article to reflect the changes!

[^n1]: Remembering that, by rule, all paths are based on your application's build directory, that is, the location where docker found the Dockerfile.
