---
title: TypeScript 5.3 What's New
pubDate: 2023-08-30T09:00:30.000Z
updatedDate: 2026-07-16T15:57:03.000Z
category: typescript
tags:
  - typescript
  - development
  - nodejs
  - javascript
lang: en
description: Let's understand what could come in TS 5.3 with this amazing list of features!
slug: whats-new-in-ts-5-3
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

As usual, I want to bring you the main TypeScript news as it comes out! Recently, I learned that the TypeScript team is working on a [new version of the language](https://github.com/microsoft/TypeScript/issues/55486). To do this, they create something called an **iteration plan**.

An iteration plan is not a document that shows exactly what will be released in the language, but rather what might possibly be in upcoming versions. Basically it's a document of the team's intentions to implement and improve the compiler.

The beta version of TS 5.3 is expected to be released in September (a bit before the launch of the first module of [Formação TS](https://formacaots.com.br)) and the final version should be out in November!

Matt from Total TypeScript compiled some of what's in the document in that [other article](https://www.totaltypescript.com/typescript-5-3), and I'll take the opportunity to summarize and explain it while linking to the [JavaScript](https://github.com/tc39/proposals) documentation.

## Import Attributes

This is a [proposal](https://github.com/tc39/proposal-import-attributes) that's been open for a while, and the main goal is to let you specify validation options for module imports. Right now we're only talking about validating the module type, for example, to verify that a module is a JSON file:

```ts
import json from './foo.json' with { type: 'json' };
```

This is useful from a security perspective, for example, if a file is expected to be JSON but is actually JS.

You can use these attributes in dynamic imports:

```ts
import("foo.json", { with: { type: "json" } });
```

Or even export a module with another validated type:

```ts
export { val } from './foo.js' with { type: "javascript" };
```

This also applies to WebAssembly or different workers:

```ts
new Worker("foo.wasm", {
  type: "module",
  with: { type: "webassembly" },
});
```

Using `with` followed by `type` is a way to keep this feature open because it will be possible to include more properties later. Imagine being able to import a package by one of the properties of `package.json` or even from the file itself.

## Throw expressions

This is a feature I'll discuss in a future video, but it's something that's been missing from JS for a long time. The [proposal](https://github.com/tc39/proposal-throw-expressions) for this is still at stage 2, which is unusual for TS, since it usually implements most features when they're at stage 3.

What might happen is that, as they mention in the plan, the team will be "championing" the proposal, which is a way of saying they'll actively work on it and push it forward to reach stage 3 and 4 faster.

The idea is that you can use `throw` outside of a specific statement, for example, in a variable declaration:

```ts
const userName = user.name || throw new Error('Name is required')
```

Today this isn't possible.

## Isolated Declarations

There's a problem when working with monorepos in almost all languages, but in TypeScript it's worse. Because when you have packages that depend on other packages, it inevitably generates an absurd amount of complexity, especially for TypeScript.

If you have 10 levels of packages depending on each other, TS needs to infer all the types of all packages itself, starting from the bottom up and generating the [declarative files](/semana-ts-2/) for each package to import into the package above. And that's very slow.

And since there's no faster way to do this without changing the compiler, because other tools like esbuild or even swc aren't smart enough for that, TypeScript has to infer everything, and it's not necessarily the most performant compiler out there.

This [proposal](https://github.com/microsoft/TypeScript/pull/53463) adds a new configuration to TSConfig called `isolatedDeclarations`.

```json
{
  "compilerOptions": {
    "isolatedDeclarations": true
  }
}
```

What it does is enable a stricter mode, where you need to, for example, add type annotations on function returns, especially for exported functions, so TS doesn't have to infer everything.

## Narrowing generics in functions

There's a [latent problem](https://github.com/microsoft/TypeScript/issues/33014) in TypeScript where it won't perform _type narrowing_ on a generic type inside a function when we want to return something based on that type.

Complicated? Let's see. Imagine this:

```ts
interface F {
  "t": number,
  "f": boolean,
}

function depLikeFun<T extends "t" | "f">(str: T): F[T] {
  if (str === "t") {
    return 1;
  } else {
    return true;
  }
}

depLikeFun("t"); // number
depLikeFun("f"); // boolean
```

That's exactly what we're talking about. What we want is that if we pass `t`, the return type is `number`, if it's `f` it's `boolean`. To achieve this we need a type `T` that's passed as a generic of the function, and then we return the key of the interface `F` based on `T`.

But if we do this now, we'll get an error saying our returns aren't of type `never`. This is because TS doesn't narrow our generic type `T`. Actually, what it's doing, according to [this issue](https://github.com/microsoft/TypeScript/pull/30769), is that when we pass `F[T]` we're saying "write F at key T", so it will check if `F[T]` has a type that intersects both of its possibilities (in this case `number` and `boolean`), so `number & boolean` is `never`.

## Autocomplete in string types

An interesting hack—that I discovered recently—is that you can create a _union type_ of strings and `string & {}`, this way you get autocomplete from the compiler, plus you can put any other string in its place:

```ts
type IconSize =
  | "small"
  | "medium"
  | "large"
  | (string & {});
```

So this would be completely valid:

```ts
const icons: IconSize[] = [
  "small",
  "medium",
  "large",
  "extra-large",
];
```

In version 5.3 it might be possible to remove the `& {}` and use just string to get the same result:

```ts
type IconSize =
  | "small"
  | "medium"
  | "large"
  | string;
```

## What's coming next?

This is a foundational article, we don't know if these features will actually be added to TS or not, because the document is a work plan and not a guide of what will be included.

I hope some of these features, especially union types and type narrowing, get added because it will be helpful for most people.
