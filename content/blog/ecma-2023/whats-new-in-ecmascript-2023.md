---
title: "\"What's New in ECMAScript 2023?\""
pubDate: 2023-05-04T10:00:18.000Z
updatedDate: 2026-07-16T16:00:40.000Z
category: "typescript"
tags: ["ecmascript", "javascript", "typescript", "nodejs", "development"]
lang: en
description: "\"ECMAScript 2023 is officially finalized, and we already know which features will arrive in the new JavaScript specification\""
seoDescription: "\"ECMAScript 2023 is officially finalized and we already know which features will come in the new JavaScript specification\""
slug: "whats-new-in-ecmascript-2023"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Another year, another ECMAScript version. For those unfamiliar, ECMA is the primary specification on which JavaScript is based. It undergoes changes every year, with minor updates released throughout the months and larger changes over the years.

In this video I explain a bit more about the process of releasing new JavaScript features. If you haven't watched it yet, I strongly recommend it so you can better understand how everything works!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

Most of these changes are documented in TC39 notes, the _technical committee #39_, which is the technical committee that evaluates and discusses the future of the language specifically. These notes are public and you can view all of them in the [official committee repository](https://github.com/tc39/notes/tree/main/meetings/2023-03).

Just as I do with other technologies, JS is no different! In [2022](/news-js-2022/) I published an article about that year's news and even dared to [predict what would come this year](/o-futuro-do-js/). Was I right?

## Array.findLast

One of the proposals open in TC39 was the ability to reverse the initial search direction in an Array. Today, the `find` and `findIndex` methods will always start searching an array from its first element (which is `0`, as it should be).

However, in the case of sorted arrays, having the ability to search backwards, starting from the tail to the head, is much faster and more efficient. But then you might argue: "Well, can't you just reverse the array first and then use `find`?" Basically yes, but no.

When we reverse an array using the `reverse` method, we perform an operation on it that will inevitably iterate over half of the array's items. This method is quite fast today, but here is how the specification says it should work:

```js
function reverse(array) {
  let len = array.length
  let middle = Math.floor(len / 2)
  let lower = 0

  while (lower !== middle) {
    let lowerVal
    let upperVal

    let upper = len - lower - 1
    let upperP = upper.toString()
    let lowerP = lower.toString()

    let lowerExists = array.hasOwnProperty(lowerP)
    if (lowerExists) lowerVal = array[lowerP]

    let upperExists = array.hasOwnProperty(upperP)
    if (upperExists) upperVal = array[upperP]

    if (lowerExists && upperExists) {
      array[lowerP] = upperVal
      array[upperP] = lowerVal
    } else if (!lowerExists && upperExists) {
      array[lowerP] = upperVal
      delete array[upperP]
    } else if (lowerExists && !upperExists) {
      delete array[lowerP]
      array[upperP] = lowerVal
    } else {
      if (lowerExists || upperExists) throw new Error('This should never happen')
    }
    lower++
  }
  return array
}
```

> This implementation was taken directly from the ECMA262 specification, [section 23.1.3.26](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.reverse), and converted from pseudocode to JavaScript

As you can see, the implementation starts from both the beginning and the end simultaneously, swapping the positions of each item until the two pointers finally meet in the middle. You can imagine it's not that fast, so let's test this function:

```js
for (let i = 1; i <= 1_000_0000; i = i * 10) {
  console.log(`i: ${i}`)
  let a = [...Array(i).keys()]
  console.time('reverse')
  reverse(a)
  console.timeEnd('reverse')
}
```

Our output will be something like this (reduced to fit):

```
i: 1 -> reverse: 0.006ms 
i: 10 -> reverse: 0.046ms 
i: 100 -> reverse: 0.392ms 
i: 1000 -> reverse: 2.335ms 
i: 10000 -> reverse: 4.026ms 
i: 100000 -> reverse: 68.4ms 
i: 1000000 -> reverse: 150.565ms 
i: 10000000 -> reverse: 1.542s 
```

Notice it's exponential. Of course, in modern implementations, `reverse` is much more optimized and runs much faster, but the point is: **we will have some processing overhead**.

The new proposal creates two new methods, `findLast` and `findLastIndex`, which do exactly the same as the original methods but starting from the end. This avoids the need to reverse the array. Here's an example:

```js
const isEven = (number) => number % 2 === 0;
const numbers = [1, 2, 3, 4];

// Existing method
console.log(numbers.find(isEven)); // 2
console.log(numbers.findIndex(isEven)); // 1

// New method
console.log(numbers.findLast(isEven)); // 4
console.log(numbers.findLastIndex(isEven)); // 3
```

## Hashbang Usage

The grammar known as [hashbang (or shebang)](https://en.wikipedia.org/wiki/Shebang_\(Unix\)) is the famous character sequence that starts with `#!` at the beginning of a script. It defines which interpreter will execute that script.

Today this is already possible with Node through scripts like:

```js
#!/usr/bin/env/node

console.log('Hello')
```

Under the hood, your shell removes the first line and passes the file to the interpreter you specified. In this case, it's the Node.js executable that `env node` returns.

The [proposal](https://github.com/tc39/proposal-hashbang) doesn't change the behavior, it simply creates a standard for how this should be done across different environments.

## Copying Arrays

This is one of the main features, including one I predicted would show up in JS this year, and it's been one of the most requested. As we saw earlier, the `reverse` method performs an _in place_ operation, meaning it replaces the elements of the same array that was passed, returning the same reference. Essentially, it modifies the original object, and that's not ideal.

To work around this kind of behavior, what we generally do is something like this:

```js
const original = [1,2,3]
const novo = [...original]
console.log(novo.reverse()) // [3, 2, 1]
console.log(original) // [1, 2, 3]
```

The proposal adds four new methods to `Array.prototype`, all variations of the original `reverse`, `sort`, and `splice` methods, along with a new method called `with` that returns a new array with one element at a specific position changed. This avoids _in place_ modifications like using `a[0] = 1`.

The new methods are called `toReversed`, `toSorted`, `toSpliced`, and (of course) `with`.

### `Array.prototype.toReversed()`

```js
const original = [1, 2, 3, 4];
const reversed = original.toReversed();

console.log(original);
// [ 1, 2, 3, 4 ]

console.log(reversed);
// [ 4, 3, 2, 1 ]
```

#### `Array.prototype.toSorted()`

```js
const original = [1, 3, 2, 4];
const sorted = original.toSorted();

console.log(original);
// [ 1, 3, 2, 4 ]

console.log(sorted);
// [ 1, 2, 3, 4 ]
```

#### `Array.prototype.toSpliced()`

```js
const original = [1, 4];
const spliced = original.toSpliced(1, 0, 2, 3);

console.log(original);
// [ 1, 4 ]

console.log(spliced);
// [ 1, 2, 3, 4 ]
```

#### `Array.prototype.with()`

```js
const original = [1, 2, 2, 4];
const withThree = original.with(2, 3);

console.log(original);
// [ 1, 2, 2, 4 ]

console.log(withThree);
// [ 1, 2, 3, 4 ]
```

## WeakMaps with Symbols

This [proposal](https://github.com/tc39/proposal-symbols-as-weakmap-keys) is quite complicated to explain, mainly because it's a very specific case of other very specific cases... But in summary, the specification now allows using [Symbols](https://medium.com/trainingcenter/javascript-symbols-decifrando-o-mist%C3%A9rio-383e359e64e3) as keys for [WeakMaps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap).

> I won't go into details about WeakMaps here, but you can find more about real use cases in this [StackOverflow](https://stackoverflow.com/a/29416340) answer

Previously, only objects were allowed as keys. However, `Symbols` are another case where we have a unique variable that cannot be recreated with the same value. This proposal makes WeakMaps accept these values as keys.

```js
const weak = new WeakMap();
const key = Symbol("ref");
weak.set(key, "ECMAScript 2023");

console.log(weak.get(key));
// ECMAScript 2023
```

## Conclusion

Many of the features I predicted in my [last article](/o-futuro-do-js/) ended up being promoted to higher stages or discarded, some even got dedicated articles, while others remain exactly as they were a year ago.

This specification update doesn't touch much of what we use day-to-day, but it promises to be a great quality-of-life improvement for those using more specialized features that can certainly have a significant impact on efficiency and performance.
