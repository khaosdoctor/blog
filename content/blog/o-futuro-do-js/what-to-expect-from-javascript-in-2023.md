---
title: "What to expect from JavaScript in 2023"
pubDate: 2022-08-27T00:09:44.000Z
updatedDate: 2026-07-16T16:07:06.000Z
category: "javascript"
tags: ["javascript", "ecmascript", "development", "typescript"]
lang: en
description: "What does JavaScript have in store for us in 2023? In this post, I bring the main proposals that could become reality next year!"
slug: "what-to-expect-from-javascript-in-2023"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

I'm always posting JavaScript news here on the blog, especially the most talked about ones, but everything I mention is already confirmed for versions of that same year, but what can we expect for the next year of JavaScript?

First, we need to understand how the JavaScript process works. In this video, I explain a bit more about the process of releasing new JavaScript features. If you haven't watched it yet, I strongly recommend it to better understand how everything works!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

I selected the main stage 3 or higher proposals from the TC39 repository. These are the proposals with the best chance of being chosen for a future language version in 2023, but this is all just speculation. Any proposal, even stage 3 ones, can be removed if something happens.

> I'll also write separate articles for some of these proposals to explain each one in more detail and with better depth (motivations and implementation) along with many more!

So, what will JavaScript look like in 2023?

## JSON Modules and Import Assertions

These two proposals work closely together, but they are two separate proposals. In [ESM](/os-ecmascript-modules-estao-aqui/), it's not possible to import JSON directly like we do with CommonJS. That's why the [JSON Modules](https://github.com/tc39/proposal-json-modules) proposal is perfect! The idea is to allow us to import JSON files directly from code files.

The second proposal, [import assertions](https://github.com/tc39/proposal-import-assertions), allows you to add additional metadata about the type of module being imported, to have a standard way of importing files that are not JS:

```js
import arquivoJson from './meuArquivo.json' assert { type: 'json' }
import ("outroArquivo.json", { assert: { type: 'json' } })
```

## Access to source text from JSON methods

This [proposal](https://github.com/tc39/proposal-json-parse-with-source) has been open since 2018 in the repository. The idea is really interesting but it's a pretty specific niche. What it does is allow you to pass additional arguments to the `reviver` functions that exist in the `JSON.parse` and `JSON.stringify` methods.

These functions are like mapping functions that receive the keys and values after conversion so they can be filtered. In the proposal, you could pass a new parameter called `source` so you can handle some primitive types so the JSON conversion doesn't lose data.

```js
const muitoGrandeParaNumber = BigInt(Number.MAX_SAFE_INTEGER) + 2n
const converterParaBigInt = (key, val, { source }) => (typeof val === 'number' && val % 1 === 0 ? BigInt(source) : val)
const numeroAposConversao = JSON.parse(String(muitoGrandeParaNumber), converterParaBigInt)
muitoGrandeParaNumber === numeroAposConversao
```

## Decorators

This [proposal](https://github.com/tc39/proposal-decorators) is legendary and has been around for about 5 years. The idea is to implement the concept of _decorators_, which is already a very present concept in some programming languages like Java and is also present experimentally in TypeScript.

The simple idea of a decorator (I'll elaborate more about it in a separate article) is to annotate a class or method to modify its behavior. They can replace, provide access to, or initialize a value that is being decorated.

The default decorator interface will be this:

```ts
type Decorator = (value: Input, context: {
  kind: string;
  name: string | symbol;
  access: {
    get?(): unknown;
    set?(value: unknown): void;
  };
  private?: boolean;
  static?: boolean;
  addInitializer?(initializer: () => void): void;
}) => Output | void;
```

And a possible implementation would be, for example, adding a console log of all arguments of a method for debugging:

```js
function debug(value, { kind, name }) {
  if (kind === "method") {
    return function (...args) {
      console.log(`chamando '${name}' com os argumentos: ${args.join(", ")}`);
      const ret = value.call(this, ...args);
      console.log(`fim de ${name}`);
      return ret;
    };
  }
}

class Classe {
  @debug
  metodo(arg) {}
}

new Classe().m(1);
// chamando 'metodo' com os argumentos: 1
// fim de metodo
```

Personally, I don't believe we'll have decorator support in 2023, but it doesn't hurt to dream.

## Modifying arrays by copy

This is a [proposal](https://github.com/tc39/proposal-change-array-by-copy/) that will probably be implemented because it's quite straightforward and relatively simple. The idea is to implement the `toReversed`, `toSorted`, `with`, and `toSpliced` functions on arrays.

The goal is simple. With the exception of `with`, the other functions already exist today with the names `reverse`, `sort`, `splice`, and `slice`, but they modify the original array instead of returning a copy, which is bad when working with many objects:

```js
require('core-js/proposals/change-array-by-copy')
const sequencia = [1, 2, 3]
console.log(sequencia.toReversed()) // => [3, 2, 1]
console.log(sequencia) // => [1, 2, 3]

const desordenado = new Uint8Array([3, 1, 2])
console.log(desordenado.toSorted()) // => Uint8Array [1, 2, 3]
console.log(desordenado) // => Uint8Array [3, 1, 2]

const precisaDeCorrecao = [1, 1, 3]
console.log(precisaDeCorrecao.with(1, 2)) // => [1, 2, 3]
console.log(precisaDeCorrecao) // => [1, 1, 3]

const spliced = [1, 2, 3]
console.log(spliced.toSpliced(1, 1)) // => [1, 3]
console.log(spliced) // => [1, 2, 3]
```

## Array Grouping

This is another of the [proposals](https://github.com/tc39/proposal-array-grouping) that I think will make it into next year's specification because the idea is quite simple and has been around for a while. Plus, it's been in the works for only 14 months, which is record time for a proposal to go from stage 0 to 3.

The idea of this proposal is to implement what already existed in libraries like Lodash. The famous `groupBy`, but here you'll pass a function that will decide how to correctly group the items:

```js
const array = [1, 2, 3, 4, 5]

const grupo = array.group((num, index, array) => {
  return num % 2 === 0 ? 'par' : 'impar'
})

console.log(grupo) // =>  { impar: [1, 3, 5], par: [2, 4] }
```

## Say goodbye to Date, hello Temporal

This is a [proposal](https://github.com/tc39/proposal-temporal) that I won't spend much time explaining, but it's the one I most hope happens. I've already written about Temporal in another article:

[Forget Date and embrace the new way to handle dates in JavaScript](/temporal-api/)

The goal of Temporal is to create not just a modification, but a complete API that will completely replace JavaScript's `Date` API, which is really difficult to use, with a model based on `moment.js` (in fact, the people who maintained Moment were the same people who maintain this proposal). In other words, the idea is to implement Moment natively in JavaScript.

Today you can already achieve similar functionality with the [luxon](https://moment.github.io/luxon/#/) library, which is from the same creators and is considered the "test bed" for this new API.

## Duplicate capture groups

This is a simple but clever idea. What if we have multiple ways of writing something and want to capture these options using a RegExp? Today we could do something like this:

```js
str.match(/(?<ano>[0-9]{4})-[0-9]{2}|[0-9]{2}-(?<ano-fim>[0-9]{4})/)
```

But wouldn't it be cool if we could give the same name to the group? Well, that's the [proposal](https://github.com/tc39/proposal-duplicate-named-capturing-groups)!

With it we could give the same name to two capture groups as long as they're in different alternatives, like we saw in the example above with `|`. In other words, it's either `2022-08` or `08-2022`, and then we could have this:

```js
str.match(/(?<ano>[0-9]{4})-[0-9]{2}|[0-9]{2}-(?<ano>[0-9]{4})/)
```

## Version 3 of number internationalization

This is another of the [proposals](https://github.com/tc39/proposal-intl-numberformat-v3) that I'll cover in a separate article because it's huge and one of the oldest, 5 years and counting!

The proposal is to add more formats and internationalization to the current `Intl` library. The main changes are:

- The `formatRange` method
- Inclusion of an enumerator for number grouping
- Improvements in decimal rounding
- Interpreting strings as decimals
- Rounding modes
- Options for sign display

I won't detail everything here, but in a separate article so I can explain each point in more detail!

See you!
