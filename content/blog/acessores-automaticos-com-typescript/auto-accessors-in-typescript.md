---
title: Do you already know about auto-accessors in TypeScript?
pubDate: 2024-03-20T11:00:23.000Z
updatedDate: 2026-07-16T17:57:47.000Z
category: technology
tags: ["typescript"]
lang: en
description: Have you heard about auto-accessors? Do you know what this feature is? Then let's understand better how it works!
seoTitle: Auto-accessors in TypeScript
seoDescription: Understand how one of the most interesting TypeScript features that doesn't get used much works. Auto-accessors!
slug: auto-accessors-in-typescript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

TypeScript has a bunch of really interesting features that few people know about, one of them is the use of [auto-accessors in classes](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/#auto-accessors-in-classes).

Around since TypeScript 4.9, it's also a feature described in the [original decorators proposal](https://github.com/tc39/proposal-decorators).[^n1]

Essentially, this syntax works like this: when we have an accessor, we usually have a `get` method that returns an internal variable of a class, for example:

```ts
class Pessoa {
    #__nome: string;

    get name() {
        return this.#__nome;
    }
    set name(val: string) {
        this.#__nome = val;
    }

    constructor(nome: string) {
        this.nome = nome;
    }
}
```

Notice how we have not one, but 7 lines just to create an accessor that sets and gets the internal variable `#__nome`? It would be much better if we could do all of that at once, and that's exactly why auto-accessors exist. Everything I wrote above can become this:

```ts
class Person {
    accessor nome: string;

    constructor(nome: string) {
        this.nome = nome;
    }
}
```

Under the hood, what auto-accessors do is exactly what we did in the first snippet, they expand `nome` into a private internal class variable, and an external variable accessible only through a getter and a setter.

In general, this feature isn't something very related to logic, but rather to quality of life, especially when we're creating decorators that need several getters and setters.

[^n1]: We already talked about decorators [here](/javascript-decorators/).
