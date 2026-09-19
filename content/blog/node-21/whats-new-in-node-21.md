---
title: Node 21 Release Highlights!
pubDate: 2023-11-10T16:22:47.000Z
updatedDate: 2026-07-16T15:55:22.000Z
category: javascript
tags:
  - nodejs
  - javascript
lang: en
description: Learn about the major features coming in Node 21 and 21.1!
slug: whats-new-in-node-21
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Another Node.js version has just been released! Let's talk about the major features in this new release.

Remember that odd-numbered releases **are not** recommended for production, but rather experimental releases so you can test and give feedback to the community!

![LTS Schedule](./schedule-98776e.svg)

Currently we're on version 20 until October next year, Node 21 will be available until April 2024, and then we'll have version 22 which will be the new LTS version!

> [!NOTE] 💡
> In this article we'll cover both [version 21](https://nodejs.org/en/blog/announcements/v21-release-announce) and [version 21.1](https://nodejs.org/en/blog/release/v21.1.0), which is the new version with bugfixes and updates.

## Native WebSockets

Version 21 starts with a very welcome feature! An implementation compatible with browser WebSockets was added in the new release as an experimental flag. To use it, just start your application with the `--experimental-websocket` flag.

Currently the implementation allows opening and closing connections, as well as sending data. It provides four events: `open`, `close`, `message`, and `error`. This is great because soon we won't need to rely on implementations like Socket.io to make applications communicate over bidirectional channels.[^n1]

More information is available in the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

## Array grouping

With the inclusion of V8 version 11.8, we now have the [array grouping methods](https://github.com/tc39/proposal-array-grouping). I've already [written about them before](/array-groupby-stage-3/) here on the blog, but there was a small change to the API. Instead of being a method on the array [prototype](https://medium.com/trainingcenter/heran%C3%A7a-e-prot%C3%B3tipos-no-javascript-2c1e60e005a2), `groupBy` is now a static method that can be used like this:

```js
const array = [1, 2, 3, 4, 5];

Object.groupBy(array, (num, index) => {
  return num % 2 === 0 ? 'par': 'impar';
});
// =>  { impar: [1, 3, 5], par: [2, 4] }
```

The same applies to [maps](https://medium.com/trainingcenter/javascript-maps-entendendo-o-conceito-8654d5eb1314), the difference is that the result will be returned in a Map by key, which is useful for grouping items by a key from some object:

```js
const par  = { odd: true };
const impar = { even: true };
Map.groupBy(array, (num, index) => {
  return num % 2 === 0 ? par: impar;
});
// =>  Map { {odd: true}: [1, 3, 5], {even: true}: [2, 4] }
```

## writeFile Flush

The addition of a new property called `{ flush: true }` to the `writeFile` function now allows you to force data being written to a file to be written directly after a successful write.

This feature was added because in some cases, when reading a file, the read operation could get stale data that hadn't been written yet due to the asynchronous nature of write operations.

Now these functions:

-   `fileHandle.createWriteStream`
-   `fsPromises.writeFile`
-   `fs.createWriteStream`
-   `fs.writeFile`
-   `fs.writeFileSync`

All can receive a property in the options object with `{ flush: true }`, but it's not enabled by default.

## Adding window.navigator

This release also includes a global object called `navigator` that is identical to the `window.navigator` we have in browsers. Node is increasingly moving toward direct compatibility with the web and browsers.

For now, `navigator` doesn't have much yet, but this opens the door for other properties to be added in the future.

## Automatic module detection

A new flag called `--experimental-detect-module` was added and can be used to automatically detect whether a file is CommonJS or ESM. Finally, we don't need to identify the module type in our `package.json` anymore.

But be careful, this flag causes a slower startup than usual, so if you maintain a library, it's still recommended to include `type: module` in your package.json because that way the application startup can be faster since Node won't need to check the module type.

## Other changes

-   Fetch and WebStreams are now stable!
-   Performance improvements
-   Addition of the `--experimental-default-type` flag that allows changing the default module type to ESM (no longer need `type: module` in package.json)
-   The test runner now supports globs

[^n1]: In addition, this discussion [has been open since 2018](https://github.com/nodejs/node/issues/19308)
