---
title: '"The concept of \"reference\" and \"value\" in JavaScript"'
pubDate: 2024-02-21T11:00:38.000Z
updatedDate: 2026-07-16T15:53:01.000Z
category: technology
tags: ["javascript"]
lang: en
description: '"Understand the differences between reference and value in JavaScript: primitives are copied, objects create shared pointers. Learn cloning techniques."'
seoDescription: '"Understand the differences between reference and value in JavaScript: primitives are copied, objects create shared pointers."'
slug: the-concept-of-reference-and-value-in-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

During a conversation in the [Formação TS](https://formacaots.com.br) community, one of the students asked about one of the topics that were very famous in the past, but I haven't heard about it for years. The concept of **reference vs value** in JavaScript.

So I realized I had never created content about this and decided to elaborate on this topic.

## What is ref and val?

Reference and value are very old concepts. I remember Visual Basic had two keywords that let you choose whether the result would be `ByVal` or `ByRef`:

```vb
Public Sub ChangeFieldValue(ByVal cls As Class1)
        cls.Field = 500
End Sub

Public Sub ChangeFieldReference(ByRef cls As Class1)
  cls.Field = 500
End Sub
```

The idea is quite simple:

-   **References** point to the original object like a pointer, so changes to any variable holding that pointer will alter the original object too
-   **Values** do not alter the original object because the variable's value is a clone of the original value, not a pointer

But how does this work in JavaScript?

## In JavaScript

In JavaScript we call these **Reference Type** when it's a reference or **Value Type** for values. In short, everything that is a primitive type in JS is passed **by value**:

-   Numbers
-   Strings
-   Booleans

Whenever you have one of these three types, you'll have a pass by value, meaning they'll be cloned when you pass the variable from one place to another, for example:

```js
let original = 10

function vezesDois (num) {
  num *= 2
  return num
}

const mutado = vezesDois(original)

console.log(mutado) // 20
console.log(original) // 10
```

Notice that, even though we modified the variable value and reassigned it with the value `num`, the `original` value remained `10`, because _`num` is a copy of `original`._

What about references? This concept is a bit different.

## References

Everything that is not a primitive in JS is treated as an _object_, meaning lots of things in JS are objects:

-   Objects (obviously)
-   Functions
-   Arrays
-   null
-   RegExp
-   Classes
-   ...

When you create an object in JS literally or through a constructor, you're creating a _pointer_ to something called a _hidden class_ (I have an [article just about this](https://dev.to/_staticvoid/node-js-por-baixo-dos-panos-5-hidden-classes-e-alocacoes-de-variaveis-4bj), there are actually 10 of them). A hidden class is a value, the object you created points to that value, but we won't go into details here.

What's important to know is that whenever you have an object, when we pass the object to another variable or to another function, it's the pointer that gets passed, not the value itself. And this is **extremely important** because any change to the pointer will alter the original object.

> [!TIP] 🤔
> **Did you know?**
> This is one reason we can use `const x = []` and then modify the array even though it's constant, because we're modifying the reference, not the pointer. But if we try to assign `x = []`, it's not possible because `[]` is another object and another pointer.

The most famous example of this are array methods like `sort` and `reverse`, which modify the original array (along with `push` and `pop` and many others):

```js
const original = [1, 2, 3, 4, 5]

function foo (arr: any[]) {
  arr.reverse()
}

console.log(original) // [1, 2, 3, 4, 5]
foo(original)
console.log(original) // [5, 4, 3, 2, 1]
```

### Comparison

Another important point is when we talk about comparisons using references. When we're using values, we can do something like this:

```js
const a = 10
const b = 10
console.log(a===b) // true
```

Which is totally valid since `a` and `b` have the same value. But what if we do this:

```js
const a = { nome: 'Lucas' }
const b = { nome: 'Lucas' }
console.log(a===b) // false
```

This confuses a lot of people, so many that I even made a tweet about it:

> ARE YOU READY FOR THIS THREAD? I'll go through point by point all the things written here and explain each one so there's NO DOUBT that JS doesn't do this because of a language flaw. [https://t.co/Spm1Oqflt4](https://t.co/Spm1Oqflt4) — Lucas Santos 🇧🇷🇸🇪 || formacaots.com.br 💎 (@\_StaticVoid) [April 3, 2022](https://twitter.com/_StaticVoid/status/1510709606569414663?ref_src=twsrc%5Etfw)
>
> — ![via Twitter](https://twitter.com/_StaticVoid/status/1510709606569414663?ref_src=twsrc%5Etfw)

But the truth is understanding this problem is quite simple. Remember we talked about pointers? So, whenever you create a new object with `{}` or with a constructor, we'll have a new pointer, imagine it's something like this:

```js
const a = {} // pointer: 0x89ac (example)
const b = {} // pointer: 0x1b3d

console.log(a === b) // 0x89ac === 0x1b3d? false
```

Of course pointers are a bit different from what I showed, but you got the idea. We can't compare objects because the references are different, and we can only know if two objects are equal if both their references are the same:

```js
const a = {} // pointer: 0x89ac (example)
const b = a // pointer: 0x89ac

console.log(a === b) // 0x89ac === 0x89ac? true
```

## Cloning

To get out of this problem and avoid modifying the original variable, there's the concept of **cloning**. This is actually a very interesting topic because it was one of the themes in the [article about new array methods](/array-es13/) here on the blog.

When we clone an object, we're taking all the properties of the original object and putting them into another different pointer, so if we change that object, we won't alter the original variable. The most common way was to do something like this:

```js
const original = [1, 2, 3, 4, 5]

function foo (arr: any[]) {
  const clone = Object.assign([], arr)
  return clone.reverse()
}

console.log(original) // [1, 2, 3, 4, 5]
const clone = foo(original) // [5, 4, 3, 2, 1]
console.log(original) // [1, 2, 3, 4, 5]
```

Notice that now the original array stayed the same. Over time we moved away from using `Object.assign` to using `structuredClone`, which does the same thing but with a twist:

```js
const original = [1, 2, 3, 4, 5]

function foo (arr: any[]) {
  const clone = structuredClone(arr)
  return clone.reverse()
}

console.log(original) // [1, 2, 3, 4, 5]
const clone = foo(original) // [5, 4, 3, 2, 1]
console.log(original) // [1, 2, 3, 4, 5]
```

The twist is that if you have an object with another object inside, using `Object.assign` you're only cloning the outer pointer, because the object itself has a pointer to another object inside it:

```js
const nested = { c: 1 }
const objNested = {
  a: {
    b: nested
  }
}

function modify(obj) {
  obj.a.b.c = 10
}

console.log(objNested.a.b.c) // 1
modify(objNested)
console.log(objNested.a.b.c) // 10
```

And even with the clone, this doesn't work:

```js
const nested = { c: 1 }
const objNested = {
  a: {
    b: nested
  }
}

function modify(obj) {
  const clone = Object.assign({}, obj)
  clone.a.b.c = 10
}

console.log(objNested.a.b.c) // 1
modify(objNested)
console.log(objNested.a.b.c) // 10
```

Because it's as if we were reading this:

```js
const nested = { c: 1 } // pointer 0x1a
const objNested = { // pointer 0x5b
  a: {
    b: nested // objNested.a.b === c -> 0x1a === 0x1a -> true
  }
}

function modify(obj) {
  const clone = Object.assign({}, obj) // clone.a.b is 0x1a
  clone.a.b.c = 10 // we're modifying the pointer of c here
}

console.log(objNested.a.b.c) // 1
modify(objNested)
console.log(objNested.a.b.c) // 10
```

To make it work, we'd have to say `objNested.a.b = Object.assign({}, objNested.a.b.c)`, this is simple when we have one child object, but when we have several, this function becomes complicated. Because of this we can use `structuredClone`.

## Conclusion

I hope this brief article has clarified your understanding of the main differences between references and values in JavaScript. There's much more great content about objects out there, and I myself have already written [an article about prototypes](https://medium.com/trainingcenter/heran%C3%A7a-e-prot%C3%B3tipos-no-javascript-2c1e60e005a2) that will shed light on how JavaScript manages methods and inheritance under the hood.

See you later!
