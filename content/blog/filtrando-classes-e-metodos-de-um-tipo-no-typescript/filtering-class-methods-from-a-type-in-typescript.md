---
title: "Filtering classes and methods from a type in TypeScript"
pubDate: 2024-04-03T11:00:57.000Z
updatedDate: 2026-07-16T17:57:24.000Z
category: "typescript"
tags: ["typescript"]
lang: en
description: "Learn how to create a type in TypeScript that can help you build filtering functionality by removing methods from classes!"
slug: "filtering-class-methods-from-a-type-in-typescript"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

In this short post I want to introduce a problem we always have when dealing with TypeScript: **how can we list all the properties of a class**?

Let's say you want to create a filter function, and this function receives a class and allows you to filter by all properties of that class, naturally a type that can solve the problem is this one:

```ts
function filterBy<T, V extends keyof T>(origin: T, key: V, value: T[V]) {
  //
}
```

But when we call this function we are going to have a problem:

![](./image-18.png)

Notice that this type gives us all possible options, because we are getting all the keys of `Foo`, including the methods.

If we want only the properties, that is, `prop`, `getter` and `setter` to be returned, we can create a mapped type, let's call it `OnlyProps`:

```ts
type OnlyProps<ClassType> = Pick<ClassType, {
    [Key in keyof ClassType]: ClassType[Key] extends Function 
                              ? never 
                              : Key
}[keyof ClassType]>;
```

Let's break down this type, from the inside out:

```ts
{
    [Key in keyof ClassType]: ClassType[Key] extends Function 
                              ? never 
                              : Key
}
```

Here we are creating a mapped object where:

1.  `Key` are all the keys of `ClassType`, which is our original class, this means we are going to return another object (this will be important later)
2.  For each key `Key`, we check if that property `ClassType[Key]` is a function, if it is, we return `never`, that is, we ignore it.
    1.  If not, we return the key name.

In the end, this mapped type should create a type in this format if we used it with `Foo`:

```ts
{
  prop: 'prop',
  method: never,
  readonly getter: 'getter',
  setter: 'setter'
}
```

> Let's call this type `ObjetoMapa`, just so we have a reference in the next steps.

Now, we take the map object (which is an object, remember that), and transform it into a union of keys:

```ts
type ObjetoMapa = {
  prop: 'prop',
  method: never,
  readonly getter: 'getter',
  setter: 'setter'
}

type UnionMapa<T> = ObjetoMapa[keyof T] // "prop" | "getter" | "setter"
```

Essentially, what this step does is transform everything into a union so that `Pick` can work, and notice that we are removing everything that is `never`, that is the secret.

Now we are simply doing:

```ts
type OnlyProps<T> = Pick<T, "prop" | "getter" | "setter">
```

Which will get only those keys from the object. Finally we can modify our function to use this type:

```ts
function filterBy<T, V extends keyof OnlyProps<T>>(origin: T, key: V, value: T[V]) {
  //
}
```

Did you notice the `keyof OnlyProps<T>`? Because we want the union of keys again, essentially we could have done the following which is even simpler:

```ts
type OnlyProps<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];

function filterBy<T, V extends OnlyProps<T>>(origin: T, key: V, value: T[V]) {
  //
}
```

We removed `Pick` from the equation, but using `Pick` makes the type more versatile because we can use it as an object too.
