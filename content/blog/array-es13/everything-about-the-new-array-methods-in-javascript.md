---
title: Everything about the new array methods in JavaScript
pubDate: 2022-09-22T13:00:15.000Z
updatedDate: 2026-07-16T16:06:29.000Z
category: javascript
tags:
  - javascript
  - ecmascript
  - development
  - nodejs
lang: en
description: One of the promises of ECMAScript is the inclusion of new array methods, in this article we'll go through all of them and give a use case for each one, so you won't be left out!
seoDescription: Learn everything about the new methods included in arrays in the next versions of ECMAScript! Understand each one with a use case!
slug: everything-about-the-new-array-methods-in-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Once again we're going to talk about the main news in JavaScript! This time we're going to talk about one of the coolest [proposals](https://github.com/tc39/proposal-change-array-by-copy) around right now. Today it's at stage 3, which means it's going to be live soon!

If you don't know how JavaScript works, in this video I explain a bit more about the process of releasing new JavaScript features, if you haven't watched it yet, I strongly recommend it so you can better understand how everything works!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

## The problem

As a lot of people have already found out the hard way, arrays and objects in JavaScript are passed by reference because they're created and stored in the Heap (which I'm not going to explain here but [this article](https://fjolt.com/article/javascript-by-reference-by-value) gives you a good idea). Because of that, they're created only once and passed to functions as a pointer to the original object.

So when we do some operation on them, for example, reversing an array with `reverse()`, we'll always change the original array:

```js
const arr = [1,2,3]
arr.reverse()
console.log(arr) // [3,2,1]
```

And this is the cause of many, many problems in most systems. Over time, we learned to use the object cloning method to create a copy of that array and make the change, for example:

```js
const arr = [1,2,3]
const reversed = [...arr].reverse()
console.log(arr) // [1,2,3]
console.log(reversed) // [3,2,1]
```

When we use the spread operator `[...` what we're doing is cloning the array element by element and applying the `reverse` method to this new array we got back.

And this is true for several other methods like `splice` and `sort`. Why don't we change that?

## The proposal

The idea of this proposal is to add another 4 new methods for arrays:

-   `Array.prototype.toReversed() -> Array`
-   `Array.prototype.toSorted(compareFn) -> Array`
-   `Array.prototype.toSpliced(start, deleteCount, ...items) -> Array`
-   `Array.prototype.with(index, value) -> Array`

These functions don't need much explaining, but I'll give you a basic idea about them so you understand what's going on. The important part here is that **all the functions are non destructive**, meaning they don't touch the original object, all of them return a new array with the modifications.

### `toReversed`

Does the same thing as our second example, meaning it reverses an array and gives back the reversed copy of that array, without modifying the original.

```js
let x = [ 1, 2, 3 ];
let y = x.toReversed();

// [ 1, 2, 3 ], [ 3, 2, 1 ]
console.log(x, y);
```

### `toSorted`

Same as the previous one and its `sort` counterpart, this function sorts an array following a sorting function without modifying the original array, by default, the sorting function takes the array and sorts it numerically like this:

```js
let x = [ 5, 3, 4, 2, 1 ];
let y = x.toSorted(); // [ 1, 2, 3, 4, 5 ]
```

But, just like `sort` it accepts a sorting function that follows a `(a, b) => number` signature where if:

-   The return is `>0`, `a` comes after `b`
-   The return is `<0`, `a` comes before `b`
-   The return is `0`, no change is made[^n1]

```js
let x = [
    { value: 0 },
    { value: 4 },
    { value: 2 },
    { value: 3 }
];

// y vai ser:
// [
//    { value: 0 },
//    { value: 2 },
//    { value: 3 },
//    { value: 4 }
// ]
let y = x.toSorted((a, b) => {
    return a.value - b.value
});
```

### `toSpliced`

The `splice` method is not the same as the `slice` method, while `slice` returns a subset of the original array **in a new array**, `splice` changes the array content in three ways:

-   Adding items anywhere in the array
-   Removing items anywhere in the array
-   Replacing one item with another item anywhere in the array

The problem is that it also did that on the array it received, whereas this version returns a new copy.

The function keeps the same signature, only with the new return: `(start, deleteCount, ...items) => Array`, where:

-   `start` is the position to start counting from, or where the pointer will begin
-   `deleteCount` is the amount of items to remove starting at `start`
-   `...items` is an optional parameter that, if passed, tells the new value of position `start` after removing all the items in `deleteCount`[^n2]

```js
let x = [ "Cachorro", "Gato", "Zebra", "Morcego", "Tigre", "Leão" ];

// y é [ "Cachorro", "Cobra", "Morcego", "Tigre", "Leão" ]
let y = x.toSpliced(1, 2, "Cobra");

// z é [ "Cachorro, "Tigre", "Leão" ]
let z = x.toSpliced(1, 3);
```

> This example also shows really well why these functions are good. If we modified the array in the original array itself, we'd have to recreate `x` every single time

### `with`

This is a new function that simplifies the use of splice a bit when we only have to modify one element of the array, originally if we wanted to modify this array:

```js
let x = [ "Cachorro", "Gato", "Zebra", "Morcego", "Tigre", "Leão" ];
```

To show "Cobra" instead of "Gato", we'd have to do this with `splice`:

```js
let y = x.toSpliced(1, 1, "Cobra");
```

With `with` we can do this:

```js
// [ 'Cachorro', 'Cobra', 'Zebra', 'Morcego', 'Tigre', 'Leão' ]
x.with(1, "Cobra")
```

Essentially we're saying: "Take array X, at position 1 and show it **with** this other value".

## Support

Support isn't implemented in all browsers yet, but you can use the [polyfills](https://github.com/tc39/proposal-change-array-by-copy/blob/main/polyfill.js) available at TC39 to implement this functionality. If you're using Node, you can use [`core-js`](https://github.com/zloirock/core-js#change-array-by-copy) to test it, your code would look something like this:

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

let x = [ "Cachorro", "Gato", "Zebra", "Morcego", "Tigre", "Leão" ];
console.log(x.toSpliced(1,1,"Cobra"))
console.log(x.with(1, "Cobra"))
```

This functionality is expected to be released in the next version of ECMAScript, along with several super cool features I already talked about [here](/o-futuro-do-js/).

[^n1]: You can find this documentation on the [MDN site](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort).

[^n2]: This example also shows really well why these functions are good. If we modified the array in the original array itself, we'd have to recreate `x` every single time.
