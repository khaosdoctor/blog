---
title: '"Should You Be Using Enums in TypeScript?"'
pubDate: 2024-04-17T11:00:42.000Z
updatedDate: 2026-07-16T17:56:58.000Z
category: typescript
tags:
  - typescript
lang: en
description: "\"You've probably heard someone say \\\"Don't use Enums\\\"... But why does nobody like enums in TypeScript? Does that even make sense?\""
slug: should-you-be-using-enums-in-typescript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

One of the most controversial conversations around TypeScript is the use of Enums. In this article I want to show the positive and negative points of an enum, and a personal opinion on what I use and why.

If you've been in the TS community for a while you already know there are two sides just like Java and JavaScript lovers, but if you're just arriving now, let me explain what I'm talking about.

## Enums and TypeScript

In TS you can define enumerators, these enumerators are reflections of a [proposal](https://github.com/rbuckton/proposal-enum) added to TC39 years ago, but actually, TS came before that. When TS was created, they believed there would be no idea of adding an enumerator to the language, and enumerators are indeed useful in most typed languages.

That's why, since the first version, TS has had support for enumerators by default. But what is an enumerator?

I won't explain 100% of what all this is here, but you can find lots of content about it in the [documentation](https://www.typescriptlang.org/docs/handbook/enums.html) or, I also talk a lot about it in my TypeScript training at [Formação TS](https://formacaots.com.br).

Enums are enumerators of constants, when you want to give a name to a list of things, an enum is your way out. They can be computed automatically, like below:

```ts
enum Country {
  Germany, // 0
  Sweden, // 1
  USA // 2
}
```

Here each country will have a number automatically associated, starting from 0. Or constant enumerators like this one:

```ts
enum Country {
  Germany = 'DE',
  Sweden = 'SE',
  USA = 'US',
}
```

Enumerators work like objects at runtime and also as types, so you can pass something like:

```ts
function setCountry (country: Country) {}

setCountry(Country.Germany)
```

And you can also get the keys using `Object.keys(Country)`, for example.

And that's basically the main thing about enums that we'll need to know.

## The enum controversy

There's a growing community of people who don't like using enumerators in code. For various reasons (which we'll discuss here soon), it's not hard to find something on Youtube if you search for "TypeScript Enums".

But what I never liked was that, for me, none of these reasons were strong enough to simply stop using enumerators, but the reasons in favor weren't exactly compelling either, and so?

Since I've always had this doubt, now I'll share with you what both sides of this story are to solve this problem once and for all.

## Arguments against enums

Let's start with the arguments against enumerators.

### It's not something that exists in JavaScript

This is an old argument about why not to use enums: _"JavaScript doesn't come with it out of the box"_.

I understand why, considering that TypeScript is basically JavaScript with steroids, that is, with types. So, in theory, everything that's JavaScript should be TypeScript too.

People tend to lean heavily on this argument:

> If you remove all the types from TypeScript code, what's left has to be pure JavaScript.

And that kind of makes sense, but if we're going to remove the TypeScript code, enums should come out too. Besides, this argument isn't that strong anyway, for a few reasons:

1.  There's a [proposal](https://github.com/rbuckton/proposal-enum) to add this to the language (it's kind of stalled and maybe forgotten, but it's there)
2.  And it's not like it's our responsibility to do this, TS already has a compiler that's precisely meant to remove the parts that aren't JS and make the code work

### Enums generate code at runtime

By default, TS shouldn't generate code at runtime, but there are some things that break this rule like [decorators](/javascript-decorators/) and enums.

This means that the code you see in the end isn't just removing the enum, but each enum generates a JS object.

So, an enum like this:

```ts
enum X {
    a,
    b,
    c
}
```

Would generate this:

```js
var X;
(function (X) {
    X[X["a"] = 0] = "a";
    X[X["b"] = 1] = "b";
    X[X["c"] = 2] = "c";
})(X || (X = {}));
```

One of the arguments for why we should care about what TSC generates in the end is that Babel and other compilers use plugins and this can confuse them, but that's actually not really an argument, because if those plugins don't account for a base feature of a language, they're not good plugins.

### Enum objects don't behave the way we want

When you have the enum from the paragraph above:

```ts
enum X {
    a,
    b,
    c
}
```

The final object will have an object syntax with double values:

```js
var X;
(function (X) {
    X[X["a"] = 0] = "a";
    X[X["b"] = 1] = "b";
    X[X["c"] = 2] = "c";
})(X || (X = {}));
```

This means that `a` will have the value of `0`, but also `X[0]` will have the value of `a`, and this is true if you do a `console.log(Object.entries(X))`:

```
[["0", "a"], ["1", "b"], ["2", "c"], ["a", 0], ["b", 1], ["c", 2]]
```

This is something that bothers people, because it's not what we're expecting from an object.

But it was done this way so we can access `X.a` and get the value of `a` (which is 0), but also access by index and get the key, so `X[0]` should be `a`.

However, this **doesn't happen** if you use _string enums_. So if we have an enum of HTTP Methods:

```ts
enum HTTPMethods {
	GET = 'GET,
	POST = 'POST'
}
```

The final object would be:

```ts
"use strict";
var HTTPMethods;
(function (HTTPMethods) {
    HTTPMethods["GET"] = "GET";
    HTTPMethods["POST"] = "POST";
})(HTTPMethods || (HTTPMethods = {}));
```

Which only assigns the string to the value and not to the index. So in our `Object.entries` we wouldn't see the keys `[0, 1, 2]` because they don't exist.

### Enums don't accept values that aren't from the enum

When you do something like:

```ts
enum LogLevel {
	DEBUG = 'DEBUG', 
	WARNING = 'WARNING',
	ERROR = 'ERROR'
}

function log (msg: string, level: LogLevel) {}

log('hey', 'DEBUG')
```

You get an error, because `level` can't be a member that doesn't exist in the enum, which apparently is expected by people, since both have the same value.

This has something very interesting about it, because TypeScript uses a structural type system so it shouldn't care about the name, only the value, but enums kind of break this rule, because the types become nominal, so creating another enumerator `LogLevel2` and passing the value to the function would also error

```ts
enum LogLevel2 {
	DEBUG = 'DEBUG', 
	WARNING = 'WARNING',
	ERROR = 'ERROR'
}

function log (msg: string, level: LogLevel) {}

log('hey', LogLevel2.DEBUG) // Error
```

Because `LogLevel` and `LogLevel2` aren't the same thing.

I understand this point, especially coming from an open language like JavaScript. But also, what's the point of enumerating if you can just pass anything?

To work around this, people use POJOs (_Plain Old JavaScript Objects_) to work around enums like this:

```ts
const LogLevel = {
	DEBUG: 'DEBUG', 
	WARNING: 'WARNING',
	ERROR: 'ERROR'
} as const
typeof LogLevel[keyof typeof LogLevel]

function log (msg: string, level: LogLevel) {}

log('hey', 'DEBUG')
```

Which allows both using the string `'DEBUG'` while still keeping intellisense and also using the type directly via `LogLevel.DEBUG`, but you need to write double the text.

### Computed enums can have false if statements

If you do:

```ts
enum A {
  User,
  Admin
}

if (A.User) {
  // this won't execute
}
```

Because `User` is 0, so avoid using computed enums.

## Arguments for enums

Now let's look at the arguments for enums.

### Faster Refactoring

If you need to replace the string `'POST'` in the enum we defined earlier:

```ts
enum HTTPMethods {
	GET = 'GET,
	POST = 'POST'
}
```

We can just change the enum value to `'post'` and that's it, nothing else needs to be done since the value will be used by all members that use this enum.

If we had a _union type_ like `GET | POST` and then decided to change it to `get | post`, all the places would now have a type error.

I've personally heard things like:

> This argument about code maintenance for enums isn't very strong. When we add a new member to an enum or union, it rarely changes after creation. If we use unions, it's true that we might have to spend some time updating in several places, but it's not a big problem because it happens rarely. Even when it does happen, type errors can show us which updates to make.

Which isn't really true, because if you're working with large projects, like we do here at Klarna, this isn't so "rare" and what's even less true is this part:

> _"we might have to spend some time updating them in several places, but it's not a big problem because it happens rarely"_

Because most of these people aren't making a change across 500 files of 1500 lines each. When a project is small, even medium, this is ok. But when you move into the realm of giant projects, all this stops making sense and enums can indeed save your refactoring.

### Strict Strings and Consistency

You can argue that being more strict about the parameters you pass is better than leaving them open. Since TypeScript aims to be type safe and bring safety to your code.

You can make your code stricter by using _string enums_, which will force you to use this enum to pass the value to an object, that way, you can't use plain strings.

And there you have another argument in favor, **consistency**. When you use direct strings in code, like we did with `'DEBUG'`, you start thinking _"Where did this value come from? What is this?"_ which is what we call **magic strings**.

This is terrible for maintenance, enums help keep your code consistent, strict and safe.

## So, what's the verdict?

The truth is there's no verdict. I'm personally on the team that uses enums, because they're more expressive than objects, and they're more semantic (for the same reason we use `<main>` and not `<div>` in HTML).

But I acknowledge all these issues with enumerators, so to help I'll leave here some tips on how to work around enums if you don't want to use them, but the main tip is:

==BE CONSISTENT==

If you're using enums, don't mix with objects, if you're using only objects, don't mix with enums. Know when to use an enum or not instead of using enums for everything.

So if you don't want to use enums at all, instead of having an enum, you can use a union type or a JavaScript object.

```ts
enum LogLevel {
	DEBUG = 'DEBUG', 
	WARNING = 'WARNING',
	ERROR = 'ERROR'
}
```

You could do this:

```ts
const LogLevel = {
	DEBUG: 'DEBUG', 
	WARNING: 'WARNING',
	ERROR: 'ERROR'
} as const

// Keys
type LogLevel = keyof typeof LogLevel
// DEBUG | WARNING | ERROR

// Values
type LogLevelValue = typeof LogLevel[keyof typeof LogLevel]
// 'DEBUG' | 'WARNING' | 'ERROR'
```

That way, you have both the object and the type for this value, the keys would work as expected, you can pass strings to a value and everything else.

The downside is writing more and having to repeat yourself in the LogLevel object and the type, so it's double the writing.

## Conclusions

There are some important conclusions from this, the first is:

### Don't use computed enums

Avoid using computed numeric enums, they're prone to various errors (as we've seen), and you don't control the order of things.

Instead, use enums defined as:

```ts
enum Country {
  Germany = 'DE',
  Sweden = 'SE',
  USA = 'US',
}
```

They can be numbers (but avoid it), but always defined. Never do:

```ts
enum Country {
  Germany,
  Sweden,
  USA
}
```

### Always try to use string enums

Following from above, always try to use string enums to avoid the error of the `false` statement like I showed before with the `if` case that would always be 0.

### Use const enums whenever possible

TypeScript has another type (which is actually well explained [in this article](https://robinpokorny.com/blog/typescript-enums-i-want-to-actually-use/) by a colleague here at Klarna), which are **const enums**.

```ts
const enum Country {
  Germany = 'DE',
  Sweden = 'SE',
  USA = 'US',
}
```

Const enums **don't** generate code at runtime. So, adding:

```ts
const enum Country {
  Germany = 'DE',
  Sweden = 'SE',
  USA = 'US',
}
```

Won't generate code at runtime, but you also won't be able to use the enum as an object, which means you won't be able to use them to extract keys or values, because they really don't exist in production code.

## What I use

I tend to do a ranking:

1.  I always try to use _const string enums_, as we just saw above
2.  If I'm going to use the keys, whether listing or doing something with a list of keys and values from the Enum, I switch _const enums_ for _string enums_
3.  If I really need to pass a string to a function, and converting or mapping the string to the enum is very complicated, I use POJOs (but I avoid it as much as possible)

And you? What are you using? Comment on this article with people and tell me on my [Twitter](https://twitter.lsantos.dev) what you think about it!
