---
title: What's New in JavaScript in 2024
pubDate: 2024-07-17T11:00:20.000Z
updatedDate: 2026-07-16T17:55:01.000Z
category: technology
tags: ["javascript"]
lang: en
description: Find out everything new in the latest version of JavaScript in 2024!
slug: whats-new-javascript-2024
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

The ECMA262 folks got together and we have the new JavaScript specification fresh out of the oven.

The [127th committee member meeting happened on June 26, 2024](https://github.com/tc39/ecma262/releases/tag/es2024) and now we have a lot of cool stuff to look at this year! So let's go through all the main features!

## Synchronous Grouping in Maps and Objects

Very similar to [another proposal we talked about here](/array-groupby-stage-3/), now we have a new method in `Map` and `Object`, the `groupBy`. What it does is allow us to group array items following a function. When used in a map, it gives us a map back, but we can use it in an object too.

```js
Map.groupBy([1,2,3,4,5,6], (v) => v % 2 === 0 ? 'par' : 'impar')
// Map(2) { 'par' => [2,4,6], 'impar' => [1,3,5] }
```

The same way in an object:

```js
Object.groupBy([1,2,3,4,5,6], (v) => v % 2 === 0 ? 'par' : 'impar')
// { par: [ 1, 3, 5 ], impar: [ 2, 4, 6 ] }
```

## Promise.withResolvers

This is another way we can define a Promise so we can resolve it outside its scope. The `withResolvers` method returns an object with the promise constructor, as well as the `resolve` and `reject` functions:

```js
const { promise, resolve, reject } = Promise.withResolvers()

```

The promise in question represents some kind of asynchronous work, while the two resolvers are decoupled from the promise itself. This is equivalent to something like:

```js
let resolve, reject
const p = new Promise((res, rej) => {
  resolve = res
  reject = rej
})
```

So we can do something like:

```js
const { promise, resolve, reject } = Promise.withResolvers()
resolve('resolvido')
const res = await promise // res = 'resolvido'
```

Overall, the use for this kind of thing is quite specific, it would be more when you want total control of the promise, or call the resolution methods from outside the promise, for example in streams or events.

[Here](https://exploringjs.com/js/book/ch_promises.html#Promise.withResolvers) we have an interesting explanation about this method with some examples.

## The /v Flag in Regex

The `/v` flag enables comparison in unicode sets, for example, emojis that have more than one code-point, which before couldn't be compared like this:

```js
/^\p{Emoji}$/u.test('😵‍💫') // false
```

This doesn't happen with this code:

```js
/^\p{Emoji}$/u.test('🤯') // true
```

Because 😵‍💫 has [three code-points](https://apps.timwhitlock.info/unicode/inspect?s=%F0%9F%98%B5%E2%80%8D%F0%9F%92%AB) (it's the combination of 😵 and 💫) and 🤯 has only [one](https://apps.timwhitlock.info/unicode/inspect?s=%F0%9F%A4%AF). But this can be solved with this code:

```js
/^\p{RGI_Emoji}$/v.test('😵‍💫') // true
```

[This link](https://exploringjs.com/js/book/ch_regexps.html#regexp-flag-unicode-sets) has an extensive list of options and explanations about what is what in the unicode world.

## ArrayBuffers and SharedArrayBuffers Got Updates

The update is that, now, both can be resized without needing to be recreated:

```js
const buffer = new ArrayBuffer(2, {maxByteLength: 4})
const UIArr = new Uint8Array(buffer, 2) // starting at position 2
UIArr.length // 0 because we have two empty positions

buffer.resize(4) // we fill the position
UIArr.length // 2
```

## Other Changes

-   String gained two methods `isWellFormed` and `toWellFormed` for strings that represent references to UTF-16
-   `Atomics.waitAsync` is a new method that allows us to wait asynchronously for a change in memory.
