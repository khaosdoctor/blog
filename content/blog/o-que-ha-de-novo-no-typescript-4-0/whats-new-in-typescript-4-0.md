---
title: What's New in TypeScript 4.0
pubDate: 2020-08-31T20:45:39.000Z
updatedDate: 2026-07-16T16:25:22.000Z
category: technology
tags: ["typescript"]
lang: en
description: Let's dive into the newest TypeScript update! Version 4.0!
slug: whats-new-in-typescript-4-0
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

On August 20, 2020, TypeScript announced its newest version, 4.0! In this article, I've prepared to walk you through the latest changes and features of this release.

Even though it's a **major version**, the changes introduced in this release are not very substantial, and you can rest easy: we don't have any breaking changes :D

## Named tuples

To start, we have the resolution of a relatively old problem in everyone's favorite superset. When we have tuples (elements that are composed of data pairs), we used to have a definition like this:

```typescript
function tupla (...args: [string, number]) {}
```

Note that we don't have any name for either of the parameters that occupy the `string` position or the `number` position. With regard to type inference and checking in general, this makes no difference whatsoever, but it's very useful when we're **documenting our code**.

Because of type checking, the previous function would be translated to something like this:

```typescript
function tupla (args_0: string, args_1: number) {}
```

Which is essentially the same thing, but when we're writing code, our _intellisense_ – which is one of the great advantages of using TypeScript in general – gives us naming that doesn't help anyone, as we can see in the gif below

![](./XLsqvHe-ca302083.gif "Naming like args_0 and args_1")

Now, with version 4.0, we can include names in our tuples so they're named during intellisense:

```typescript
function tupla (...args: [nome: string, idade: number]) {}
```

And then we get a result like the following:

![](./giphy-c98fe1.gif "We can see the naming of each parameter")

It's important to note that: If you're naming any element of a tuple, you **must** name both. Otherwise you'll get an error:

```typescript
type Segment = [first: string, number];
//                             ~~~~~~
// error! Tuple members must all have names or all not have names.
```

## Property inference from constructors

From now on, when we configure TypeScript with the `noImplicitAny` setting, we can use the flow analysis that's done at compile time to determine the types of properties in classes based on the assignments in their constructor.

```typescript
class Test {    
   public x   
   constructor (b: boolean){      
     this.x = 42
     if (b) this.x = 'olá'
   }
}
```

In previous versions, since we're not specifying the type of the property, this would make the compiler assign the type `any`, but since we've checked that we don't want `any` implicitly, then the compiler would give us an error saying we can't have any implicit `any` type.

In the latest version, TypeScript can infer, from the constructor, that `x` is of type `string | number`.

## Short-circuit evaluation with compound operators

Few people know about this JavaScript feature, but many other languages also have what's called a _compound assignment operator_, or compound assignment operators.

What they do is evaluate the expression on the right side and assign the value to the variable on the left side. The most famous are the arithmetic operators:

```javascript
let b += 2
let c /= 3
```

They all work very well and exist for most logical operations. However, according to [the TypeScript team itself](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/#short-circuiting-assignment-operators), there are three notable exceptions to this rule. The logical operators `&&`, `||` and the nullish coalescing operator `??`. In 4.0 we have the addition of three new operators:

```javascript
a ||= b
// which is equivalent to
a || (a = b)
```

We also have the operators `&&=` and `??=`.

## Catch with `unknown`

Since the early days of TypeScript, whenever we had a `catch` clause, the error parameter was always typed as `any`, since there was no way to know what the return type was.

Therefore, TypeScript simply didn't check the types of these parameters, even if `noImplicitAny` was active.

```typescript
try {
  throw 'Alguma coisa'
} catch (err) { // Este 'err' é Any
  console.log(err.foo()) // não vai dar erro
}
```

This was unsafe because we could call any function inside the `catch`. Starting from 4.0, TypeScript will type errors as `unknown`.

The `unknown` type is a type specifically designed to type things we don't know what they are. Therefore they **need** a _type-casting_ before they can be used. It's like data of type `unknown` is a blank sheet of paper and you can paint it any color you want. In this case, `unknown` can be cast to any type.

## Other changes

Beyond language changes, compilation speed with the `--noEmitOnError` flag got faster when used together with the `--incremental` flag. What the latter flag does is give us the ability to compile an application more quickly based on another application that's already been compiled, called **incremental compilation**.

When we used `--incremental` with `--noEmitOnError`, if we compiled a program for the first time and it had an error, that meant it wouldn't emit any output, so there was no `.tsbuildinfo` file for `--incremental` to look at, which made everything very slow.

In version 4.0 this problem was fixed. And, beyond that, now the `--noEmit` flag is allowed together with `--incremental`, which wasn't allowed before because `--incremental` needed the emission of a `.tsbuildinfo` file.

Some other minor changes were made regarding editing and editors in general. You can check out the blog post [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0).

## Conclusion

And that wraps up our update on this fantastic superset! Remember that [we need help translating to Portuguese on the TypeScript website](https://github.com/microsoft/TypeScript-Website/issues/233), please help us translate!

Don't forget to subscribe to the newsletter for more exclusive content and weekly news! Like and share your feedback in the comments!
