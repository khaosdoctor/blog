---
title: "\"JavaScript Will Be Completely Different in 2025\""
pubDate: 2024-10-16T11:00:01.000Z
updatedDate: 2026-07-16T17:50:52.000Z
category: "javascript"
tags: ["javascript", "ecmascript", "development"]
lang: en
description: "\"JavaScript may change quite a bit in 2025, some very interesting proposals were approved, check them out!\""
slug: "javascript-will-be-completely-different-in-2025"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Not long ago I made a series of [predictions for JS in 2025](/js-2025/), and I wasn't that far off from reality! TC39 met this week in Tokyo to discuss the proposals that would move forward in the next versions of JS, this was the 104th meeting of the committee since its creation.

As always, Rob Palmer, one of the TC39 members, posts on his [Twitter](https://x.com/robpalmer2/status/1843448233340875143?ref_src=twsrc%5Etfw%7Ctwcamp%5Etweetembed%7Ctwterm%5E1843448233340875143%7Ctwgr%5E%7Ctwcon%5Es1_c10&ref_url=https%3A%2F%2Fsocket.dev%2Fblog%2Ftc39-advances-10-ecmascript-proposals-key-features-to-watch) everything that will be discussed during the meetings. This year's agenda items were:

-   Array.zip
-   Atomics.pause
-   Error.isError
-   Extractors
-   Immutable ArrayBuffer
-   Iterator helpers
-   Math.sumPrecise
-   Promise.try
-   RegExp modifiers
-   Structs

And some of them really did move forward to the next stages, not all the ones I predicted, but at least 50% of them! That's been my highest accuracy rate ever! Let's go through everything that was discussed:

## [Iterator helpers](https://github.com/tc39/proposal-iterator-helpers)

A proposal that is actually several. Here we're talking not just about helpers (which moved to stage 4 and will be implemented), but also about another proposal I mentioned that could make progress.

![](./image.png)

This proposal adds a series of helper methods to iterators (like Map, Set and generators), such as `map`, `filter`, `reduce` and many others to transform the use of iterators into something closer to an array.

Something that is still not easy to understand today, because, for example:

```js
const arr = [1,2,3]
arr.map((v) => v) // ok

const set = new Set([1,2,3])
set.map((v) => v) // erro, não temos map em sets
```

Notice that Array, which is an iterable, has `map`, but Set doesn't, because even though the main way to use a Set is through iteration, it's not an Iterable.

In addition to this proposal, another one I also mentioned (which was at stage 2) moved to 2.7, [Iterator Sequencing](https://github.com/tc39/proposal-iterator-sequencing?ref=blog.lsantos.dev). Which allows us to create iterators by concatenating other iterators with `Iterator.concat` just like we do with `Array.concat`.

## [Import attributes](https://github.com/tc39/proposal-import-attributes) & [JSON Modules](http://github.com/tc39/proposal-json-modules)

Now we can finally use what we were already using months ago. The two proposals that change how we import JSON and other modules moved to stage 4 and will be implemented!

Now we'll be able to do this:

```js
import json from './arquivo.json' with { type: 'json' }
```

Originally the two proposals were one, but they were separated. The reason is that for import attributes (the `with`) this can open opportunities for us to natively import other file types that aren't just JSON, for example, XML or CSV.

And then, each module that will be imported will have a new proposal like JSON modules had. This ensures that engines don't have specific implementations for each thing, for example, imagine how bad it would be if each browser read JSON differently.

Both proposals moved forward and now we'll have a native way to read JSON files directly from JS, something Node already implemented, but wasn't part of the specification.

## [RegExp Modifiers](https://github.com/tc39/proposal-regexp-modifiers)

Another one that moved to stage 4. Now we can use modifiers like `/i`, `/m` and others directly in JS RegExps. This was one I didn't know was being voted on, I admit, I thought this functionality was already present in the current engine, but apparently it wasn't something that was implemented (unlike all the previous languages that implemented it right away... who knows).

## [Structs](https://github.com/tc39/proposal-structs)

This is a proposal I really thought wouldn't advance so quickly. Structs add four logical objects to JS:

-   Structs: Objects with fixed layout that behave like classes, but with some restrictions that make them faster and easier to be analyzed statically by a compiler
-   Shared Structs: Structs that are a bit more restricted and can be accessed by multiple threads in parallel. This structure alone is responsible for enabling true parallelism in JS
-   Mutex and Condition: Abstractions for synchronizing access to shared structs
-   Unsafe Blocks: Objects that specify where unsafe memory can be initialized and worked with

The big idea of this proposal started with Structs, which would be fixed objects that can't have more or fewer fields, which is amazing because most objects we use are this way. So the compiler doesn't need to optimize all objects to be dynamic by default.

SharedStructs will allow us to use objects that share memory across files, without needing to use Realms or other structures. This proposal just moved to stage 2 and now the design will be worked on!

## [Extractors](https://github.com/tc39/proposal-extractors)

Extractors moved to stage 2. They're nothing more than a function that can be applied when we're destructuring an object. This allows us to do both validation and normalization of values, for example, we can make all keys lowercase:

```js
const LowercaseExtractor = {
  [Symbol.customMatcher](valor) {
    if (typeof valor === 'string') {
      return valor.toLowerCase()
    }
  }
}

const LowercaseExtractor({ nome, rua }) = { nome: 'LUCAS', rua: 'RUA' }
console.log({ nome, rua }) // { nome: 'lucas', rua: 'rua' }
```

## [Promise.try](https://github.com/tc39/proposal-promise-try)

After [8 years](https://x.com/ljharb/status/1843884468647682382), Promise.try finally entered stage 4 and will be implemented in the language! I predicted this one in the other article too!

The big idea here is something really simple, actually, when we have a value that we don't know if it's a promise or not, we usually wrap it in a Promise and move on:

```js
// Não sabemos se o retorno de F é uma promise ou não
const p = new Promise(resolve => resolve(F()))
// mas p sempre vai ser uma promise
```

With this proposal we'll be able to change this code to something like:

```js
await Promise.try(F) // retorna F como promise
```

This is not a way to run functions in parallel or asynchronously, it simply calls a function that would previously be synchronous in a unified way as a promise.

## [Error.isError](https://github.com/tc39/proposal-is-error)

Another one I predicted might move from its current stage, `Error.isError` moved to stage 2.7 and is awaiting testing and validation. The idea here is really simple and I really don't know why we don't have this from the start, but this proposal allows us to do something similar to `Array.isArray`, but with errors:

```js
if (Error.isError(err)) {
  // err é um erro
}}
```

Which will limit the use of `instanceof Error`, since `instanceof` can be modified externally.

## Conclusion

There are other proposals that also moved forward, but honestly, they're not ones that will make much difference in everyone's life, the two most interesting were [Array.zip](https://github.com/tc39/proposal-array-zip) and [Immutable ArrayBuffers](https://github.com/Agoric/tc39-proposal-immutable-arraybuffer) that might be modified in the coming days.

Other proposals might be on the table for discussion too, like:

-   AsyncContext
-   Dataview Clamped Methods
-   Decimal
-   Discard Bindings
-   ESM Phase Imports
-   Explicit Compile Hints
-   Intl.DurationFormat
-   JSSugar
-   Math.emplace
-   Measure Object
-   Observables
-   Porffor
-   Smart Units
-   Temporal

From what I've seen recently, Temporal is getting a lot of attention and it's possible that it might be set to come out next year, so let's keep watching.
