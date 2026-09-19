---
title: What's New in TypeScript 5.3 - Beta!
pubDate: 2023-11-01T21:21:53.000Z
updatedDate: 2026-07-16T15:55:35.000Z
category: typescript
tags:
  - typescript
  - javascript
  - nodejs
  - deno
lang: en
description: Let's understand all the new features of TypeScript 5.3 beta version!
slug: typescript-5-3-beta-features
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

As usual, another TypeScript version is out and I'm here to tell you more about it! This time we'll even compare it with what I proposed in the [previous article](/ts-53-alpha/) when we talked about the alpha version!

Let's go!

## Import Attributes

This is a feature that was already in the previous article and it was actually implemented. The idea behind this implementation is to stay aligned with the newest version of the [proposal with the same name over at TC39](https://github.com/tc39/proposal-import-attributes).

> It's worth noting that this was the only implementation from the previous article that made it through, so I need to work on my fortune-telling skills 🔮

Essentially, the main use case for this new functionality is to force reading a specific module as a specific type. For example, if we want to import JSON only as JSON:

```ts
import obj from "./something.json" with { type: "json" };
```

Dynamic imports also work well with this new implementation through a second parameter:

```ts
const obj = await import("./something.json", {
    with: { type: "json" }
});
```

It's worth noting two things here. First, in [TS 4.5](https://devblogs.microsoft.com/typescript/announcing-typescript-4-5/#import-assertions) we already had an earlier version of the same proposal when it was called **import assertions**, and this version will be gradually deprecated over time.

Another thing is that TS won't check what exists inside that field, so you can put an import with any type:

```ts
import obj from './something.json' with { type: 'batata' }
```

This will work in TypeScript, but since the implementation depends on the runtime and not on TS itself, your runtime might not like it.

## Interaction with Inlay Hints

One of the main changes was the inclusion of **interactive inlay hints**. An _inlay hint_ is a gray annotation that sits in front of your types in your editor. At [Formação TS](https://formacaots.com.br) for example, we have all of them enabled and they really help understand what's in that variable without needing to hover over it.

> [!NOTE] 🤩

Previously, they were just plain text, but now you can interact with them to go to the definition and do other things.

![](./clickable-inlay-hints-for-types-5-3-beta-729491.gif)

## General Optimizations

In most releases we get performance improvements with general optimizations. In this case we had two main ones.

### **Ignore JSDoc during Parsing**

Since not all applications need JSDoc as a string when parsing code, this functionality was removed from `tsc` and with that we get faster parsing in the compiler and also lower memory usage.

Since not all applications need it, the same functionality was exposed in the API itself so they can use it. So expect tools like `ESLint` and others to get faster too.

### Union and Intersection Optimization

When TS identifies a mix of a union with an intersection, for example `A & (B | C)`, it transforms everything into unions of intersections, so that example becomes `(A & B) | (A & C)`. But if you have a union with 50,000 types like `A & (B | C | D ....)`, it gets really slow.

That's why new versions of TS will look at your original union (before transforming it into an intersection) to see if the original type is there before testing all possibilities.

## Other Changes

-   The `resolution-mode` property in type imports `/// <reference types="pkg" resolution-mode="import" />` can now be included in import assertions with `import type { tipo } from 'pkg' with { 'resolution-mode': 'require' }`
-   Narrowing of `switch (true)` where it's now possible to validate the clauses of each `case` where before it wasn't
-   Similarly, comparisons with booleans got better
-   You can now do narrowing inside a custom `instanceof`, that's right. It's possible to modify the value of an `instanceof` comparison through a `Symbol.hasInstance` property, and now TypeScript will take this change into account too (see examples [here](https://devblogs.microsoft.com/typescript/announcing-typescript-5-3-beta/#instanceof-narrowing-through-symbol-hasinstance))
