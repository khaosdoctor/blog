---
title: What is Corepack and how can you use it?
pubDate: 2024-07-11T11:00:51.000Z
updatedDate: 2026-07-16T17:55:13.000Z
category: javascript
tags:
  - nodejs
lang: en
description: Learn how to use Corepack, the tool causing controversy in the Node.js world
slug: what-is-corepack-and-how-to-use-it
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

If you've been following the [controversy](https://socket.dev/blog/node-community-debates-enabling-corepack-unbundling-npm) around Node.js and NPM in 2024, you probably already know what I'm going to talk about. But today, I want to show you what **Corepack** is, the tool that promises to end the war between Node package managers!

But first, a bit of history!

## About NPM

Since Node was created, NPM has always been the primary package manager. Being bundled directly in the runtime binary and allowing you to install packages in a very simple and easy way.

There are theories saying that the creator of NPM, Isaac Schlueter, forced NPM's adoption by Node, in a way pressuring people to include it in the binary. This is not true, NPM was an agreement between Isaac and Ryan Dahl to meet the needs of a growing community of users who needed a simple way to install external packages.

For many years, NPM was the only place where you could publish and download packages for Node.js, this is no longer true since we had the advent of others like Yarn and pnpm, which I even made a video to cover:

![](https://www.youtube.com/watch?v=vxES6rbrd-U)

So NPM was included in Node even before it became a profitable corporation [acquired by GitHub in 2020](https://github.blog/2020-03-16-npm-is-joining-github/), and when GitHub was acquired by Microsoft, it was also included in their catalog.

What came out of this is that since 2009, NPM has the largest share of the package manager market. Not that this means anything practical, but by having practically the monopoly on how packages are downloaded and used, NPM practically dictated how packages needed to be created, and many of Node's features were created with it in mind, for example the fact that any package without a prefix will automatically have the package manager set to NPM.

This close coupling with Node allowed NPM to gain an almost prohibitive advantage for any other package manager to flourish. Basically, many people saw this as a form of competition elimination, as this talk by CJ Silverio (ex CTO of NPM) shows:

![](https://www.youtube.com/watch?v=MO8hZlgK5zc)

But what about now? How do the other package managers fare? The fact is that when NPM became almost unusable due to slow package installation, other people moved to create other package managers like Yarn and pnpm. From there began the war of package managers. A war that, like the one between browsers, had and has a large monopoly of an already established system.

But all that could change with Corepack.

## What is Corepack

Corepack is a tool that now comes with Node.js since version 14.19, just like NPM, but instead of being a package manager, it is **all** package managers.

This tool allows you not only to choose a package manager you want, but also allows you to install any of them without needing to go through the long process of downloading the binary and installing globally, etc. You just need to run:

```bash
corepack enable && corepack enable npm
```

This command activates Corepack for all packages on your system, globally. The same applies to Yarn and pnpm. In other words, Corepack is a way for you to use any package manager that _you_ or your project are using at the moment, and also tell people who will use your project what the preferred (or required) package manager is.

> [!TIP] 🤖
> As you can imagine, NPM's reaction to this tool could not have been otherwise. They were [vehemently](https://socket.dev/blog/node-community-debates-enabling-corepack-unbundling-npm) against adopting the protocol, because that would also mean that NPM would stop being bundled in the Node binary.

## How to use Corepack

To use Corepack it's quite simple. Go to your `package.json` file and create a new key called `packageManager`, this key needs to have the value of `yarn`, `npm` or `pnpm`, but not just any value. You also need to specify a version for the package:

```json
{
  // npm
  "packageManager": "npm@10.8.1",
  // pnpm
  "packageManager": "pnpm@9.1.4",
  // yarn
  "packageManager": "yarn@3.1.1"
}
```

You cannot use notations like `pnpm@latest` or `yarn@^10.0.0` (nor omit the version as `pnpm` directly). But that's where the magic happens.

If you have a package or project with the following configuration in your `package.json`:

```json
{
  "packageManager": "pnpm@9.1.4"
}
```

And try to run `npm install`, you will get an error saying:

```
Usage Error: This project is configured to use pnpm
```

Now, if you type `pnpm install`, you will get another message:

```
Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-9.1.4.tgz.

Do you want to continue? [Y/n]
```

And the same applies to Yarn.

What Corepack does is intercept calls to Yarn and pnpm, but it doesn't do the same for NPM, that's why we need `corepack enable npm`, so it also intercepts calls to NPM and does the same thing.

Now you can use any package manager, in any repository, at any time.

## Conclusion

While this is a kind of victory for the community in having more options in a fairer way, it's worth noting that NPM is one of the greatest tools and probably one of the main reasons why Node is what it is.

So we have to be grateful to them for doing all this work since 2009 and maintaining both the community and package management so well that all users could thrive in a much easier and more intuitive environment.

Furthermore, it's important to say that by bundling NPM inside Node, we gain some things. One of them, if not the main one, is the fact that we know the current version of Node will always work with the installed version of NPM, this makes it much easier when we manage packages, but it is a bigger problem for the Node team since a new version has to be synchronized between the two binaries.

On the other hand, always using Corepack the way it is is not very intuitive, so decoupling NPM by default could make life much more complicated for those who just want to install or use a Node package, which is why this controversy is not so simple!
