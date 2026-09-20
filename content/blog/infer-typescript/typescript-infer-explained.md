---
title: What is Infer in TypeScript and What Does It Do?
pubDate: 2022-04-18T14:00:00.000Z
updatedDate: 2026-07-16T16:09:42.000Z
category: technology
tags: ["typescript"]
lang: en
description: If you've written TypeScript code, you may not have seen the famous infer instruction yet. But believe me, one day it will appear and you'll know what it is!
seoDescription: If you've written TypeScript code, you may not have seen the famous infer instruction yet. But one day it will appear and you'll know what it is!
slug: typescript-infer-explained
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

If you've already used TypeScript, you've probably heard of the `infer` keyword. It's not very common in everyday coding, but most advanced libraries will use `infer` at some point for some type of operation.

To fully understand `infer`, we need to have a notion of how TypeScript does type assertion and also the hierarchy of those types. I won't go into detail about this information here, but you can find plenty of content about it in the TS documentation itself.

The `infer` keyword complements what we call _conditional typing_, or conditional types, which is when we have a type inference followed by a condition, for example:

```typescript
type NonNullable<T> = T extends null | undefined ? never : T
```

In the previous example, we're taking a type and checking if it's an extension of `null` or `undefined`, that is, types that don't resolve to `true`, and then we're making a **type condition** to say: "If the type is one of these you return `never`, otherwise you return the type itself".

The `infer` keyword allows us to go a bit further than what we're used to in these models. The idea is that we can define a variable within our type inference that can be used or returned, it's as if we could do a `const tipo = <inferencia>`.

For example, let's look at the native TS utility called `ReturnType`, which takes a function as a parameter and returns the type of its return value:

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any
```

What's happening here is a conditional inference, since `infer` **cannot be used outside conditionals**. First we check if the type passed extends a function signature, if yes, we assign the return of that function to a variable we call `R`, and then return it.

Another example is extracting the return of a promise, as I mentioned here [in this thread](https://twitter.com/_StaticVoid/status/1507444433486233609), if we think about how we can create this type, first we have to check if the type passed is an extension of the `Promise<T>` type, and then infer `T` to return it, otherwise we return `never`:

```typescript
type Unpromise<P> = P extends Promise<infer T> ? T : never
```

## Other Use Cases

We can use `infer` in several cases, the most common ones are:

-   Get the first parameter of a function:

```typescript
type FirstArgument<T> = T extends (first: infer F, ...args: any[]) => any ? F : never
```

-   Get the type of an array

```typescript
type ArrayType<T> = T extends (infer A)[] ? A : T
```

-   Recursively get the type of a function until finding its final type

```typescript
type ExtractType<T> = T extends Promise<infer R>
  ? R
  : T extends (...args: any[]) => any
    	? ExtractType<ReturnType<T>>
			: T
```
