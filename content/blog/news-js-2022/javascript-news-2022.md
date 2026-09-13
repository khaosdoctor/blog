---
title: "JavaScript News in 2022"
pubDate: 2022-07-28T07:00:00.000Z
updatedDate: 2026-07-16T16:07:56.000Z
category: "javascript"
tags: ["javascript", "ecmascript", "nodejs", "development"]
lang: en
description: "JavaScript is always evolving! Join me in this article where I show you what's new in the world's most loved language in 2022."
seoDescription: "JavaScript is always evolving! Join me in this article where I show you what's new in the world's most loved language in 2022."
slug: "javascript-news-2022"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Every month we have various news in our favorite languages, and JavaScript is no different!

In this video I explain a bit more about the process of releasing new JavaScript features. If you haven't watched it yet, I strongly recommend it to better understand how everything works!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

That said, the 2022 version of ECMAScript, the specification behind JS, is incredible and I will explore with you all the main news!

## The `.at()` method on all indexables

One of the simplest yet coolest pieces of news is the addition of the `.at()` method on arrays and any other native indexable, like strings.

What it does is get the item at the requested position of the array, for example:

```js
const carrinho = ['banana', 'maçã', 'pera']
carrinho.at(0) // banana
carrinho.at(-1) // pera

// Out of bounds
carrinho.at(100) // undefined
```

And this works for any indexable, so if we have a string:

```js
const frase = 'O rato roeu a roupa do rei de Roma'

frase.at(0) // O
frase.at(-1) // async
```

## Capture indices in RegExp

Now, besides bringing the match from your Regex, the RegExp constructor also brings a list of indices of where that match started and ended, for example:

```js
const input = 'abcd'
const match = /b(c)/.exec(input)
const indices = match.indices

indices.length // 2
matches.length // 2
// O número de indices é igual ao numero de matches

indices[0] // [1,3] inicio/fim do primeiro match "b"
input.slice(indices[0][0], indices[0][1
]) // mesma coisa que match[0]
```

## Object.hasOwn

A simpler variation of `Object.hasOwnProperty` that returns true for all properties that are directly owned by an object (without being inherited):

```js
const livros = {}
livros.paginas = 123

Object.hasOwn(livros, 'paginas') // true
Object.hasOwn(livros, 'toString') // false

// O 'in' verifica todas as propriedades
'paginas' in livros // true
'toString' in livros // true
```

## Error causes with `Error.cause`

One of the main changes and one that I think will be most useful. This new property of the error class shows the cause of the thrown error.

```js
const erro = new Error('Um erro', { cause: 'A causa desse erro' })

erro instanceof Error // true
erro.cause // 'A causa desse erro'
```

The main use case is to avoid passing the error object directly:

```js
try {
  naoFunciona();
} catch (err) {
  throw new Error('naoFunciona failed!', { cause: err });
}
```

## Top-level await

This has been available in Node.js for a while, but since we have [ESModules](/os-ecmascript-modules-estao-aqui/) it's already possible to perform top-level await, that is, an `await` outside of an `async function`:

```js
// index.mjs

// falha na implementação antiga
await Promise.resolve('🍎');
// → SyntaxError: await is only valid in async function

// correção que a gente costuma fazer com IIFE
(async function() {
  await Promise.resolve('🍎');
  // → 🎉
}());

// nova implementação de top-level await
await Promise.resolve('🍎') // '🍎'
```

## Class field declarations

We **FINALLY** now have class property declarations outside the constructor, that is, we can declare and assign a value to a class property without needing a constructor with `this.prop = prop`.

This was already quite common in TypeScript, but now it's coming natively to JavaScript:

```js
class Classe {
    /*
      ao invés de:
      constructor() { this.publicID = 42; }
    */
    publicID = 42; // public field

    /*
      ao invés de:
      static get staticPublicField() { return -1 }
    */
    static campoEstatico = -1;

    // propriedades privadas estáticas
    static #campoPrivadoEstatico = 'private';

    //métodos privados
    #privateMethod() {}

    // declarações estáticas com static declaration blocks
    static {
      // Executado quando a classe é criada
    }
}
```

## Checking fields through class reflection

This is a complicated use case, but when we tried to check a property of a class through a static initialization block, we would get an error saying the class was not initialized or that the property doesn't exist, this has been fixed:

```js
class C {
  #prop;

  #metodo() {}

  get #getter() {}

  static isC(obj) {
    // usando 'in'
    return #prop in obj && #metodo in obj && #getter in obj;
  }
}
```
