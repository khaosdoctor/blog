---
title: What's new in TypeScript 4.4
pubDate: 2021-09-15T11:00:00.000Z
updatedDate: 2026-07-16T16:12:30.000Z
category: typescript
tags:
  - typescript
  - javascript
  - development
lang: en
description: Let's dive deeper into TypeScript 4.4's new features and understand what's new in each one!
slug: whats-new-in-typescript-4-4
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

On August 26, 2021, we got the [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-4/) of TypeScript version 4.4 and, as is customary, I'll highlight everything new that happened and all the coolest updates to our favorite superset!

## Control flow analysis with variables

When we use TypeScript, one of the big myths many people describe as a problem preventing its use is having to keep declaring types for all the data you have. That's not true.

The TS compiler is powerful enough to understand the control flow and the flow of your code, so it knows when a variable or some other data is of a specific type according to a check made earlier. This check is commonly called a _type guard_. And it's when we do something like this:

```js
function foo (bar: unknown) {
  if (typeof bar === 'string') {
    // O TS agora sabe que o tipo é String
    console.log(bar.toUpperCase())
  }
}
```

This is valid not only for `unknown` cases but also for cases where the type is generic like `any`.

The big problem is that if we move this check to a constant or a function, TS gets lost in the flow and can no longer understand what's happening, for example:

```js
function foo (bar: unknown) {
	const isString = typeof bar === 'string'
    if (isString) console.log(arg.toUpperCase())
    //                            ~~~~~~~~~~~
    // Error! Property 'toUpperCase' does not exist on type 'unknown'.
}
```

Now, TS can identify the constant and its return, providing the result without errors. The same is also possible with complex types, or discriminant types (_discriminant types_):

```js
type Animal = 
    | { kind: 'cat', meow: () => void }
    | { kind: 'dog', woof: () => void }

function speak (animal: Animal) {
  const { kind } = animal
  
  if (kind === 'cat') { animal.meow() }
  else { animal.woof() }
}
```

Within the types extracted by _destructuring_, we now have the correct assertion of the string. Another cool thing is that it will also understand transitively how all types work, meaning it will go type by type to infer what the current type of the object is based on the analyses you've already done:

```js
function f(x: string | number | boolean) {
    const isString = typeof x === "string"
    const isNumber = typeof x === "number"
    const isStringOrNumber = isString || isNumber
    if (isStringOrNumber) {
        x  // Type of 'x' is 'string | number'.
    }
    else {
        x  // Type of 'x' is 'boolean'.
    }
}
```

## Index signatures with Symbols and templates

There's a type called _index signature_, essentially this type tells us that the object in question can have keys of arbitrary name, like a dictionary they are represented as `[key: string]: any`.

The only possible types for an _index signature_ are _string_ and _number_ currently, because they are the most common types.

However, there's another type called [Symbol](https://medium.com/trainingcenter/javascript-symbols-decifrando-o-mistério-383e359e64e3), which is widely used, mainly by those who build libraries, to be able to index the types of their arrays and objects without having to display or modify them. With the arrival of 4.4 you can now do this:

```js
interface Colors {
    [sym: symbol]: number;
}

const red = Symbol("red");
const green = Symbol("green");
const blue = Symbol("blue");

let colors: Colors = {};

colors[red] = 255;    
let redVal = colors[red];  
```

It was also impossible to have a subset of _string_ or _number_ like _template string types_ as keys. For example, an object whose keys always start with `data-`, now that's totally valid:

```js
interface DataOptions {
  [key: `data-${string}`]: unknown
}

let b: DataOptions = {
    "data-foo": true
    "qualquer-coisa": true,  // Error! 'unknown-property' wasn't declared in 'DataOptions'.
};
```

## Catch now defaults to `unknown`

As many people know (and complained about), when we use a `try/catch` inside any function in TypeScript, the `catch` block will always have an `error` parameter that, by definition, would have a type `any`.

After some discussions with the community about what the correct type would be, many people opted to have the `unknown` type as the default for errors. This is because leaving a type open like `any` essentially provides no typing at all. So TS 4.4 introduces a new option in `tsconfig` and a new flag called `useUnknownInCatchVariables`, which is disabled by default to not break compatibility, but can and should be enabled.

```js
try {
    codigo();
}
catch (err) { // err: unknown

    // Error! Property 'message' does not exist on type 'unknown'.
    console.error(err.message);

    // Define o tipo de erro
    if (err instanceof Error) {
        console.error(err.message);
    }
}
```

If you enable the `strict` flag, this flag will also be enabled.

## Exact optional properties

Another problem brought up by the community was the conflict between optional properties declared as `prop?: <type>`, because this type of property will be expanded to `prop: <type> | undefined`, but what if the property can actually have an `undefined` value?

So if someone wanted to write an optional property of type `number`, with `undefined`, that was okay by default, but caused several problems:

```js
interface Pessoa {
  nome: string
  idade?: number
}
  
const Lucas: Pessoa = { nome: 'Lucas', idade: undefined } // ok
```

And this practice occurs in various errors because we'll be treating a valid value as a non-existent one. Even more so if we had to handle the `idade` property at some point, furthermore, each type of method like `Object.assign`, `Object.keys`, `for-in`, `for-of`, `JSON.stringify`, and so on, have different handling for when a property exists or not.

In version 4.4 TS adds a new flag called `exactOptionalPropertyTypes`, which makes this error disappear, since you won't be able to use `undefined` in a property typed as optional.

```js
interface Pessoa {
  nome: string
  idade?: number
}
  
const Lucas: Pessoa = { nome: 'Lucas', idade: undefined } // Erro
```

Like the previous one, the flag is part of the `strict` set.

## Support for static blocks

ECMA2022 [provides for a new feature](https://github.com/tc39/proposal-class-static-block#ecmascript-class-static-initialization-blocks) called _static initialization blocks_, this feature will allow us to create more complex initialization code for static members of a class, we'll talk more about this here on the blog soon!

But for now, TS 4.4 already has support for this feature.

## Conclusion

These were the most important changes in TS 4.4, but not the only ones, we had a series of performance improvements and also reading and integration with VSCode.
