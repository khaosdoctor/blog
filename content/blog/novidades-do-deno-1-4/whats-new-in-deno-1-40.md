---
title: Deno 1.40 Release Highlights
pubDate: 2024-02-28T11:00:45.000Z
updatedDate: 2026-07-16T15:52:50.000Z
category: technology
tags: ["deno", "typescript", "javascript"]
lang: en
description: Understand the main changes in Deno 1.40 and how they directly impact your experience with the tool!
slug: whats-new-in-deno-1-40
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Deno has reached [version 1.40](https://deno.com/blog/v1.40) and this is one of the coolest versions yet! First, because it includes the addition of the [Temporal API](/temporal-api/) that I've been talking about here since 2020! And I think it's the first runtime to actually implement this functionality!

Beyond that, a series of other features that I'll go through here one by one!

## Temporal API

The Temporal API is the new way to handle dates in JavaScript. I talked a lot about it in [this article](/temporal-api/) and showed all the details, so I won't go into too much detail here, but essentially, Deno is the first runtime to implement this API completely.

It's still behind an `--unstable-temporal` flag, but you can already use it the way the [official documentation](https://tc39.es/proposal-temporal/docs/) describes! If you run a terminal with `deno --unstable-temporal`, you can already do some tests:

```ts
console.log(Temporal.Now.instant()) // data e hora de hoje
console.log(Temporal.Now.zonedDateTimeISO()) // equivalente ao toISOString
const birthday = Temporal.PlainMonthDay.from("12-15");
const birthdayIn2030 = birthday.toPlainDate({ year: 2030 });
console.log(birthdayIn2030.toString()); // 2030-12-15
```

> [!NOTE] 💡
> For some reason, the `Temporal.Now.timeZoneId` method was not implemented.

## Import.meta.filename and dirname

This was something I really wanted to happen. Since the advent of ECMAScript modules, the entire way module resolution works has changed, which means that getting the name of a file or the directory where it exists is no longer as simple to find.

In Node, we have two "magic" variables called `__dirname` and `__filename` that return the path of the directory and file you're running, respectively.

But with ESM we can't use them because they're not set at the beginning of the application, so we have to get the module's URL with `import.meta.url`, which returns a _fileURL_ in the pattern `file://path`, and then we have to use `dirname` on that URL, but only after converting that URL to a path!

```ts
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const fileurl = import.meta.url
const path = fileURLToPath(fileurl)
const dir = dirname(path)
const filename = path.split('/').pop()

console.log({ fileurl, path, dir, filename })
/*
{
  fileurl: "file:///Users/lucas/repos/deno/teste.ts",
  path: "/Users/lucas/repos/deno/teste.ts",
  dir: "/Users/lucas/repos/deno",
  filename: "teste.ts"
}
*/
```

This was very annoying! Especially if you had to deal with paths constantly, so two proposals were added to support both the file and folder, called `import.meta.filename` and `import.meta.dirname`. Now you can replace all of that with:

```ts
console.log(import.meta.dirname) // /Users/lucas/repos/deno
console.log(import.meta.filename) // /Users/lucas/repos/deno/teste.ts
```

## Decorators

Finally we're going to have native support for [decorators](/javascript-decorators/), a proposal that's in final stage and should arrive in browsers soon! After more than 5 years of waiting, the new proposal combines all the previous proposals into one.

A classic example we can give is `@trace`, which is used to debug any function by logging to the console before and after execution:

```ts
function trace(fn: any, ctx: ClassMethodDecoratorContext) {
  return function (...args: unknown[]) {
    console.log("ENTERED", ctx.name);
    const v = fn(...args);
    console.log("EXITED", ctx.name);
    return v;
  };
}

class App {
  @trace
  static start() {
    console.log("Hello World!");
  }
}

App.start();
```

## Simpler Imports

This is another interesting feature. In the past, when we had import maps with modules that had subdirectories, we had to define two different imports:

```json
{
  "imports": {
    "preact": "npm:preact@10.5.13",
    "preact/": "npm:/preact@10.5.13/"
  }
}
```

This allowed us to import both the top-level `preact` with `import preact from 'preact'`, and also submodules like `import hooks from 'preact/hooks'`.

Now the simplification works so you can have just one module in the import map and be able to import everything from the same root with just one map:

```json
{
  "imports": {
    "preact": "npm:preact@10.5.13"
  }
}
```

> Although I don't really like using import maps and prefer the approach of a `deps.ts` file

## Other Changes

-   [A series of APIs and commands](https://deno.com/blog/v1.40#deprecations-stabilizations-and-removals) are being deprecated, especially `deno.run` and `deno.serveHttp`
-   Support for `rejectionHandled`, an event that fires whenever an exception occurs in a promise that has already been rejected (when you have an unused catch)
-   Support for [windows with WebGPU](https://deno.com/blog/v1.40#webgpu-windowing--bring-your-own-window)
-   Support for [new native Node.js APIs](https://deno.com/blog/v1.40#nodejs-api-updates)
-   Better messages in deno lint and deno doc
