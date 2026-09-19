---
title: Everything about running TypeScript natively on Node!
pubDate: 2025-01-22T11:01:10.000Z
updatedDate: 2026-07-16T17:49:09.000Z
category: typescript
tags:
  - typescript
  - nodejs
lang: en
description: Node 22 supports TypeScript natively! What now? Is that all? Let's learn how you can run TS much more easily and what the main configurations are!
slug: everything-about-node-running-typescript-natively
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Finally, the article I've been promising for a while is out! And I'm very proud to be part of the team that helped implement this functionality (even though I didn't contribute as much as I would have liked).

But what's this whole thing about Node.js running TypeScript?

## Does Node run TS?

In some [previous editions](/tsx-loader/), I talked about being able to run TypeScript natively on Node using TSX. Historically, that has always been the case, because we had no way to run any type of file other than JavaScript with Node. And we still don't.

What happens is we can use _loaders_. Loaders are special hooks that allow us to modify the behavior of the native _module loader_, used when we load any [ESM](/os-ecmascript-modules-estao-aqui/) module. These loaders are quite powerful because they allow us, among other things, to perform actions directly on the code that will be loaded into memory. Which is exactly how **TSX** behaves.

But now that's no longer necessary! From Node [version 22.6](https://nodejs.org/en/blog/release/v22.6.0) onward, two new experimental flags were added:[^n1]

-   `--experimental-strip-types`: Takes a TS file and completely removes any type annotations in it. It's the simplest form of transpilation, just removing what isn't native JavaScript. It's important to note that features that require code transformation like `enum` and `namespace` will **not** work.
-   `--experimental-transform-types`: Implies that the previous flag will be active, meaning if you pass this flag, the previous one will be automatically enabled. It allows type transformation, so we can use features that wouldn't have been enabled before, essentially providing nearly complete TypeScript support.

Essentially, you can now do something like this:

```bash
$ node --experimental-transform-types index.ts
```

And your file will run as if you were running with TSX using:

```bash
$ node --loader=tsx index.ts
```

### Node v23

Node version 23 took this functionality even further and made the `--experimental-strip-types` flag active all the time, meaning the native TypeScript loader (which we'll see below) checks all files, and if they're a `.ts` file, they're transpiled with type stripping, the faster process.

This means that by default, you can run **simple** TypeScript files using:

```bash
node index.ts
```

But if the file has transformations, like `enums`, it still won't work and you **need** to pass the `--experimental-transform-types` flag to the command.

> Soon, probably in the next LTS version (which should be 24) this flag will stop being experimental and become just `--transform-types`

But how does all this work?

### Meet Amaro

[Amaro](https://github.com/nodejs/amaro) is the name given to one of the native modules loaded by Node.js, it also comes as an [NPM package](https://www.npmjs.com/package/amaro), so you can use it separately from Node too. But this is the heart of everything that's happening behind the scenes.

Amaro is nothing more than a wrapper around the SWC parser for TypeScript in WASM, the module is called `@swc/wasm-typescript`, and it does one thing: transpiles TypeScript to JavaScript.

Since version 23, whenever any code is imported, there's basically a [check](https://github.com/nodejs/node/commit/35f92d953c24d4f02f82ab397a61383103f9b796#diff-8f3520898daae8b61a84b558a2d31241031419b6dc2d25685d9f2c70b6ba2a45R26) to ensure the `--experimental-strip-types` option is active. If yes, we import the [parser](https://github.com/nodejs/node/commit/35f92d953c24d4f02f82ab397a61383103f9b796#diff-fddf8a06747f8c9e83cd2a3ebee0f53dbd790567ce018044e70bd0ffbbcc815eR310) from amaro into global memory. If not, we just return the code.

> It's important to note that code transformation is done [synchronously](https://github.com/nodejs/node/commit/35f92d953c24d4f02f82ab397a61383103f9b796#diff-fddf8a06747f8c9e83cd2a3ebee0f53dbd790567ce018044e70bd0ffbbcc815eR313), so there's a small overhead when loading many files.

## Getting the best experience with TS on Node

Even though Node would try to support all native TypeScript configurations, it would never support `tsconfig` natively (as mentioned in [Marco Ippolito's article](https://satanacchio.hashnode.dev/everything-you-need-to-know-about-nodejs-type-stripping#heading-why-typescript)), nor would it make sense for it to. That's why some configurations are needed to align TypeScript's behavior with Node.js's.[^n2]

First of all, you need to set your `tsconfig` to use `esnext` as `target` and `nodenext` as `module`:

```json
{
  "compilerOptions": {
    "target": "esnext",
	"module": "nodenext"
  }
}
```

Now let's look at some other options you need to set to have the best experience.

### Type imports must be explicit

When we import modules that are only types, meaning there's no code to be executed there, we can tell TypeScript not to try to resolve any of them using the `type` keyword:

```ts
import type { MeuTipo, MeuOutroTipo } from 'meu-modulo'
```

This will cause everything being imported inside the `{}` to be removed during transpilation, avoiding unnecessary processing. We can do this with specific types too:

```ts
import { MinhaClasse, type MeuTipo } from 'meu-modulo'
```

Now we're only importing `MeuTipo` as a type, not the class.

This seems trivial, especially since TS can resolve this naturally when you run the compiler, but for Node, it's not.

Since Node has no way to know which modules are or aren't types, because it doesn't do type checking, you **must put** the `type` annotation. This can be configured in your `tsconfig.json` using the `verbatimModuleSyntax` option and setting it to `true`. Then the compiler will warn you when you need a `type`.

Your `tsconfig` file now looks like this:

```json
{
  "compilerOptions": {
    "target": "esnext",
	"module": "nodenext",
	"verbatimModuleSyntax": true
  }
}
```

### File imports must be explicit

Besides importing types, you can also import other `.ts` files in your code. Node not only supports this but makes it much simpler and, in my opinion, much easier to read.

When importing a local file in TS, you **must** put the `.ts` extension:

```ts
import { MyClass } from './meu-arquivo.ts'
```

If you're using Node's default ESM configuration, you'll get a TypeScript error saying you can't import a `.ts` module unless `allowImportingTsExtensions` is set to `true` in your `tsconfig.json`. So that's what you need to do:

```json
{
  "compilerOptions": {
    "target": "esnext",
	"module": "nodenext",
	"verbatimModuleSyntax": true,
	"allowImportingTsExtensions": true
  }
}
```

This happens because in normal ESM, you need to explicitly state the file extension to reduce overhead in the module resolution system trying to figure out what kind of file you're opening. And if you try to open a `.ts` file, that file doesn't exist, so you get a "File not found" error.

### Rewriting extensions

Another important option released with [TypeScript 5.7](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/#path-rewriting-for-relative-paths) and implemented by the TypeScript team directly to support Node.js is `rewriteRelativeImportExtensions`, which will automatically replace `.ts` with `.js` in your files, letting you publish compiled code to NPM without any additional transpilation step.

So we add it here too:

```json
{
  "compilerOptions": {
    "target": "esnext",
	"module": "nodenext",
	"verbatimModuleSyntax": true,
	"allowImportingTsExtensions": true,
	"reqriteRelativeImportExtensions": true
  }
}
```

### In the future

Probably in version 5.8, the TS team will include a [flag](https://github.com/microsoft/TypeScript/issues/59601) called `--erasableSyntaxOnly` that will warn you if you're using types that can't be erased (if you're also using Node without `transform-types`).

## What does this mean for TypeScript?

A lot of people think this is the end of TypeScript, but it's quite the opposite. Now TypeScript will be more present than ever! With all runtimes supporting TS natively, it's gradually moving toward being, probably, the standard language of the web.

Of course, there are still some changes that need to be made, mainly to make configuration friendlier and less painful, but this change is the beginning of a small revolution that might replace JavaScript as the most used language on the Web.

[^n1]: The curious fact here is that this flag was supposed to be called `enable-transformation`, and I [suggested](https://github.com/nodejs/node/pull/54283#discussion_r1711462259) we change it to something like `enable-type-transformation` to maintain the semantics.

[^n2]: You can also see the [Node documentation article](https://nodejs.org/api/typescript.html) about this change.
