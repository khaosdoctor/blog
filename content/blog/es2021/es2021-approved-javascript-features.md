---
title: ES2021 is Approved! Check Out the JavaScript Updates
pubDate: 2021-07-14T13:00:00.000Z
updatedDate: 2026-07-16T16:13:28.000Z
category: technology
tags: ["javascript"]
lang: en
description: Want to know what's coming in ES2021? Let's understand it part by part!
slug: es2021-approved-javascript-features
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

As we already know, every year ECMA publishes a list of updates coming in its next versions. These changes are based on [proposals in the TC39 repository](https://github.com/tc39/proposals) and need to be approved before they enter any language version.

The 2021 version of the ECMA specification is ready and has been validated! So now we know what's coming! Here's a quick list.

## Logical Assignment Operators

This is a proposal that has been with us for a while, I've even [written about it](https://imasters.com.br/javascript/operadores-de-atribuicao-logica-no-javascript). Basically, the idea is to include three new operators in the language: `&&=`, `||=`, and `??=`. What do they do?

The basic idea is to replace ternary operators, for example. Instead of doing something like this:

```js
if (!user.id) user.id = 1
```

Or something even simpler:

```js
user.id = user.id || 1
```

We can do a substitution:

```js
user.id ||= 1
```

The same applies when we have a null check operator like `??` and _and_ with `&&`.

## Numeric separators

It exists only to provide visual separation between numbers in code. So now we can use `_` in the middle of numbers to separate digits without it being counted as an operator or part of the code. I'll take the example from the proposal itself to demonstrate:

```js
1_000_000_000           // Ah, so a billion
101_475_938.38          // And this is hundreds of millions

let fee = 123_00;       // $123 (12300 cents, apparently)
let fee = 12_300;       // $12,300 (woah, that fee!)
let amount = 12345_00;  // 12,345 (1234500 cents, apparently)
let amount = 123_4500;  // 123.45 (4-fixed financial)
let amount = 1_234_500; // 1,234,500
```

## Promise.any and AggregateError

These are the two most interesting functions in the proposal. Let's start with `Promise.any`.

This specification allows a variation of `Promise.all`. The difference is that when we had an error in `Promise.all`, all promises were rejected. In `Promise.any`, if any of the promises resolves, we get a result.

```js
Promise.any([
    fetch('https://existeenaofalha.com.br').then(()=>'home'),
    fetch('https://existeefalha.com.br').then(()=>'erro')
   ])
    .then((first) => console.log('o primeiro resultado que vier'))
	.catch((error) => console.error(error))
```

The thing about `AggregateError` is basically a matter of convenience. How do you return a sequence of errors from multiple promises that might have failed? So a new error class was created to make it possible to chain and add multiple errors into a single aggregated error.

## String.prototype.replaceAll

Before, when we ran something like `'x'.replace('', '_')`, we would only get the replacement for the first occurrence once. If we wanted to do it across the entire text, we had to use a regex, like `'xxx'.replace(/(?:)/g, '_')` to get a global replacement.

With `replaceAll`, we get the result of the second using the syntax of the first:

```js
'xxx'.replaceAll('', '_') //'_x_x_x_'
```

## WeakRefs and FinalizationRegistry

These are two advanced APIs that should be avoided if possible. So much so that I won't provide many examples, but instead link directly to the official documentation.

The idea of `WeakRefs` is to provide a weak reference to an object in memory. This reference allows those objects to be freely collected by the Garbage Collector, freeing the memory they're allocating as soon as any reference to them is removed.

In a normal case, a strong reference, like in listeners and other objects, would prevent the GC from collecting the memory to avoid any kind of access error down the road. See more about it in the [documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef).

Finalizers, on the other hand, may or may not be used together with WeakRefs and provide a way to execute a function as soon as the GC collects those objects from memory. But not just these weakly referenced objects, finalizers can be attached to **any** object to execute a callback as soon as they are collected and destroyed. See more [in the documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry).

```js
let target = {};
let wr = new WeakRef(target);

// a WR e o target não são o mesmo objeto

// Criamos um novo registro
const registry = new FinalizationRegistry(value => {
  // ....
});

registry.register(myObject, "valor", myObject);
// ...se você não ligar mais para `myObject` algum tempo depois...
registry.unregister(myObject);
```
