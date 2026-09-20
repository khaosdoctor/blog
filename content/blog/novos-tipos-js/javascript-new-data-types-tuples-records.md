---
title: Meet the new JavaScript data types - Tuples and Records
pubDate: 2022-03-22T14:00:00.000Z
updatedDate: 2026-07-16T16:10:30.000Z
category: technology
tags: ["javascript"]
lang: en
description: Meet the proposal for tuples and records that could change JavaScript history for the better! And you can still help shape this idea!
slug: javascript-new-data-types-tuples-records
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

If you follow the [JavaScript proposals list](https://github.com/tc39/proposals) in the TC39 repository, you've probably already come across the latest proposals for the language.[^n1]

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

JavaScript's evolution model is extremely important for the language because it allows **anyone** to submit their own proposal and suggest modifications and additions to the language. All you need is a good use case and the backing of most champions!

One proposal gaining traction is the **addition of two new primitives** called **Tuple** and **Record**. And they'll make all the difference for anyone who uses them.

## About immutability

Records and Tuples aren't new in programming. Other languages already use this type of primitive to represent values we call **collections**. Like Arrays and Objects, a Tuple (or tuple in Portuguese) or a Record are also sets of values grouped at a single memory address.

The difference between these primitives and the ones we already have, like Array and Object, is that they are **immutable**.

You can define a Tuple like this:

```js
let tuple = #['minha', 'tupla']

let tupla = Tuple(['um', 'array'])
```

We can also define a tuple from another array:

```js
const tupla = Tuple(...[1, 2, false, true])
const tuple = Tuple.from([false, true, 'a'])
```

Records, on the other hand, are the object variants of tuples and can be defined as:

```js
let record = #{
  meu: 'novo',
  record: true
}

let outroRecord = Record({ um: 'objeto' })
```

Immutability is an increasingly common characteristic in most systems built today, but like collections, it goes back a long time.

The idea behind creating an immutable object is that it, as the name itself suggests, doesn't undergo any kind of change during its lifetime. But this doesn't mean you can never modify the variable after creating it. What happens instead is that the **original** value isn't changed.

In practice, an immutable variable creates a copy of itself with each operation performed on it. We already have some forms of immutability in JavaScript with functions like `map`, `slice`, `find`, `filter`, `reduce`, and others. So for example, if we had a string and a method to change that string, and if it weren't immutable, we'd get:

```js
let string = 'mutavel'
console.log(string) // mutavel

string.mudar('outro valor')
console.log(string) // outro valor
```

However, if we have an **immutable** string, we'd get this flow:

```js
let string = 'imutavel'
console.log(string) // imutavel

let novaString = string.mudar('outro valor') // retorna uma nova string

console.log(string) // imutavel
console.log(novaString) // outro valor
```

If instead of a string, the value were an Array, we'd get a new array returned for each new item in that array. This is easy to understand if you think about how `slice` returns a new array that's a subset of the original.

Libraries like ImmutableJS do this work very well. The big advantage of immutability is that you have much greater control over your application by having complete control of every step in the data flow, so you can return to any previous value at any time.

Of course, this has a cost. Each new version of your variable takes up extra memory space, and if you don't remove your previous states, you can end up with some performance issues.

## Immutable collections

So far so good, but what's the point of talking so much about immutability when this post is about two new collections? Because this aspect makes all the difference when we're talking about objects and arrays, especially in JavaScript.

Tuples and Records work the same way as regular Arrays or Objects. The main difference is that we don't have _"in place"_ mutation operators, that is, functions that change the original value itself, like `Array.push` or `Array.splice`. If we try to create a tuple and modify that value, or a record and try to do the same, we'll get an error:

```js
let record = #{
  nome: 'Lucas'
}

record.idade = 26 // Erro

let tupla = #[1, 2, 3]
tupla[0] = 2 // erro
```

## Value comparison

One of the biggest questions I get from people over the years is the fact that JavaScript compares objects and arrays as references. This was already briefly explained in an article I published about prototypes and inheritance.

The idea is that when we compare two objects or two arrays (or even other structures that end up being converted to the object type), we always get `false` as the result:

```js
console.log({ a: 1 } === { a: 1 }) // false
console.log(['a'] === ['a']) // false
```

A lot of people think this behavior is a language error and that it should be fixed by using simple comparison with `==` instead of `===`. But the problem isn't the types, it's the reference.

For JavaScript, two objects or arrays are equal if they point to the same memory reference. This is never possible when comparing two literal objects like these, because each time we create a new object, we get a new object created and, therefore, a new memory address. So we'll never get a true comparison.

> At this point we could even say that JavaScript makes object creation, in effect, immutable.

And that's where one of the most important and useful features of these new primitives comes in: **Tuples and Records are compared by value**.

Since we're dealing with contents that are immutable, JavaScript can now naturally compare the two objects directly by value. This means we can compare something like:

```js
#{a:1} === #{a:1} // true
#[1, 2, 3] === #[1, 2, 3] // true
```

This makes the whole object comparison process much easier instead of having to compare objects by their text representation with the classic `JSON.stringify`.

## Manipulating Tuples and Records

As I explained before, tuples and records have exactly the same methods as objects and arrays. The difference is that we can't add new values or modify existing values, so methods like `push` don't exist in this context. However, it's possible to manipulate and even extend the values of these objects much more easily.

We can use the **rest** operator on both tuples and objects to create a new instance of these values without modifying the previous one. This lets us add and modify values in real time without having to write as much. For example, if we have a record like:

```js
const record = #{
  nome: 'Lucas'
}
```

And now we want to add the `age` property, we can do it like this:

```js
const record = #{
  nome: 'Lucas'
}

const recordComIdade = #{
  ...record,
  idade: 26
}
```

In other words, the same way we naturally do with objects, but asynchronously.

The same applies to tuples:

```js
const tuple = #[1, 2, 3]
const tupleComMaisValores = #[...tuple, 4, 5]
```

The difference is that tuples have one more method, `with`, which lets us add (or concatenate) values to the end of the tuple:

```js
const tuple = #[1, 2, 3]
const tupleComMaisValores = tuple.with(4, 5) // mesmo resultado do anterior
```

And just to make it even clearer, we can work with any of these new objects as if they were regular arrays or objects. We can even forget that they're a new type:

```js
const chaves = Object.keys(#{ name: 'Lucas', age: 26 }) // ['name', 'age']
const tuple = #[1,2,3,4,5]

for (const i of tuple) {
  console.log(i % 2 === 0 ? 'par' : 'impar')
}
```

## How can I start using this?

This proposal is still at stage 2, which means it's relatively stable and has a working implementation, but it's not yet considered official. Therefore, it's not yet available in any of the major market players like Node.js or browsers like Firefox, Chrome, and Edge.

However, part of being a stage 2 proposal is that it needs a working _polyfill_ (a "fake" implementation that mimics the full functionality using resources already present in the language). So you can [use this polyfill](https://babeljs.io/docs/en/babel-plugin-proposal-record-and-tuple#docsNav) and start testing the feature right now!

## Conclusion

The proposal is still under development. So much so that there's [an open issue since 2019](https://github.com/tc39/proposal-record-tuple/issues/10) to decide whether tuple and record creation will be through keywords like `immutable` or `fixed`, or through literal objects, as explained above.

Additionally, the keywords `tuple` and `record` already exist in type systems like TypeScript, and they may have some kind of conflict, which is also [being discussed](https://github.com/tc39/proposal-record-tuple/issues/9) since 2020.

The bottom line is that all of this is still very early, but the proposal is getting close to a conclusion, and you can help establish the next JavaScript data type!

[^n1]: If you don't yet know what TC39 is or how JavaScript works, I made a great video about it that you can watch [here](https://www.youtube.com/watch?v=hDQu3AvvDfg).
