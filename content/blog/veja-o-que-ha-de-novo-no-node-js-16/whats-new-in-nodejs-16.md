---
title: See what's new in Node.js 16
pubDate: 2021-05-19T17:46:04.000Z
updatedDate: 2026-07-16T16:15:02.000Z
category: technology
tags: ["nodejs", "javascript"]
lang: en
description: Come learn what's new in version 16 of the world's most famous JavaScript runtime!
slug: whats-new-in-nodejs-16
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In April 2021, [the launch of Node.js version 16 was announced](https://medium.com/the-node-js-collection/node-js-16-available-now-7f5099a97e70), and as is customary, even-numbered versions of the runtime are considered _production ready_, meaning they are the versions that will be definitive for production.

Initially, the LTS version (Long Term Support) is version 14 until October 2021, while version 16 remains as the _current_ version. After October, version 14 will enter maintenance status and version 16 will be promoted to LTS, meaning that version 14 will receive only security and maintenance updates, while version 16 will be receiving active support. All of this can be seen in the [official releases calendar](https://github.com/nodejs/Release#release-schedule).

![](./image-4.png "Node.js releases calendar showing version 16 as current")

This version control is important because, as we can see in the diagram, version 10 completely lost support in May. This was the last version that **did not natively support ES Modules**, which means that now everyone who maintains a package or library on NPM can use the new structure by default!

Let's look at the main differences in this new version

## V8 was updated to version 9.0

The world's most well-known JavaScript engine was updated to version 9.0 in this Node.js release. Although this is not the latest version, it already has incredible support for many cool things.

> In V8 version 9.1, we will have [support for top-level await](https://v8.dev/blog/v8-release-91#top-level-await), which will make our lives much simpler

Beyond the natural performance and stability improvements, this version has a special modification in regular expressions, which now brings a new key to the result of `exec`. Previously, we had no way to know where the beginning and end of a string matched by RegExp were, that is, we had no way to know at which index of the string this value appeared. Now, through the `indices` key, we can know exactly the beginning and end of a string that was run against a RegExp that has the `/d` flag set:

```js
const str = /(Java)(Script)/d.exec('JavaScript')

str.indices // [ [0,10], [0,4], [4,10] ]
str.indices[0] // [0,10] -> toda a string
str.indices[1] // [0,4] -> primeiro grupo ("Java")
str.indices[2] // [4,10] -> segundo grupo ("Script")
```

## `timers/promises` library is stable

Whenever we need to use a function like `setTimeout`, `setInterval`, or any other function that depends on a timer, generally what we do is one of two things:

-   Work with a model manually converted to promises

```js
function asyncTimeout (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

;(async () => {
  await asyncTimeout(3000)
  console.log('Hello')
})()
```

-   Use `util.promisify`

```js
const { promisify } = require('util')
const asyncTimeout = promisify(setTimeout)

;(async () => {
  await asyncTimeout(3000)
  console.log('Hello')
})()
```

Now we have a native API for timers with promises that was in beta in Node version 15:

```js
import { setTimeout } from 'timers/promises';
async function run() {
  await setTimeout(5000);
  console.log('Hello, World!');
}
run();
```

## Conclusion

We have some really cool changes coming in Node.js! We hope that in the future we will have even more changes and many other updates!
