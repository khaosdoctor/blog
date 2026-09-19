---
title: .env Support, API Changes and Deno 1.38 Features
pubDate: 2024-01-03T11:00:52.000Z
updatedDate: 2026-07-16T15:54:48.000Z
category: javascript
tags:
  - deno
  - typescript
  - development
lang: en
description: .env file support, test runner in the REPL, unix socket support and much more in the new Deno version!
slug: deno-1-38-new-features
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In November the most beloved TypeScript runtime of all gained one more version! And, as is customary, we will cover here what we can expect new in this version 1.38 of Deno!

## Doc with HTML

Deno has a very interesting command called `deno doc`, which does basically what you expect: it generates documentation for the module you are reading.

Until now we had some options like generating documentation in JSON, or just generating the private documentation of the module, but that was not very useful especially because most of them were just a way to print that same documentation to the terminal.

Now, version 1.38 includes an `--html` option, which allows you to generate complete documentation pages for your module even if it is not published on `deno.land`.

Just run:

```bash
deno doc --html --name "Meu módulo" ./mod.ts
```

Which will generate a series of HTML documentation files that you can publish. And you can do this for ANY module and any file in your project.

This is the video created by the Deno team that shows how this can be done.

![](https://www.youtube.com/watch?v=hQ2wEIUGV-M)

Additionally, the new `--lint` option makes Deno analyze your code for problems that could harm the documentation!

## Hot Module Reload

One of Deno's most interesting features is the ability to use the excellent `--watch` when running code to reload your application whenever something changes.

The problem is that, many times, this application restart doesn't happen as expected, interrupting processes in the middle of execution, so now we have an improvement with the `--unstable-html` option.

HMR (or Hot Module Reload) is a technique widely used in development, mainly for frontend, to be able to replace the content of a file without needing to restart the entire process, maintaining state, memory and everything that comes with it.

This video from the Deno team shows well how this functionality helps in development:[^n1]

<Video src="/videos/deno-1-38/deno-hmr.mp4" poster="https://img.spacergif.org/v1/1440x626/0a/spacer.png" />

You can also pass specific files to this flag with:

```bash
deno run --unstable-hmr=data.ts ./mod.ts
```

And you can also listen to HMR update events using an event listener:

```ts
addEventListener('hmr', (e) => {
  console.log(e.detail.path)
})
```

## .env Support

Like [Node did before](/dotenv-nodejs/), now it's Deno's turn to have native support for `.env` files. This is unexpected, since Deno already has support through the standard library for the dotenv module, but now you can use it directly from the command line.

Imagine you have a `.env` file at the root of your project. To execute this file directly you can pass the `--env` option to `deno run`:

```bash
deno run --env main.ts
```

You can also specify the file:

```bash
deno run --env=.env.dev mod.ts
```

## Other Changes

- You can use any package manager (`yarn`, `pnpm`) to download NPM modules
- Behind the `--unstable-bare-nod-builtins` flag you can now use Node modules without needing the `node:` prefix
- Faster compilation and transformation of JSX
- `deno task` now supports the `head` command on all platforms
- The VSCode extension for Deno now supports the default options for JavaScript and TypeScript from VS Code itself
- The extension now has a sidebar with all the tasks from the `deno.json` file
- You can now use `Deno.test` in the REPL
- You can use using with some classes from the `Deno` namespace such as: `FsFile`, `FsWatcher`, `HttpConn`, `HttpServer`, `Kv`, and `Listener`

---

## FTS Time!

If you enjoyed this article, I also have a complete TypeScript course called **TypeScript Formation!**

I invite you to take a look if you want to learn more about TypeScript with me and our incredible community of hundreds of students!

[^n1]: Notice that as the increment number changes, the application already picks up the result and begins applying the new change without needing to restart the entire application.
