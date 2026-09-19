---
title: Using Assertion Functions in TypeScript
pubDate: 2024-06-14T11:00:51.000Z
updatedDate: 2026-07-16T17:56:05.000Z
category: typescript
tags:
  - typescript
  - nodejs
  - deno
lang: en
description: Learn how to use one of the most important and yet least known features of TypeScript! Assertion functions
slug: using-assertion-functions-in-typescript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Recently I saw some folks posting a "new thing":

![](https://www.youtube.com/watch?v=M-VU0fLjIUU)

On his channel, Primeagen showed how to do what he called "negative space programming". I'm glad this subject showed up on big channels, but this technique isn't new, it's been around for many, many years, and TypeScript itself has a function that does exactly this, only with types.[^n1]

Assertion functions are part of a set called **Type Guards**. Together with [enums](/enums-no-typescript/), these two functions are some of the few that take TypeScript out of the compilation world and into the runtime world, meaning the code you write there is, in fact, executed at runtime.

## Type Guards and branded types

There are two categories of functions. We separate them to make it simpler to understand, but essentially they are the same thing with different uses.

First we have _type guards_.

```ts
function isNumber (n: unknown): n is number {
  return typeof n === 'number'
}
```

These functions always return a boolean saying whether the condition passed or not. In the case above, we're checking whether a value `n` is a number. But what's the difference between this and a normal function?

That's where we get into type inference. Both assertion functions and type guards can change the types TypeScript will infer from that point on, and they work very well with **branded types**. But what are branded types?

### Branded types (very quickly)

Let's open a small parenthesis here. Branded types are types that represent specific variations of a broader type. Got it? Confusing, right, let's go with examples.

> [!NOTE] 🤚
> I'm going to write other articles just to explain what branded types are, but let's go with the simple explanation for now.

Imagine we have variables that are currencies in cents, we can have euros, dollars and reais. But even though they are all strings, they can't represent the same thing, because they are different currencies.

```ts
const eur: string = '1299'
const usd: string = '1099'
const brl: string = '90000'
```

If we create a conversion function from euro to dollar, we expect the result to be in dollars, but the input needs to be in euros. How do we do that? Let's create a type that is a variation of a string, but with a hidden property:

```ts
type EUR = string & { _brand: 'EUR' }
type USD = string & { _brand: 'USD' }
type BRL = string & { _brand: 'BRL' }

const eur: EUR = '1299'
const usd: USD = '1099'
const brl: BRL = '90000'
```

Now in a conversion function, we can expect only one type:

```ts
function eurToUsd (in: EUR): USD {
   return conversao(in) as USD
 }
```

See what I did there? Using `as` as an explicit code conversion is one of the only ways you can create a branded type, besides instantiating the variable directly. The other way is through creation functions like this one:

```ts
function makeEUR (v: string): EUR {
  return v as EUR
}
```

The other way to validate and guarantee a type is through type guards, as I show in the talk I linked earlier:

![](./image.png)

Of course, monetary operations are a simple case. With UUIDs, for example, this can be a case that will prevent a lot of bugs, since you can type your parameters to accept only UUIDs and that will guarantee that no normal string comes back to you.

### Type Guards

That said, type guards are a way to guarantee that an entire scope will have the type defined by the type guard. For example:

```ts
function isStringArray (a: unknown): a is string[] {
  return Array.isArray(a) && typeof a[0] === 'string'
}

function foo (x: string[] | string) {
  const v = x // v é string[] | string
  if (isStringArray(v)) {
    // v é string[] aqui dentro
  }
  
  // v é agora string já que testamos se ele é um array e ele falhou
}
```

If you got the idea of branded types, you know where I'm going. Having type guards means you can change the type of a variable for an entire scope, in a technique called **type narrowing**, meaning we're turning a broader type into a narrower type. Just like we did with `string[] | string`, turning it into just `string[]` or `string`.

And that means we can also turn normal types into branded types, or any other type we want, using a validation **that exists at runtime**. That's the biggest difference. All validations through type guards will be executed during the application's runtime. So you have validation not only at compile time but also at execution time.

Besides type guards, we have another variation that is just as important. Assertion functions.

## Assertion functions

Assertion functions are exactly the kind of technique he's using in the clip I left at the beginning of the article. In plain JavaScript, this translates into using `assert` (which in his case he imported from the `node:console` module, but it exists in a separate module, `node:assert`, which I talked about in the [article about the Node Test Runner](/comecando-com-o-node-js-test-runner/))

The idea is that, instead of returning a boolean, we don't return anything, we stop the program's execution and throw an exception because this is an unexpected value. It's a variation of type guards, but stricter.

```ts
function assertIsNumber (x: unknown): asserts x is number {
  if (!typeof x === 'number') throw new Error('NaN')
}
```

On top of that, assertion functions also have a different syntax, which is why we end up separating the two, that way we don't mix one thing with the other. But the uses are the same. For example, let's replace our previous function with an assertion function.

```ts
function assertStringArray (a: unknown): asserts a is string[] {
  if (!Array.isArray(a) && typeof a[0] !== 'string') {
    throw new Error ('Not a string array')
  }
}

function foo (x: string[] | string) {
  const v = x // v é string[] | string
  assertStringArray(v)
  // v é string[] a partir daqui
}
```

As you can see, one of the problems with assertion functions is that they are not inclusive, meaning if you have a union type between two types, as soon as you use an assertion function, it will assert only one of them, the other will be ignored, and anything below the assertion function will be inferred to the type you put there.

Assertion functions are heavily used in places where we have optional parameters, or optional values that are used in specific flows. Especially when we're dealing with objects.

## Conclusion

Assertion functions are an excellent way to guarantee not only your code's typing at compile time, but also to guarantee that, during execution, the code will behave the same way you predicted. After all, **computing is deterministic** and we need to know what we receive from and send to our programs.

To round out this series I'll talk more about branded types in another article, so stick around!

[^n1]: I [even talked about them a few years ago](https://speakerdeck.com/khaosdoctor/typescript-tips-that-could-save-your-life?slide=30).
