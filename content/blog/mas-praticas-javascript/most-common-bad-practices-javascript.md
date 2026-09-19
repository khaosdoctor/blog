---
title: The most common bad practices in JavaScript
pubDate: 2022-02-01T13:00:00.000Z
updatedDate: 2026-07-16T16:10:54.000Z
category: javascript
tags:
  - javascript
  - architecture
lang: en
description: Come learn some of the practices considered "bad" in JavaScript and how you can work around them to make your code better!
slug: most-common-bad-practices-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

![](https://www.youtube.com/watch?v=QPSju6SY570)

When we think about JavaScript, the general idea is usually of a language that is extremely simple and, for some reason, seems to be everywhere you look, without exception.

But while JavaScript is indeed simple when you already have some development experience, this is not always true, especially if you are just starting your journey in the wonderful world of programming.

In this article I am going to bring some of the practices considered "obsolete" or "bad" when we are writing code in JavaScript. But it is also important to note that, even though these practices are considered bad practices, it does not mean there is no legitimate use case for some of them.

I say this because it is important that we note that things are not binary in any subject, instead of being black and white, we are talking about something that would be shades of gray. Everything we do in software development has a reason, and there are cases where we will indeed need to use some of these techniques, whether for performance reasons, compatibility reasons, and so on.

So here is the tip, you will probably see something like this, or even need to do something like this, at some point in your life. Whether to support an old product, whether to improve performance, whatever it is.

## Using `var` in 2022

I am starting with the first and most absurd of all things you will see in JavaScript code, `var`.

The only possible explanation for someone still using this manually is for forced compatibility with some kind of runtime that probably stopped being used at least six years ago.

**"But what is the problem with var? 😱"**

When we talk about variable allocation in JavaScript (or in any other language for that matter) with `var`, there are two types of scope, as I explained in this [article here](https://imasters.com.br/desenvolvimento/escopos-em-javascript), the **global** scope and the **function** scope.

The global scope is accessible not only for what is inside the function, but also for everything that is outside it, and function scope, as the name says, is only accessible inside the function where the variable is declared.

This alone is a big problem because you can make mistakes very easily when you declare a variable that is accessible to everyone, but to complete the sequence of errors, a very interesting behavior of `var` is that it does not throw any kind of error when you redeclare an already existing variable (as we see today with `const` and `let` for example). The problem is that instead of redeclaring the variable the same way and replacing the value, the engine simply does nothing.

This can lead to very confusing behavior and bizarre bugs that can arise from broken logic because of a variable with the same name.

### What you can do today

Use `let` and `const`, preferably `const`, since these two types of declarations are not confined only to global and function scopes, but rather to the scope of each block, what we call **lexical scope**, that is, a variable will only exist inside the block of code where it was declared and nothing more, this already avoids a major problem of value leakage.

Additionally, `const` variables are for immutable values, so they cannot be reassigned without an error, and neither allows redeclaration with the same name.

## Relying on type coercion

A while back I started a [cool Twitter thread](https://twitter.com/_StaticVoid/status/1481233189494575106?s=20) about type coercion, the feature that is both the wonder and the destruction of not just the language as a whole but also the reason for dividing the dev community into two parts: the people who like JavaScript and the people who don't.

A brief introduction for those who have never heard of this. **Type coercion** is a typical feature of dynamically typed languages, such as JavaScript, Python, Ruby..., it allows you to write your code without worrying about the types of variables, that is, unlike other languages like C#, Java, C and family.

This can be an incredible superpower for programmers, because you are much more agile and don't need to worry about whether one type will be compatible with another because, if it isn't, the language will convert it automatically for you, that is, the compiler will _coerce_ that variable to the desired type.

But the catch is that it can be a power for those who know all the type coercion rules by heart, which is not true for almost anyone (not even those who work on the language core, let alone more experienced developers), so relying too much on type coercion to convert what you are sending to the language to the right type is not really the best thing to do.

I think the most classic example of this, apart from what we already showed in the thread, is the famous "sum of 1+1". Almost all operators (like `+ - / * ==`) will automatically convert the types of their counterparts, so if we try to do something like this:

```js
console.log("1" + "1") // "11"
console.log("2" - "1") // 1

console.log('' == 0) // true
console.log(true == []) // false
console.log(true == ![]) // false
```

We will see that we have some very strange outputs, why did it add the two strings but subtract the two numbers? Why is `[]` not `true`? And several other questions that I won't answer here.

The fact is: **Trusting too much in coercion is bad, not trusting it is also bad.**

If you trust too much in JavaScript's type coercion, you will probably end up with code that is completely unreadable to any human, because JavaScript will not give you any syntactic clue about what is happening in your code (this, in fact, is the reason supersets like TypeScript were created).

On the other hand, if you don't trust JavaScript's type coercion, then it is better not to use JavaScript at all. Because if you are going to manually convert, and yes, it is possible, all types to the types you want, it is better to use a naturally typed language.

### What to do?

Not only take advantage of coercion, but **understand** how it works. It is easy to say that the compiler is strange, but the history of this language shows why it behaves this way and why it _will_ continue to behave this way forever.

Also, add an explicit type conversion when you realize that your variable might be ambiguous, for example:

```js
let qualquerCoisa = // algum valor recebido

let stringA = a.tostring()
let numeroA = Number(a)
let boolA = Boolean(a)
```

Trust coercion for creation and reception, but only trust it for specific conversions if you are absolutely certain of the final result, otherwise your code will not be very resistant to _edge cases_.

## Thinking arrow functions are the same as regular functions

Even though they do the same things and have almost the same names, **arrow functions and regular functions are completely different things**.

I have lost count of how many times I have seen developers fail logical tests in interviews because of this question. And I myself, participating in these processes, have asked it countless times. And what is most striking is that many people think they are the same things, many people say it is just _syntactic sugar_ on top of functions, but it is not!

There are many differences between a normal function like `function foo () {}` and an arrow function like `() => {}`. And it is not even as if this were hidden in the JavaScript documentation, it is completely open and well documented, in fact it is something extremely discussed.

Some basic differences between these functions (there are some others [here](https://dmitripavlutin.com/differences-between-arrow-and-regular-functions/)):

-   **Arrow functions don't have their own context**, that is, the value of `this` inside the function will be the value of the scope immediately above it, so if you declare an arrow function inside another function, the value of `this` will be the reference of the parent function. **Regular functions have their own context**, so if you declare a function inside another function, the value of `this` in the child function will be completely different from the value of `this` in the parent function. That is why, in the early days, we used to save a `var self = this`, because we needed to pass the context from another place to the inner function.
-   **Arrow functions don't have the system variable** `**arguments**`, this is a special variable in JavaScript that returns everything that was passed to the function as an array. This was very common in the old days when we used this technique to build **variadic arguments** (which can have a variable number of values). This is not even so necessary today, especially because we can do almost the same thing with _rest_ parameters.
-   **Arrow functions cannot be valid constructors**. Something we will discuss further is about _prototypes_, and prototypes are a form of inheritance. In the beginning of JS, the only way to do something with inheritance was using function constructors, that is, `new MinhaFuncao()` would return an instance of that function, and then we could modify its prototype however we wanted. This is not possible in arrow functions, and also, while it is possible, it is not recommended since we have the class structure in JavaScript.

These are just a few things, but it is already a great step toward understanding when to use and when not to use different functions in different cases.

## Ignoring `this`

I think `this` is the most misunderstood topic in JavaScript, so much so that I wrote an [article in 2018](https://imasters.com.br/javascript/javascript-entendendo-o-de-uma-vez-por-todas) and to this day people are still asking about it.

The `this` is really complex to understand when you are learning the language, it is one of the "peculiarities" of JavaScript having a mobile context. If you have worked a bit more with JS, then you have already had to deal with things like `this`, `.bind()`, `.call()` and `.apply()`.

The `this` has basically 3 rules (credits to [Fernando Doglio](https://fernandodoglio.substack.com/) for explaining it so well):

-   Inside a function, `this` will take on the context of that function, that is, the value of the context of the function instance. If it were a prototype it would be the value of the prototype, but that is no longer so common.
-   Inside an arrow function, it will take on the value of the context of the parent object, whatever it may be, if you call a function inside another function, `this` will be the `this` of the parent function, if it is directly at the root, it will be the global scope, if it is inside a method, it will be the context of the method.
-   Inside class methods, it is the context of that method, including all properties of the class (which is the way everyone who has worked with OOP is more used to)

In general, the context is mobile, so it can be easily replaced within a function, by methods like `bind` and `call`:

```js
class foo () {
	constructor (arg1, arg2) {
        this.arg1 = arg1
        this.arg2 = arg2
    }
}

function bar () {
    console.log(this.arg1, this.arg2)
}

const foo1 = new foo('Lucas', 'Santos')
const foo2 = new foo(true, 42)

bar.bind(foo1)() // Lucas Santos
bar.call(foo2) // true 42
```

Using these methods we can extract the context and pass the value of `this` that we want to any object. This is still widely used when we are dealing with systems that inject code into other systems without needing to modify their implementation.

## Not using strict comparators

Another problem that catches many people is using `==` instead of `===`. Remember what I said about type coercion? Well, this is where it shines even more.

Operators like `==` will compare only the values on both sides, and for this to happen, it needs to convert both to the same type so they can be compared in the first place. So if you pass a string on one side and a number on the other, `==` will try to convert both to strings or both to numbers.

This does not happen with `===`, because it compares not only the value, but also the type, therefore coercion does not occur. So you have much less chance of falling into a bizarre coercion error when using strict comparison operators.

## Ignoring errors in callbacks

This is not a bad practice only in JavaScript, but in any language, but since JS allows errors to exist inside callbacks as parameters that may or may not be handled, it ends up being valid, even though we don't use callbacks as much as we used to.

In cases where we have something like:

```js
umaFuncaoComCallback((err, data) => {
  return data
})
```

Where the code is perfectly valid, but the error is not handled, there will be many errors in the future, mainly because these errors may not come from your own application, so the logic can continue running but the values it receives will be completely different from what is expected, for example, when you receive a call from an API or something like that.

Errors in callbacks, however rare they may be today, should always be handled:

```js
umaFuncaoComCallback((err, data) => {
  if (err) throw err
  return data
})
```

## Using callbacks

And here we fall into the next "bad practice", which is not so bad depending on the case, it is the use of callbacks.

We have a great explanation [in this article](https://jscomplete.com/learn/the-difference-between-callbacks-and-promises) about why callbacks and promises are completely different. But the long and short of it is that with callbacks, control of your code can be lost very easily. One reason is the infamous _callback hell_ where one callback leads to another callback which leads to another callback and so on.

The other reason is that, since callbacks are complete functions, you need to pass control of the actions you will take when the callback is complete to the task executor, that is, the callback, if something goes wrong inside the callback it is as if you were at a lower level of the code, with a completely different context.

That is why the use of Promises, besides being much more readable, is preferable, especially when we are using `async/await`, because then we can delegate the "promise" of an execution to an executor and, when that executor finishes execution, we will have the output in concrete form and then we can execute the next action.

Promises are so important that I wrote [two articles](https://dev.to/khaosdoctor/entendendo-promises-de-uma-vez-por-todas-44i7) about them and they still receive many visits and many questions.

Promises can also cause "promise hells", and they are also subject to control delegation, but it is a matter of use. You can use promises to create a new execution context while the previous context is still executing, like:

```js
function promise () {
	return new Promise((resolve, reject) => {
    	setTimeout(resolve, 3000)
    })
}

promise().then((data) => {
	// outro contexto de execução
})

//código continua
```

And that is why it is important to know when to use `then` and when to use `await`, because you can create processing in different threads in parallel using only Promises, without needing to block the main process, let's say you want to log the progress of a function as it progresses, but the task has nothing to do with the original task, so it can be executed in a separate context.

But when we need to make a call to a database, that call is related to our current logic, so we cannot continue executing the program, we have to stop, wait (without blocking the event loop) and then work with the result.

## Using "archaic" techniques

Honestly, no one had the slightest idea that JavaScript would become so famous. So during the course of the language's life, applications created with it were evolving much faster than the language itself.

As a result of this, people were creating workarounds to solve problems. And this has stuck in the code until today, for example, the use of `array.indexOf(x) > -1` to identify elements not present in the array, when today it is already possible to use `array.includes(x)`.

[This article](https://dmitripavlutin.com/make-your-javascript-code-shide-knockout-old-es5-hack/) has a great guide on how to go through old code and "update it".

## Not using "Zero Values"

Zero values are a technique that is widely adopted by Golang, where you **always** initialize a variable with an initial value, a zero value.

In JavaScript, any uninitialized variable will take on the value of `undefined`, but at the same time we have `null` values, which can be assigned to a variable to say that it has no value.

It is usually a bad practice to initialize as `undefined`, because we have to compare these values directly with `undefined`, otherwise we might accidentally find a `null` and treat it as `undefined`.

Besides, JavaScript has a series of methods to avoid comparing `property === undefined` like `if ('prop' in object)`. Always try to use initial values, because this also makes it simpler to merge objects with default values like `{...defaultValue, ...newValues}`.

## Not following a code style

This is probably not just a bad practice but a lack of respect for other colleagues, if you are working as a team.

There are many well-known code styles, such as [AirBnB](https://github.com/airbnb/javascript), [Google](https://google.github.io/styleguide/jsguide.html), and my favorite, [Standard](https://standardjs.com/). Please use them, this makes the process much simpler and much easier to read for other people on the team, not to mention that they also make it much easier to debug and understand what is happening.

If you always forget, no problem! Use linting tools like [ESLint](https://eslint.org/) and [Prettier](https://prettier.io), if you want, I even created a [template repository](https://github.com/khaosdoctor/template-node-ts) that already has all of this configured.

## Modifying prototypes

Prototype inheritance is something that is quite complex and quite advanced even for those who have been around for a long time.

A long time ago I wrote [an article](https://medium.com/trainingcenter/herança-e-protótipos-no-javascript-2c1e60e005a2) about how prototypes and inheritance work in JavaScript, the idea is that everything is an object, each object has its prototype, which is also an object, this prototype is a reference to the object that created the current object, so basically it has all the methods of that object.

For example, a simple array will already have all the common methods `filter`, `map`, `reduce` and so on. But this, in fact, comes from `Array.prototype`, which is the object that is passed to your array when it is created. The way inheritance works is that JS will search through all prototypes, from the highest (which is the current one) to the lowest (which is the origin), by the name of the function, if it doesn't find it anywhere, that function does not exist.

> If you got confused, that is normal, but I recommend that you read the article to understand better, since I am just giving the basic idea here.

In the old days it was very common for us to use the prototype to inject a series of methods into our function so that it would behave like a class, since all instances of that function would have the same prototypes, but that **is no longer true today**.

Avoid modifying prototypes at all costs, unless you really know what you are doing, otherwise you can cause **very serious** problems in your application, since you are tampering with the forms that define your objects.

## Conclusion

There are many bad practices, some are necessary, many of them will exist in the code you are working on, but none is irreversible. So it is up to us to leave the code better than we found it when we arrived.

If you have any more tips, just call me on any of my [social networks](https://lsantos.dev) :D
