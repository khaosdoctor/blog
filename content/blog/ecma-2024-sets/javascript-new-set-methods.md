---
title: JavaScript gains new Set methods
pubDate: 2024-07-04T11:00:40.000Z
updatedDate: 2026-07-16T17:55:39.000Z
category: typescript
tags:
  - ecmascript
  - javascript
lang: en
description: JavaScript has just gained new Set methods in 2024, let's explore them!
seoTitle: Everything about the new Set methods in JavaScript
slug: javascript-new-set-methods
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Seven years ago, people asked for Sets to have more methods beyond the standard `add`, `has`, etc. These methods were designed for cases where you need to work with multiple sets, for example, creating unions, intersections, etc., which are very common operations.

Well, 7 years later, [this proposal](https://github.com/tc39/proposal-set-methods) has finally reached stage 4! In other words, it's finally going to be implemented in JavaScript and browsers!

> If you don't know what sets are: they're nothing more than structures similar to arrays, but they can only store a value once (we covered these techniques [here](/removendo-itens-duplicados-no-javascript-es6/)). It's a way to deduplicate an array efficiently.

From now on, we have the following new methods on sets:

> [!NOTE] 💡
> To make it clearer, let's say set ****A**** is the initial Set, and set ****B**** is the secondary set

## Set.prototype.intersection

Returns the elements that are present in both A and B:

```js
const A = new Set([1, 3, 5, 7, 9]);
const B = new Set([1, 4, 9]);
console.log(A.intersection(B)); // Set(2) { 1, 9 }
```

## Set.prototype.difference

The opposite of intersection, returns items that are present in A but not in B:

```js
const A = new Set([1, 3, 5, 7, 9]);
const B = new Set([1, 4, 9]);
console.log(A.difference(B)); // Set(3) { 3, 5, 7 }
```

## Set.prototype.union

Combines both sets into a single set. An operation that was annoying to do previously because we had to have two separate sets, convert them to arrays, and then combine them in a third set. So this method:

```js
const A = new Set([2, 4, 6, 8]);
const B = new Set([1, 4, 9]);
console.log(A.union(B)); // Set(6) { 2, 4, 6, 8, 1, 9 }
```

Is a reduction of this:

```js
const A = new Set([2, 4, 6, 8]);
const B = new Set([1, 4, 9]);
console.log(new Set([...A, ...B])); // Set(6) { 2, 4, 6, 8, 1, 9 }
```

## Set.prototype.symmetricDifference

This method is quite interesting, it returns elements that are in either A or B, but **not** in both. If you know a bit about logic, this is the equivalent of an XOR logic gate (e**x**clusive **or**, or _"exclusive or"_).

```js
const A = new Set([2, 4, 6, 8]);
const B = new Set([1, 4, 9]);
console.log(A.symmetricDifference(B)); // Set(5) { 2, 6, 8, 1, 9 }
```

## Set.prototype.isSubsetOf

A verification function that checks if A is **completely contained** in B:

```js
const A = new Set([4, 8, 12, 16]);
const B = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18]);
console.log(A.isSubsetOf(B)); // true
```

## Set.prototype.isSupersetOf

Similarly, but in reverse, this function indicates if all elements of B are contained in A:

```js
const A = new Set([4, 8, 12, 16]);
const B = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18]);
console.log(B.isSupersetOf(A)); // true
```

## Set.prototype.isDisjointFrom

This is the final method to close the loop, indicating that A and B are disjoint, meaning there's no element of A in B.

> Which also means there's no element of B in A, so this function is idempotent

```js
const A = new Set([2, 3, 5, 7, 11, 13, 17, 19]);
const B = new Set([1, 4, 9, 16]);
console.log(A.isDisjointFrom(B)); // true
console.log(B.isDisjointFrom(A)); // true
```

## Conclusion

The new set methods are available in these versions:

-   122 or higher of Chrome
-   122 or higher of Edge
-   127 or higher of Firefox
-   17 or higher of Safari

You can find more details on [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/intersection)
