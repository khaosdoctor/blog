---
title: "Type-level programming - #TypeScriptWeek day 5"
pubDate: 2023-04-07T11:00:08.000Z
updatedDate: 2026-07-16T16:01:39.000Z
category: "typescript"
tags: ["typescript"]
series: typescript-week
seriesOrder: 5
lang: en
description: "You've heard of object-oriented programming, but what about type-oriented? A development style that can help you write much safer code with TypeScript"
seoTitle: "Type-level programming - Type orientation with TypeScript"
slug: "type-level-programming-semanats-day-5"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

We're reaching the end of our week of TypeScript content, and most of what we've seen here so far relates to how we combine our types with our code—in other words, how we can add more safety when running our application in production.

> But what if we used the TS type system on its own?

There are [various projects](https://www.learningtypescript.com/articles/extreme-explorations-of-typescripts-type-system) where we push TS to extreme limits and create all sorts of things. There was the RPG I mentioned on day one, but also someone who implemented [TypeScript in TypeScript](https://github.com/ronami/HypeScript) or even an emulation of a [4-bit virtual machine](https://gist.github.com/acutmore/9d2ce837f019608f26ff54e0b1c23d6e) using only types. This is what we call **type-level programming**, or as I've seen it frequently on the internet, **Type-Level Programming**.

This was a concept I first came across in an [excellent guide by Gabriel Vergnaud](https://type-level-typescript.com) that essentially means using TS types to program instead of using a traditional programming language. As I mentioned, TS is Turing-complete, so we can write any kind of program with any complexity using it.

The idea behind this concept is that we need to separate type-level programming from what's called **value-level programming**, which is the kind of programming we're more used to, with if statements, for loops, and so on. All these structures are present in TypeScript too, but in an implicit way. For example, we can write an if like this:

![](./image-36.png)

Actually, this is the implementation of the `if` keyword itself. But we can make a more generic if using what's called **conditional types**. For example, if we want to ensure that when a certain parameter is of one type, we return another type in a function:

![](./image-37.png)

## Beyond the type system

But beyond that, we can build complete systems using only these types, especially when they relate to logic. This means we can code using types to implement logical gates like **and**, **or**, **xor**, and **not**, and with them we can make other more complex structures.

![](./image-39.png)

To implement an XOR gate, we need another type that checks equality between two types, since XOR only returns true if both compared types are different from each other:

![](./image-40.png)

Since we're comparing only two boolean values, we can return just the right side of the expression. So to create an XOR, we can combine the other types and return true only if the two types are not equal:

![](./image-43.png)

Interesting? Well, this is a code snippet from a library called [expect-types](https://github.com/mmkal/expect-type/blob/main/src/index.ts#LL5-L5C80), which is specifically designed to test types following the same pattern we use for testing regular code.

![](./image-45.png)

As we saw earlier in the chapter on type declarations, it's important to test not just the code but also its types, especially to ensure that a function responds correctly and that we test all possible cases. This [article](https://developers.mews.com/why-we-should-all-be-testing-our-typescript-types/) shows the main advantages of testing types.

This is the power types can offer, the ability to build any kind of application. We just need a bit of creativity.

Also notice that most of our calls chain functions together, and that's how most type-level programming operations typically work.

## Going further

As an example, we can draw inspiration from an [amazing article](https://itnext.io/implementing-arithmetic-within-typescripts-type-system-a1ef140a6f6f) by Ryan Dabler, which shows how to implement arithmetic in TypeScript. The approach can vary, but it's quite creative.

First, we need to know how to work with list types, like arrays and tuples. This is how we'll extract variable numbers from our types. To do this, we'll use a neat property of TypeScript that lets us directly access the values of an object's property. For example, we can get the `length` property of an array:

![](./image-46.png)

What we're doing here is using the `infer` keyword to infer the literal type of a value. In this case, we're accessing the length property of an array, which is a number. Now we can create and modify literal values as needed.

Next, we'll create a recursive type, setting up a recursive loop that builds an array based on the size we pass:

![](./image-47.png)

What happens is that if we write `type valores: BuildTuple<3>`, we get the type `[any, any, any]`. That is, a tuple with 3 elements. This type could be described as the following function:

![](./image-48.png)

From there, we can build basic types, like addition, which takes two values and returns a new tuple with the combined size of both:

![](./image-49.png)

Essentially, this operation concatenates two arrays and returns their combined size. To put it in perspective, the function would look like this:

![](./image-50.png)

As I said, we need to be creative. Since TypeScript can't directly perform arithmetic or any direct operations, we need to find a way to add this functionality. Unfortunately, due to TS limitations, we can't work with negative numbers, which means our subtraction operation would look like this:

![](./image-51.png)

Basically, we return the value of the first tuple, which means the first number must be larger than the second.

## In the real world

These projects are interesting explorations of the type system's limits, but that doesn't mean we'll use these structures in real applications, at least not often.

However, the concepts we've seen here are extremely useful to have in your toolbelt. Things like:

- Infer
- Conditional types
- Recursive loops
- Generics
- Tuples and arrays

They're extremely useful for creating advanced usage patterns with TypeScript. If you're interested in learning more about them, stay tuned. More is coming soon!

## Practice time

Since this is our last article of the TypeScript week, I decided to make it shorter so you can enjoy your Friday!

Since there's no exercise in this edition, let's go over the last one we had!

To declare a new feature in a global function, we can use the `declare` keyword we saw on day two. If we declare a function with the same name and a different signature, we're creating a type augmentation for a global method, like this:

![](./image-52.png)

Now that we have our brands and functions defined, we can test our call like this:

![](./image-55.png)

## It's not over yet

First, thank you for sticking with me, and I hope you've enjoyed the content! Don't forget to leave feedback in the form below! But it would be a shame if we stopped here, wouldn't it?

That's why, if you help me share and promote this week of content (mention me on [twitter](https://twitter.lsantos.dev) or on [social media](http://lsantos.dev)), I'll write a sixth article focusing on TypeScript tools and ecosystem that drops Monday (we deserve to enjoy the weekend too!). Help me spread the word!

> Don't forget to leave your feedback about #TypeScriptWeek [on this form](https://forms.gle/6hAqjVmah9uyR4by8)!
