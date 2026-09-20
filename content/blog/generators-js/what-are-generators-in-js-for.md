---
title: '"What are generators for in JS?"'
pubDate: 2023-01-05T13:00:46.000Z
updatedDate: 2026-07-16T16:04:21.000Z
category: technology
tags: ["javascript"]
lang: en
description: "\"Generators are not a recent API in JavaScript, yet they remain little known. Let's learn what generators are for, how you can use them in your applications, and how to take your skills to the next level with this feature.\""
seoDescription: "\"Generators are not a recent API in JavaScript, yet they remain little known. Let's learn what generators are for and how you can use them in your applications.\""
slug: what-are-generators-in-js-for
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Two of the most interesting, and also most complex, structures in JavaScript are **iterators** and **generators**. These two structures are not new. In fact, I wrote about both [generators](https://medium.com/trainingcenter/javascript-entendendo-generators-408cbce9aee) and [iterators](https://medium.com/trainingcenter/iterators-em-javascript-880adef14495) back in 2017. But even though these two structures (especially iterators) are heavily used in many frameworks and even in core language constructs like Promises and our beloved async/await, generators are still not widely known or used.

This article is exactly about that! You'll understand how generators can be used in your applications in a more practical way.

## What are generators?

First, let's recap what generators are. They are a low-level construct, typically used to build other tools. A generator is a function that returns a _generator object_, which is an object that implements the `iterable` protocol. In other words, it has a `Symbol.iterator` that is used to perform loops.

The difference is that a _generator function_ returns a special type of iterator that can pause its own execution while maintaining its internal state and context. A generator is declared with a `*` in front of a function, like this:

```js
function *generator() {
    yield 1
    yield 2
    yield 3
}
```

Or:

```js
function* generator() {
    yield 1
    yield 2
    yield 3
}   
```

Both are the same and can be used interchangeably. These generators return an iterator, meaning you can call `.next()` on each of these iterators, and when executed, the value after `yield` will be returned on each call. For example:

```js
function* generator () {
    yield 1
    yield 2
    yield 3
}

const g = generator()
console.log(g.next()) // 1
console.log(g.next()) // 2
console.log(g.next()) // 3
```

We can also use generators with the _spread_ operator, for example:

```js
function* generator () {
    yield 1
    yield 2
    yield 3
}

const g = generator()
console.log([...g]) // [1, 2, 3]
```

But I won't go too deep here. If you want to understand what generators are, I recommend reading [the article I mentioned](https://medium.com/trainingcenter/javascript-entendendo-generators-408cbce9aee) as it will give you a solid foundation for understanding everything.

## Uses of Generators

Now let's stop discussing what generators are and talk about why they exist.

### Lazy iterators

This is probably the most common use of a generator. When I said that generators are special cases of iterators, I also said they have a very unusual characteristic. They can **pause** their execution.

What does that mean? Basically, calls to a generator, whether through a loop like `for .. of` or `.next()`, are only executed at that specific moment. For example:

```js
function* jsFacts() {
    yield 'The most present language on the Web'
    yield 'Created in 1995 by Brendan Eich'
    yield 'Can be used on the backend with Node, Deno and others'
}

for (let fact of jsFacts()) {
    console.log(`JS: ${fact}`)
}

// JS: The most present language on the Web
// JS: Created in 1995 by Brendan Eich
// JS: Can be used on the backend with Node, Deno and others
```

What's happening here is that the strings won't exist until the next item is called. While for strings this might seem pointless, generators as lazy iterators can be widely used to build `recordSets`, which are structures that fetch data from, for example, a database, and instead of returning all values at once, return them one by one so as not to overload memory.

For example, imagine we have a database with terabytes of information, we want to get all the data, but we don't want it all at once. We can build a _lazy iterator_ that calls the database to return only one value at a time:

```js
const linha = [{
  nome: 'Alan Turing', 
  id: 1,
  idade: 42,
  titulo: 'Pai da computação'
}, {
  nome: 'Ada Lovelace',
  id: 2,
  idade: 36,
  titulo: 'Primeira programadora'
}, {
  nome: 'Grace Hopper',
  id: 3,
  idade: 85,
  titulo: 'Inventora do compilador'
}]

const findInDatabase = (skip, limit) => {
  return linha.slice(skip, skip + limit)
}

function* recordSet() {
  let skip = 0
  const limit = 1
  let currentRecord = findInDatabase(skip, limit)

  while (currentRecord.length > 0) {
    skip += limit
    yield currentRecord[0]
    currentRecord = findInDatabase(skip, limit)
  }
}
```

If we pay attention to what we're doing, we'll see that we're defining an internal state with a `skip` variable, which is the number of records we want to skip from the array (which is our database). We do the first iteration and save the current record in `currentRecord`, which is another part of the internal state. Then we can create a loop validating whether the result received is valid, meaning whether it still has records in the database. If yes, we add the `skip` to the limit of data we want (in this case just 1 at a time), return the current result, and then pause execution.

Whenever we initialize our generator with:

```js
const records = recordSet()
```

We execute all the code up to `yield currentRecord[0]`. Then, when we do:

```js
const records = recordSet()
console.log(records.next()) // {value: { nome: 'Alan Turing', id: 1, idade: 42, titulo: 'Pai da computação' }, done: false }
```

We execute our generator and get the value coming from `yield`. Then we execute the loop again until the next `yield`.

We can also use another variation of the generator so we don't have internal state and define the stopping condition inside the loop like this:

```js
function* recordSet() {
  let skip = 0
  const limit = 1

  while (record.length > 0) {
    const record = findInDatabase(skip, limit)
    if (record.length === 0) return
    skip += limit
    yield record[0]
  }
}
```

The values we get from `next` are objects of type `{value: any, done: boolean}` that come from the iterator we're accessing.

### Infinite ranges

Another thing we can do is create an infinite counter:

```js
function* infiniteSequence() {
  var i = 0;
  while (true) {
    yield i++;
  }
}
```

What might not seem like much, but it's a powerful tool for global monitoring. For example, if we want to count how many promises an application created during its lifetime, we can do something like this:

```js
function* sequence() {
  var i = 1
  while (true) {
    yield i++
  }
}

const promisesCreatedCounter = sequence()
let promisesCreatedTotal = 0

const proxyPromise = new Proxy(Promise, {
  get(target, prop) {
    if (prop === 'prototype') {
      promisesCreatedTotal = promisesCreatedCounter.next().value
    }
    return target[prop]
  }
})

const p = new proxyPromise((resolve) => {
  resolve('done')
})

p.then(() => {
  console.log('Promise resolved')
})

console.log('Promises created: ' + promisesCreatedTotal) // Promises Created: 1
```

Furthermore, each instance of such a sequence is unique, which means you can reuse the same counter in different places and it will always start from 1.

### Utility functions

As I mentioned before, it's possible to build many tools from generators because they are a low-level tool. Some of the functions we can build with them are, for example:

#### take

A function that, given an iterable, will take `n` number of elements from that iterable and return them:

```js
const take = (n) => function*(iteravel) {
    let i = 0
    for (let elemento of iteravel) {
        if (i >= n) return
        yield elemento
        i++
    }
}
```

If we have an array like `[1,2,3,4]` and do `take(4)([1,2,3,4,5,6])` we get `[1,2,3,4]`

#### repeat

A variation of the sequence function where we have the same value repeated infinitely:

```js
function* repeat(valor) {
    while (true) {
        yield valor
    }
}
```

#### scan

We can define a function similar to `Array.prototype.reduce`, but instead of having a single final value, we can have each step of the intermediate values as an array:

```js
function* scan(reducer, valorInicial, iteravel) {
  let resultado = valorInicial;
  yield resultado;
  for (const atual of iteravel) {
    resultado = reducer(resultado, atual);
    yield resultado;
  }
}
```

And many others. The point is that these functions individually might not seem like much, but they allow us to build more complex functions and sequences when combined. And that's what generators are all about: creating small functions that can serve a greater purpose.

> In fact, many of these functions are described in a proposal I'll still write about here called [Iterator Helpers](<https://www.proposals.es/proposals/Iterator helpers>).

## Conclusion

Generators will probably always be rarely used because they have very specific use cases, but it's always interesting to understand that these tools exist and that you can take advantage of them.

Keep an eye out for upcoming articles about iterators, and if you don't want to miss anything about the content I release, subscribe to the newsletter here!

https://news.lsantos.dev
