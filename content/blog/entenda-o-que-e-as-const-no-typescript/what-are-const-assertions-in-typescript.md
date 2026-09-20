---
title: What are 'const assertions' in TypeScript? The famous 'as const'
pubDate: 2024-04-24T11:00:59.000Z
updatedDate: 2026-07-16T17:56:43.000Z
category: technology
tags: ["typescript"]
lang: en
description: What are const assertions? Do you know the difference between the weird 'const as const' and Object.freeze?
seoTitle: What does 'as const' mean in TypeScript?
slug: what-are-const-assertions-in-typescript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

This article complements my video on the same topic! Watch it here:

![](https://www.youtube.com/watch?v=CTGqhST9Fjc)

If you're coding in TypeScript, you've probably come across a very strange type, the famous `const as const`, something like this:

```ts
const foo = {
  bar: 'string'
} as const
```

In fact, we even talked about it when we discussed [enums](/enums-no-typescript/) here on the blog. You might think that because it has an `as`, it must be some kind of type casting, that is, we're swapping one type for another and forcing TS to accept it, which is bad practice. But it's not!

This kind of technique is called [**const assertions**](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions) and, as the name says, it's an assertion, that is, we're giving more information about a type to TypeScript. But what are we telling it?

## Objects and arrays

This kind of assertion is generally used with objects and arrays, and it's also the simplest way to understand the concept. But imagine you have this object:

```ts
const args = [1, 2]
const sum = (a, b) => a+b
```

All TS knows is that `args` is an array of numbers so it will type it as `number[]`, which is acceptable because you could, for example, do an `array.push(0)` and it would accept it without problems, actually, in most cases that's what happens. But there's one case where it doesn't.

There are several functions in JavaScript that require an exact number of arguments, an example is the `Math.atan2` function which takes exactly 2 parameters. Another example is our sum function. So this code doesn't work:

```ts
const args = [1, 2]
const sum = (a, b) => a+b
sum(...args)
```

Because TS can't infer how many parameters args has, or the total number of items in the array, precisely because we can add, remove, or modify the array however we want.

If we want to say that this array is immutable, a constant, we have to use a **const assertion**

```ts
const args = [1, 2] as const
const sum = (a, b) => a+b
sum(...args)
```

In this case, `args` is now typed as `readonly [1, 2]`, that is, we can't modify the array, and it has exactly two elements, 1 and 2. Therefore we can pass it to the function because we tell TS that it will always have two elements.

The same goes for objects, if we pass any object like this:

```ts
const obj = {
  foo: 1,
  bar: 'formacaots.com.br'
}
```

TypeScript will simply type it as an object like this:

```ts
const obj: {
    foo: number;
    bar: string;
}
```

And we can add or remove keys, in addition to being able to pass any string and any number, or even change the type of the object, but if we use

```ts
const obj = {
  foo: 1,
  bar: 'formacaots.com.br'
} as const
```

Our typing changes to:

```ts
const obj: {
    readonly foo: 1;
    readonly bar: "formacaots.com.br";
}
```

See that now it's not just immutable, but also has literal types as keys. And you might be wondering: _"What about Object.freeze? Doesn't it do the same thing? Isn't it even safer because it's at runtime?"_

There's a fundamental difference between `Object.freeze` and `as const`, while `Object.freeze` will indeed make the object immutable at runtime, it only does this for the first level of keys, so nested and composite keys like:

```ts
const foo = {
  bar: {
    baz: 1
  }
}
```

Don't work, if you use `Object.freeze(foo)`, that ensures that `bar` can't be changed to another object, but `foo.bar.baz` can be changed normally. With `as const`, the entire object would be immutable.

## Conclusion

**const assertions** do three things:

-   With primitive types (string, number, boolean, etc), it removes the possibility of _type widening_, that is, a `'foo'` becoming `string`.
-   Object properties become `readonly`
-   Arrays become immutable tuples (`readonly`)

You can even use `as const` in function returns to make the inferred type of the function always be inferred as the most static type possible:

```ts
function foo () {
  return [1, 2] as const // retorna uma tupla
}
```
