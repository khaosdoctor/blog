---
title: What is the new number sequence proposal with Iterator.range in JavaScript
pubDate: 2023-02-16T11:00:08.000Z
updatedDate: 2026-07-16T16:03:35.000Z
category: javascript
tags:
  - javascript
  - ecmascript
  - development
  - typescript
lang: en
description: An API you never imagine you need until you do! Learn about sequences in JavaScript!
seoTitle: Understand ranges in JavaScript with the new Number.range
slug: the-new-iterator-range-proposal-for-javascript-sequences
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Sometimes the simplest proposals are the ones that bring the most value to a project, and this one is no exception.

Many languages, Python for example, have structures to represent and even create sequences of natural numbers in a simple way. JavaScript didn't have this capability, and it was extensively requested in many projects.

But the wait is over. Today we're going to talk about the [proposal](https://github.com/tc39/proposal-Number.range) that will add the `range` method to an iterator. This is a proposal that's in its early stages (it hasn't passed **stage 1**), but it's extremely promising!

If you don't know how JavaScript works, in this video I explain a bit more about the process of releasing new JavaScript features. If you haven't watched it yet, I strongly recommend it to better understand how everything works!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

## Ranges

Ranges or sequences are meta-structures of a language, meaning they exist in theory, but they're essentially just an encapsulation of simpler logic transformed into a language construct. Ranges are simply a sequence of numbers with a minimum value, a maximum value, and an optional value called `step` that is the number of integers we skip each time.

Ranges are useful for a variety of things, but one of the main uses is as an alternative to an iterator. Instead of doing something like:

```js
for (let i = 0; i < 10; i++) { ... }
```

You could make a simpler call. For example, in Python, you can generate a range of numbers from 0 to 9 using this code:

```python
for n in range(10):
	print(n)
```

This code will print numbers from 0 to 9 in the console, but you can do the same thing using a simple `for` loop and counting from 0 to 9. For example, in JavaScript it would be something like this:

```js
let x = [0]
for (let i = 0; i <= 9; i++) {
    x.push(i+1)
}
```

It's more steps and more code, and that's exactly why this proposal came about. In fact, it doesn't have any special goal to improve performance or to make counting more efficient. It's purely and simply because all other languages have it too, and a language without a `range` seems incomplete.

> This is one of those types of functions that is super simple and has some specific uses you can't escape from, the same way as the intersection of two arrays or the difference between them. It's too simple not to be built into the language.

In fact, there's [an entire Stack Overflow question](https://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-a-range-within-the-supp) with more than 20 different implementations of a range. The one I like the most is a simple and concise implementation that uses the keys of an array as values:

```js
[...Array(10).keys()]
// 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
```

I actually [made a post a while back](https://www.instagram.com/p/Ch9cIUdL4Am/) showing how we can implement iterators to create a range function, which is **exactly** how this proposal is built.

### Iterator.range

The idea of how the proposal will be implemented is still under discussion. The two options would be:

-   Implement the **method** range inside the `Number` class, becoming something like `Number.range`
-   Create a new class called `Interval` that would contain other types of methods besides range

This is an [open discussion](https://github.com/tc39/proposal-Number.range/issues/22) that you can participate in!

> I personally don't lean strongly toward either side, but depending on how ranges are meant to be used, I'd say I prefer the method over the class, at least for now.

Assuming the original proposal, which is to use a method on the `Number` class, is winning, the proposal will add a `range` function that has this signature on both `Number` and `BigInt`:

```js
class Number {
  range(start: number, end: number, options: { step: number = 1, inclusive: boolean = false } | step: number = 1): RangeIterator;
}

class BigInt {
  range(start: bigint, end: bigint | Infinity | -Infinity, options: { step: bigint = 1n, inclusive: boolean = false } | step: bigint = 1n): RangeIterator;
}
```

This means we'll be able to do something like this:

```js
for (const i of Number.range(1, 10)) {
  console.log(i); // => 1, 2, 3, 4, 5, 6, 7, 8, 9
}
```

Or even simplify it a bit by destructuring the property:

```js
const { range } = Number
console.log(...range(1, 10, 2))
```

Where the third parameter can be either the `step` or an options object that contains these properties:

-   `step`: How many numbers we should skip at a time. This can be a negative number, so you can create ranges that start, for example, at 100 and go to 0 with `range(100, 0, -1)`
-   `inclusive`: is a property that defines whether the final value is included in the count. For example, `range(100, 0, -1)` would count from 100 to 1, excluding `0`. Meanwhile, `range(100, 0, {inclusive: true, step: -1})` would count from 100 to 0.

### Future implementations

This proposal works very well with another proposal called [slice notation](https://github.com/tc39/proposal-slice-notation), which adds `[start:end]` notation to JavaScript. In the proposal, one of the main examples is dealing with arrays, for example:

```js
const arr = ['a', 'b', 'c', 'd'];

arr[1:3];
// → ['b', 'c']

arr.slice(1, 3);
// → ['b', 'c']
```

In other words, the idea is to replace direct use of `slice`. However, in the case of ranges, we could do something like this:

```js
const x = 1:3 // [1,2,3]
```

Which would be the same as using `range(1, 3, { inclusive:true })`. And this seems to be a very interesting proposal, especially if we can do something like this:

```js
for (let x in 1:100) {}
```

### Conclusion

Even though the proposal is recent and under discussion, I believe it will be enough to change how we work with JavaScript, at least in a subtle way.

If you want to test this proposal, the [core-js](https://github.com/zloirock/core-js/#numberrange) package contains polyfills for these functions. Just run `npm install core-js` in your package and create a file like this `index.mjs`:

```js
import 'core-js/proposals/number-range.js'
const { range } = Number
console.log(...range(100, 0, -1))
```

I strongly recommend testing it and finding other uses for range. And I also invite you to comment on the proposal with your thoughts on how this API should be!

Did you like this idea? Leave a comment here with your uses for range and reach out to me on my [social media](https://lsantos.dev). I'd love to talk about it!
