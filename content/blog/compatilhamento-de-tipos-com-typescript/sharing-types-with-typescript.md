---
title: Sharing Types with TypeScript
pubDate: 2022-04-11T14:00:00.000Z
updatedDate: 2026-07-16T16:09:54.000Z
category: technology
tags: ["typescript", "architecture"]
lang: en
description: One of the biggest problems we have in TypeScript projects is sharing types across several projects. Let's look at some techniques to mitigate that!
seoDescription: One of the biggest problems we have in TypeScript projects is sharing types across several projects. Let's learn how to make this better!
slug: sharing-types-with-typescript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

When we talk about TypeScript, we automatically get two kinds of reactions: the person who loves it and wants to use it for everything, like me, and the person who doesn't like it for a number of reasons.

One of the main reasons I've heard when I talk about TypeScript is that **sharing types between projects is counter intuitive**. And by "sharing" I mean this:

Imagine you have a project split between backend and frontend. The backend will provide a service that will be your API, and you need to consume that service in the frontend. It's essential that you have a simple and direct way to automatically update the data payload without having to run some action.

For that there are a few pretty interesting ways to work with multiple repositories and shared types.

## Creating external libs

This is the most common way and probably the simplest of them all. We can create another external package that's usually called `shared`. That external package would be another NPM package (public or private), which would be installed in both the frontend and the backend.

The big advantage is that it's very simple, if we're working on a project that isn't in a monorepo, we can use this technique to create a type library that can be installed through a public or private NPM package, or even using the `file:` model in Node.js.

The problem with this model is that you just created another dependency. And who owns that dependency? Whoever takes care of the front or whoever is taking care of the backend? On top of that, we'd need to include that dependency in our publishing pipeline, since we're going to need it in every case, and it will always have to be very well tested.

Another important thing we have to keep in focus is that we can only share the part that will be shared, meaning we always have to stick to the object that's being transferred, what's called a DTO (Data Transfer Object), which is essentially the payload of our call, and never share business rules.

## The BFF pattern

The second way we can work with shared types is the so called BFF pattern, which means **Back-enf for Front-end**. The main idea of this implementation isn't only a change of types, but a change in the way your application behaves, because now instead of having a single backend and a single frontend, we're going to have an intermediate service between them that will act as a data interface.

This pattern is a great way to create a communication interface between the two sides without essentially having to share code. Because you would be creating only a mapper between the two services and the two data models.

The big advantage of this model is that the backend can evolve completely apart from the frontend, as long as the interface stays the same, the front-end will be able to receive updated data with little or no direct update from the backend.

This is excellent for cases where we have many teams working on many separate clients that consume one or more than one API, that way you don't need to serve the same kind of data to all clients and can have an initial representation in your backend, but many views of that data in different frontends.

The biggest disadvantage is that we're adding a whole service just to solve the data compatibility problem, and on top of that, it's one more moving piece to work with and include in your publishing pipeline.

In my experience I've seen many projects using this pattern, including right here at Klarna, we use this pattern extensively to give other teams more comfort to work on their projects without us having to keep a rigid consistency in each one of them.

That way, when we have some very big version transition in the backend, we can keep backwards compatibility with all our clients without needing all of them to instantly update the way they call their services.

## Using gRPC

Another option would be using an external DTO through gRPC, as I've already explained [in my gRPC series](/guia-grpc-1/) here on the blog.

gRPC working together with Protobuf lets us share types in the most rigid way possible, since without that payload file, the service wouldn't work. However, that would imply that you need to implement a new pipeline just to deal with protobuf itself and all the files.

That pipeline would have to be able to compile the gRPC file and distribute it to both the client and the server. An update to the DTO would imply downloading the newest version of all the protobuf files from the server and installing them in all the clients. Which I personally find a bit expensive.

## Implementing GraphQL

Implementing GraphQL on the server side is a good way to keep types shared, since we can infer the API schema from what's returned by the API itself. On top of that we can include fields in the schema without breaking existing clients and change other fields keeping backwards compatibility with the API.

The problem is that, generally, using GraphQL (or even protobuf, so to speak) also requires sharing the schema with other backend services or even other repositories, which takes us back to the first solution.

## Working with Monorepos

The easiest and fastest way to share types with other projects is putting all those projects in the same repository, that way you could create a new shared types folder without needing any external dependency.

The big problem with monorepos is that, in a very large project, it becomes completely unfeasible to maintain because of its size, requiring it to be broken into smaller pieces, which essentially increases complexity.

However, there are several very well established tools like [NPM](https://www.youtube.com/watch?v=vxES6rbrd-U&t=7s) and [Yarn](https://www.youtube.com/watch?v=vxES6rbrd-U&t=7s) Workspaces that promise to make using monorepos easier in the long run, some equally useful but older solutions like Lerna also make managing monorepos easier in the long run.
