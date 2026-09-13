---
title: "TypeScript's Biggest Update in Years - TypeScript 5.5"
pubDate: 2024-07-10T17:23:32.000Z
updatedDate: 2026-07-16T17:55:26.000Z
category: "typescript"
tags: ["typescript"]
lang: en
description: "Learn everything about TypeScript's biggest update in years!"
seoTitle: "What's New in TypeScript 5.5?"
slug: "typescript-5-5-biggest-update-in-years"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

After a while without posting TypeScript news here, I'm finally back to show what's new in the world of the most beloved language!

TypeScript 5.5 has been [officially released](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/) and is considered one of the most important updates of all time. This new version improves several parts of the code and the overall behavior of TS, and also adds some very interesting features.

## Inferred predicates

One of the main changes is the automatic inference of predicates as a variable is changed in the code. This change was made [in this PR](https://github.com/microsoft/TypeScript/pull/57465) recently, and honestly it was something most people weren't expecting to arrive in a recent version.

For example, when we have something like this:

```ts
const foo: string | number = 'str'
```

If we have any code that uses `foo` after this line, any declaration needs to have the type `string | number` since it's the original type of the variable. We can do a _narrowing_ (which I explain in the TS Formation) and reduce the possible amount of types, for example, if I want to get only the string:

```ts
const foo: string | number = 'str'

if (typeof foo === 'string') {
  // aqui dentro, foo é string
}

// aqui fora ele continua sendo string | number
```

Another common use of this type of function is when we want to create [type guards](/assertion-functions/), that is, we want to take this check out of the if and reuse it, we can do it like this:

```ts
function isString (v: unknown) {
  return typeof v === 'string'
}
```

But, without us manually specifying the return of this function, we're going to have something quite strange:

```ts
if (isString(foo)) {
  console.log(foo); // string | number
}
```

This happens because, inside a function, TS will lose the narrowing. The way to solve this is if we manually use a _type predicate_, which is a suffix that we can put to tell TS that a certain type is another type:

```ts
function isString (v: unknown): v is string {
  return typeof v === 'string'
}

if (isString(foo)) {
  console.log(foo); // string
}
```

A major advantage of using this type of function is that we can pass it to other methods, especially iterative ones, like `map`, `filter` and `reduce`:

```ts
const foo = [0, "foo", 99, "bar"] // Array<string | number>
const strings = arr.filter(isString) // string[]
```

But there's a problem with type guards which is the fact that we're manually telling it what it needs to know, so TS won't complain if we do something like this:

```ts
function isString (v: unknown): v is number {
  return typeof v === 'string'
}

if (isString(foo)) {
  console.log(foo); // number
}
```

Which is completely wrong. And that's why this new proposal exists. You can now write the same function without the predicate and TS will automatically infer that this function returns the correct result.

```ts
function isString (v: unknown) {
  return typeof v === 'string'
}

if (isString(foo)) {
  console.log(foo); // string
}
```

And this uses a core primitive of TypeScript that is also used to infer and narrow other types, so everything you need to infer from `if`'s or any other function that:

- Does not have an explicit return declaration
- The inferred return is `boolean`
- Has a single `return` and no implicit return
- Does not modify the received parameter at any time

Will be a candidate to be used as a type predicate.

## Object property access by index now works

One of the biggest problems that probably anyone has experienced with TS is when we need to access objects in the form `obj[key]`. For example:

```ts
function foo(obj: Record<string, unknown>, key: string) {
    if (typeof obj[key] === "string") {
        obj[key].toUpperCase(); // Property 'toUpperCase' does not exist on type 'unknown'
    }
}
```

Even if we manually infer `string`, TS will still infer `obj[key]` as `unknown` because any value of `obj[key]` is defined as `unknown` in `Record<string, unknown>`.

In TS 5.5 this doesn't happen anymore, as long as neither `obj` nor `key` are modified during the function.

## @import tag in JSDoc

For those who like or need to use JS with TS in the project, one of the main problems is importing a type just to do type checking within a JS file. Essentially you have three options:

1. Import as a namespace, but the module will still be imported at runtime

```js
import * as modulo from "./modulo";

/**
 * @param {modulo.Tipo} valor
 */
function foo(valor) {
    // ...
}
```

2. Use the `import()` function inside JSDoc, but this is not reusable.

```js
/**
 * @param {import("./modulo").Tipo} valor
 */
function foo(valor) {
    // ...
}
```

3. To make it reusable, we can use the `typedef` from JSDoc, but this is very long to write, and can be very long for complex types.

```js
/**
 * @typedef {import("./modulo").Tipo} MeuTipo
 */

/**
 * @param {MeuTipo} valor
 */
function foo(valor) {
    // ...
}
```

Now TS implements a new JSDoc definition that allows you to use imports in ESM style:

```js
/** @import * as modulo from "modulo" */

/**
 * @param {modulo.Tipo} valor
 */
function foo(valor) {
    // ...
}
```

## RegExp syntax checking

Not much to say here. Previously TS just let any Regex pass as valid, now the compiler will also check for valid and invalid syntaxes. See some examples:

```ts
let myRegex = /@robot(\s+(please|immediately)))? do some task/;
//                                            ~
// Unexpected ')'. Did you mean to escape it with backslash?
```

The check works with capture groups:

```ts
let myRegex = /@typedef \{import\((.+)\)\.([a-zA-Z_]+)\} \3/u;
//                                                        ~
// This backreference refers to a group that does not exist.
// There are only 2 capturing groups in this regular expression.
```

And with named groups too:

```ts
let myRegex = /@typedef \{import\((?<importPath>.+)\)\.(?<importedEntity>[a-zA-Z_]+)\} \k<namedImport>/;
//                                                                                        ~~~~~~~~~~~
// There is no capturing group named 'namedImport' in this regular expression.
```

## Support for new Set methods

TS now supports the new Set methods that came in [ECMAScript 2024](/ecma-2024-sets/) even though they haven't been fully implemented yet. I won't go into details here because you can see in the article I linked that has all the explanations about each method.

## Other changes

- You can use the `${configDir}` placeholder inside the `tsconfig.json` file to point to the location where the file is located, this is very useful when you have separate configuration files ([see explanation](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/#the-configdir-template-variable-for-configuration-files))
- The `isolatedDeclarations` flag and property facilitates the creation of public libraries by forcing the use of explicit returns when necessary to generate `.d.ts` files ([see explanation](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/#using-isolateddeclarations))
- The following properties have been disabled
    - `charset`
    - `target: ES3`
    - `importsNotUsedAsValues`
    - `noImplicitUseStrict`
    - `noStrictGenericChecks`
    - `keyofStringsOnly`
    - `suppressExcessPropertyErrors`
    - `suppressImplicitAnyIndexErrors`
    - `out`
    - `preserveValueImports`
    - `prepend` in project references
    - implicit OS `newLine`
- You can no longer create a type called `undefined`
