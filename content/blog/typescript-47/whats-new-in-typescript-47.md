---
title: What's New in TypeScript 4.7
pubDate: 2022-06-08T14:27:00.000Z
updatedDate: 2026-07-16T16:08:55.000Z
category: technology
tags: ["typescript", "javascript", "nodejs"]
lang: en
description: Stay up to date with the main features of TypeScript 4.7. Which includes, among many things, the ability to use native ESModules!
seoDescription: Stay up to date with the main features of TypeScript 4.7. Which includes, among many things, the ability to use ESModules
slug: whats-new-in-typescript-47
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

TypeScript 4.7 has arrived and, as we cannot overlook it, we will go through the main parts that were announced by the development team.

## ESModules Support in Node.js

Node.js has had ESM support for a while now (and [we even have articles here on the blog](/os-ecmascript-modules-estao-aqui/) about it), but TypeScript was not exactly keeping up with what was happening, mainly because it was one of the most critical changes that happened in the ecosystem, since all of Node.js was built on the CommonJS (CJS) model.

Interoperability between the two import modes is not only complex, but also brings various problems and new challenges, especially with older features. Despite ESM support already being in TypeScript as experimental since 4.5, it was not yet time to release it as a complete feature.

However, TypeScript 4.7 already brings the latest support (Node 16) for ESM through the `module` option in `tsconfig.json`.

```json
{
  "compilerOptions": {
    "module": "node16"
  }
}
```

### Support for `type` and New Extensions

As we have already discussed in other articles here on the blog, basically, to use ESM in a Node.js module, we just need to either call the file with the `.mjs` extension or by including the `type` key in `package.json` with the value `module`.

Recalling some of the rules when we use ESM:

-   We can use the keywords `import` and `export`
-   We have the very useful top-level `await`, so we don't need an `async` function
-   We need to use the **full** name of files including the extension in imports
-   Some other minor rules

The change on the TypeScript side was smaller, because we were already using the "ESM style" to import modules, but that was superficial. When we compiled the code to JS in the end, we ended up with a bunch of `require` statements anyway.

What happens now is that TypeScript will start treating `.ts` files (and their variations like `.tsx`) the same way Node treats JS files. That is, the compiler will look for the first `package.json` to determine whether that file is in a module or not. If it is, the `import` and `export` will be left in the final code, and some things will change in module imports in general.

The classic example is the use of the extension, so a common code like this, which would work normally with CJS:

```ts
export function foo() {}

import { foo } from './foo'
```

Would not work in ESM because `./foo` does not have the full file extension. The `import` should be changed to this other form to work in both resolution modes:

```ts
import { foo } from './foo.ts'
```

Additionally, just as we have the `.mjs` and `.cjs` extensions to interpret JS files that are ESM or CJS, we now have the `.mts` and `.cts` extensions, which will produce the definition files `.d.mts` and `.d.cts`, plus the corresponding `.mjs` or `.cjs` files depending on the input file.

All other ESM vs CJS rules continue to be applied normally.

## Exports, Imports, and Self-reference in package.json

Since we started having ESM in Node.js, we have a new field in `package.json` that allows a package to define different entry points when it's imported via ESM or CJS, this field is `exports`:

```json
// package.json
{
  "name": "my-package",
  "type": "module",
  "exports": {
    ".": {
      // entrypoint para ESM
      "import": "./esm/index.js",
      // entrypoint para cjs
      "require": "./commonjs/index.cjs"
    }
  },
  // Fallback para outras versões
  "main": "./commonjs/index.cjs"
}
```

The way TypeScript supports these new fields basically comes down to how it works today. The idea is that when a type is inferred from a package, TypeScript will look for the `main` field within that package's `package.json` and then look for the corresponding `.d.ts` file unless the package specifies a `types` key.

As you would expect, in the new model, TypeScript will look for the `import` field within the `export` key of a `package.json` if it exists, or a `require` field if the file is a CJS file. You can also define for each one of them the location where the types are and where Node.js should look:

```json
// package.json
{
  "name": "my-package",
  "type": "module",
  "exports": {
    ".": {
      "import": {
        // Onde o TS vai procurar tipos
        "types": "./types/esm/index.d.ts",
        // Onde o Node.js vai procurar o pacote
        "default": "./esm/index.js"
      },
      "require": {
        "types": "./types/commonjs/index.d.cts",
        "default": "./commonjs/index.cjs"
      }
    }
  },
  // Fall-back pra outras versões do TS
  "types": "./types/index.d.ts",
  "main": "./commonjs/index.cjs"
}
```

Something worth noting:

> The `types` key should always come before `default` in an `exports` object

## Control Flow Analysis for Object Elements

An improvement in type detection for object keys was made in TypeScript 4.7. Previously, code like this:

```ts
const key = Symbol()

const numberOrString = Math.random() < 0.5 ? 42 : 'hello'

const obj = {
  [key]: numberOrString
}

if (typeof obj[key] === 'string') {
  let str = obj[key].toUpperCase()
}
```

Would not automatically find the type of the `obj[key]` key and would continue reporting that the type is still `string | number`. Today, it's possible to detect that this type is now a `string` by default.

The same granular improvement was applied to parameters that are function objects like this example:

```ts
declare function f<T>(arg: { produce: (n: string) => T; consume: (x: T) => void }): void

f({
  produce: () => 'hello',
  consume: (x) => x.toLowerCase()
})

f({
  produce: (n: string) => n,
  consume: (x) => x.toLowerCase()
})

// Erro antes, agora funciona
f({
  produce: (n) => n,
  consume: (x) => x.toLowerCase()
})

// Erro antes, agora funciona
f({
  produce: function () {
    return 'hello'
  },
  consume: (x) => x.toLowerCase()
})

// Erro antes, agora funciona
f({
  produce() {
    return 'hello'
  },
  consume: (x) => x.toLowerCase()
})
```

That is, TypeScript became smarter at finding function types and their return values within objects that are actually parameters of another function.

## Instantiation Expressions

When we use generics in TypeScript, most of the time functions end up extremely generic, as expected. However, if we want to specialize them a bit, we always have to create a wrapper. For example, this function returns a `Box` type, which is generic:

```ts
interface Box<T> {
  value: T
}

function makeBox<T>(value: T) {
  return { value }
}
```

If we want to create a variation of this function (essentially an alias) where T is explicitly a `Hammer` or `Wrench` type, we would either have to create a new function that takes `Hammer` as a parameter and returns a call to `makeBox` with that parameter, so TypeScript would infer the type:

```ts
function makeHammerBox(hammer: Hammer) {
  return makeBox(hammer)
}
```

Or do a type overload:

```ts
const makeWrenchBox: (wrench: Wrench) => Box<Wrench> = makeBox
```

Now it's possible to associate the type directly to a variable. That is, we can change the generic directly in the variable assignment with the type we want:

```ts
const makeHammerBox = makeBox<Hammer>
```

It would have the same effect as the previous ones. And this is especially useful when we have native generic types, like `Map`, `Set`, and `Array`:

```ts
const MapComum = new Map(1, 2) // Assumiria um Map<number, number>
const ErrorMap = Map<string, Error>

const errorMap = new ErrorMap() // tipo é Map<string, Error>
```

## `extends` Available for `infer` Types

Recently I posted [here on the blog](/infer-typescript/) an article about what `infer` is in TypeScript. In short, it allows us to extract the type of a variable when we are using it in an `extends` clause, for example, when we want to get the first element of a tuple only if it's a string:

```ts
type FirstIfString<T> = T extends [infer S, ...unknown[]] ? (S extends string ? S : never) : never

// "hello"
type B = FirstIfString<['hello', number, number]>

// "hello" | "world"
type C = FirstIfString<['hello' | 'world', boolean]>

// never
type D = FirstIfString<[boolean, number, string]>
```

Now, having to do two ternary operators for this type of check is a bit tedious. So to simplify the idea, we can now use `extends` together with `infer` and the type would look like this:

```ts
type FirstIfString<T> =
  T extends [infer S extends string, ...unknown[]]
    ? S
    : never
```

## Explicit Type Variance

Now it's possible to annotate the input or output types of a function with a variance indicator. The full explanation [is quite complex](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#optional-variance-annotations-for-type-parameters) and covers a certain group of uses that are quite advanced.

In essence, the idea is to try to discern when a generic type `T`, for example, is different in different invocations, for example:

```ts
interface Animal {
  animalStuff: any
}

interface Dog extends Animal {
  dogStuff: any
}
// ...
type Getter<T> = () => T
type Setter<T> = (value: T) => void
```

In this case, if we have two instances of the `Getter` type, trying to figure out whether the type we sent to it or the type T is indistinguishable from each other is quite complicated. Mainly because one type is an extension of another. This means that on one side, all `Dog` are `Animal` but not all `Animal` are `Dog`. So the variance `Dog -> Animal` is true while `Animal -> Dog` is not.

Now we can define whether the type is an input or output type with the `in` and `out` annotations:

```ts
interface Animal {
  animalStuff: any
}

interface Dog extends Animal {
  dogStuff: any
}
// ...
type Getter<out T> = () => T
type Setter<in T> = (value: T) => void
```

So if we have an output type in the same scope, TypeScript can be much faster at identifying the type, even more so with circular types.

> But be careful, it's not recommended that you go around annotating all your functions and all your parameters with `in` or `out` since TypeScript does a great job with this.

## Minor Changes:

-   [Import organization based on groups](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#group-aware-organize-imports)
-   [Go to Source definition](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#go-to-source-definition)
-   [Resolution mode can be customized](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#resolution-customization-with-modulesuffixes)
-   [Intellisense for method completion in objects](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#object-method-snippet-completions)

## Conclusion

That's it! If you want to know more about the news not only from TypeScript but also from Node.js, be sure to subscribe to [my newsletter](https://news.lsantos.dev) to receive the best news and the best curated technology content straight to your email!
