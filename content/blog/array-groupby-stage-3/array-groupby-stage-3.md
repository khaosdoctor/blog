---
title: "Grouping with Array.prototype.groupBy"
pubDate: 2022-01-12T15:00:00.000Z
updatedDate: 2026-07-16T16:11:06.000Z
category: "javascript"
tags: ["javascript", "development", "ecmascript"]
lang: en
description: "No more grouping objects and keys by hand or reaching for external libraries. JavaScript now has a native grouping method!"
slug: "array-groupby-stage-3"
machineOwnedTranslation: true
draft: false
---

Ever since I started programming, I've always found myself in situations where I needed to use a simple function that, at the same time, didn't exist in the languages I was working with.[^n1]

It was no different when I had to work with JavaScript and needed to do a simple grouping action, meaning I had to split my object or array into small groups according to the type of item I had in them.

Luckily, one of the lifesavers for every dev who needs very common functions is to reach for utility libraries, the most famous one today being [LoDash](https://lodash.com), which coincidentally has a method called `groupBy`.

But the era of downloading external libraries for these simple functions is coming to an end, because now we can have our own `groupBy`, except **native.**

## Grouping

Grouping functions fall into a class of functions I like to call _amazing and lazy_, because they're extremely useful for pretty much every kind of thing we can do in development, while also being fast and simple to implement, but they're so simple that, at the same time, it's not worth writing something from scratch.

That's why a lot of people resort to downloading an external library like LoDash so they can have the problem solved in a simple, practical way.

I was never a big fan of having to download a library and create a dependency on external code for such a simple function, especially if I'm only going to use it once in my code. So I prefer to write these functions by hand.

There are infinite ways to do simple grouping, and by simple grouping I mean being able to take a series of items inside an array and organize them into categories, for example, splitting users in a system by their access level:

```js
const usuarios = [
    { name: 'Lucas', role: 'admin' },
    { name: 'Ana', role: 'reader' },
    { name: 'Erick', role: 'reader' },
    { name: 'Beatriz', role: 'writer' },
    { name: 'Carla', role: 'admin' }
]
```

The output I want is something like this:

```js
const groups = {
    admin: [
        {name: 'Lucas', role: 'admin'}, 
        {name: 'Carla', role: 'admin'}
    ],
    reader: [
        { name: 'Ana', role: 'reader' },
        { name: 'Erick', role: 'reader' },
    ],
    writer: [
        { name: 'Beatriz', role: 'writer' }
    ]
}
```

So how do we write a function like that? The simplest way I can think of is with a `reduce`:

```js
function groupBy (array, key) {
	return array.reduce((acc, item) => {
    	if (!acc[item[key]]) acc[item[key]] = []
        acc[item[key]].push(item)
        return acc
    }, {})
}
```

There's another way to group if we simplify the `reduce` a bit more to use the **spread operator**:

```js
function groupBy (array, key) {
	return array.reduce((acc, item) => ({
      ...acc,
      [item[key]]: [...(acc[item[key]] ?? []), item],
    }),
  {})
}
```

But there are [some articles](https://prateeksurana.me/blog/why-using-object-spread-with-reduce-bad-idea/) arguing that using spread for this case might be a bad idea, since we end up with a "hidden" loop that can make our function a function of [exponential complexity](https://pt.wikipedia.org/wiki/Complexidade_ciclomática).

Then we have [lodash.groupBy](https://lodash.com/docs/4.17.15#groupBy), which is almost the same implementation, but with some types for compatibility and stricter error handling. A function that, along with others like `intersect` and `difference`, is _amazing and lazy._

## The native solution

Recently the TC39 [committee](https://tc39.es/), the organization that maintains and steers JavaScript, announced that one of its [proposals](https://github.com/tc39/proposal-array-grouping), the one that will add the new `groupBy` method to `Array.prototype`, has already reached stage 3![^n2]

That means that soon we'll be able to see an implementation exactly like this one in system code all over the world:

```js
const usuarios = [
    { name: 'Lucas', role: 'admin' },
    { name: 'Ana', role: 'reader' },
    { name: 'Erick', role: 'reader' },
    { name: 'Beatriz', role: 'writer' },
    { name: 'Carla', role: 'admin' }
]

const grouped = usuarios.groupBy(({role}) => role)
```

The idea is that this feature ships as part of ES2022 during this year and becomes a built-in part of browsers some time after that.

But if you're like me and want to try this feature out as soon as possible, then you need an [implementation shim](https://github.com/es-shims/Array.prototype.groupBy) or else wait to use [babel](https://babeljs.io) with the `stage-3` preset so you can code the same way you already do today!

[^n1]: Cover photo by [Markus Spiske](https://unsplash.com/@markusspiske?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/group?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText).

[^n2]: If you don't know how the JavaScript publishing and evolution process works, [this video](https://www.youtube.com/watch?v=hDQu3AvvDfg) will help you understand everything.
