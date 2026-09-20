---
title: '"Understanding timers/promises and AbortControllers in Node.js"'
pubDate: 2022-03-14T14:00:00.000Z
updatedDate: 2026-07-16T16:10:41.000Z
category: technology
tags: ["javascript", "nodejs"]
lang: en
description: '"Learn everything about new ways to cancel asynchronous functions and declare time intervals with promises in Node.js"'
slug: understanding-timers-promises-and-abortcontrollers-in-nodejs
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

One of the oldest functionalities in JavaScript is what we call **timer APIs**. Their functionality is quite straightforward: they allow us to schedule code execution for the future!

These APIs are well known through the commands `setTimeout`, `setImmediate` and `setInterval`. And even though they're used to schedule code execution, we can often take advantage of this type of API to transform synchronous operations into asynchronous ones, avoiding blocking the main thread and the event loop.[^n1]

## Why discuss timers?

You might be wondering: "If these functions are almost as old as JavaScript itself, why discuss them now?".

And that's a very valid question, since these functionalities are already implemented in Node.js by default. However, one of the biggest advantages we have in Node is that we now have timer usage through a promises API, and also the use of `abortcontrollers` that allow cancelling a timer much more easily than before! Let's explore all of this here!

## Timers with promises

The original model for using timers was through callbacks, and they remain the most widely used, partly because they allow delegating code to be executed by another thread without waiting for the current flow execution to finish.

An example code would be something like:

```js
setTimeout(() => {
  console.log('this callback will be executed in 3 seconds')
}, 3000)

setImmediate(() => {
  console.log('this callback will be executed right after execution starts')
})

console.log('and this one will be executed first')
```

The result we'll get will be something like:

```bash
and this one will be executed first
this callback will be executed right after execution starts
this callback will be executed in 3 seconds
```

The problem is that when we want code to wait for a certain time, what we call _sleeper functions_, we'd have to do something like this:

```js
function foo() {
  console.log('unfinished operation')
  setTimeout(() => {
    console.log('wait 10 seconds to continue')
    console.log('continue the unfinished operation')
  }, 10000)
}
```

Given the nature of callbacks, the only way to continue executing the function after a certain time would be to delegate the rest of the execution inside the callback, so we lose control of the original flow, unless we have some way to pass a signal into the callback function.

In practice, this means that the more complicated the function is, the larger the callback will be and, consequently, the more complex our code becomes.

That's why we have promises as one of the best solutions to this problem. The ideal way to transform a timer into a promise is basically following the old formula:

```js
const sleep = (timer) => {
  return new promise((resolve) => {
    setTimeout(() => resolve, timer)
  })
}

async function start() {
  console.log('operation')
  await sleep(3000)
  console.log('continue the operation')
}
```

This way we can continue the operation in the same flow without delegating any execution to another function or thread. In practice this makes the code more readable, although there are cases where callbacks can be faster than promises.

But this stopped being a problem in Node.js **[version 16](https://nodejs.org/api/timers.html#timers-promises-api)**, the latest version considered LTS, which is the most current and well-supported version.

Now we natively have support for timers with promises APIs directly through the `timers/promises` module.

> Remember that this is not the only module that has a `/promises` variant. The `fs` module also has its promises version that can be imported from `fs/promises`.

The usage is quite simple and straightforward, which made this update one of the simplest and easiest to implement, because the change curve is extremely low.

### setTimeout and setImmediate

To illustrate, we'll use [ECMAScript modules](/os-ecmascript-modules-estao-aqui/), which allow us to use the `await` keyword at the top-level, that is, outside of an `async` function. Therefore, we'll use `import` to import our modules.

```js
import { setTimeout } from 'timers/promises'

console.log('before')
await setTimeout(3000)
console.log('after')
```

The order of parameters has now been inverted. Instead of having the callback first and the timer after, we now have the timer first and an optional callback as the second parameter. This means we already have the "sleep" functionality built into the function.

If we want to pass a second parameter, it will be the return value of our function, for example:

```js
import { setTimeout } from 'timers/promises'

console.log('before')
const resultado = await setTimeout(3000, 'timeout')
console.log('after')
console.log(resultado) // timeout
```

Or even

```js
import { setTimeout } from 'timers/promises'

console.log('before')
console.log(await setTimeout(3000, 'timeout')) // timeout
console.log('after')
```

The same applies when we have a `setImmediate`, the difference is that we won't have the time parameter:

```js
import { setImmediate } from 'timers/promises'

console.log('before')
console.log(await setImmediate('immediate')) // immediate
console.log('after')
```

### setInterval

The intervals API is a bit different, mainly because of the reason it exists. When we're talking about code intervals, we usually want to execute a certain function at a certain time.

Therefore, the `setInterval` API will always, or at least most of the time, receive a function as a callback that will execute something. Because of this, its promises counterpart is an [Async Iterator](https://dev.to/khaosdoctor/entendendo-async-iterators-1opo) which are essentially [Generators](https://medium.com/trainingcenter/javascript-entendendo-generators-408cbce9aee) that produce promises instead of direct values.

We can mimic this behavior a bit using the following function that mixes both the timeout promises API and generators and async iterators together:

```js
import { setTimeout } from 'timers/promises'

async function* intervalGenerator(res, timer) {
  while (true) {
    setTimeout(timer)
    await setTimeout(timer)
    yield Promise.resolve({
      done: false,
      value: res
    })
  }
}

for await (const res of intervalGenerator('result', 1000)) {
  console.log(res.value)
}
```

In the case above, we'll have the value `result` being printed to the console every second, and we can see that, at the end of the day, everything ends up being derived from `setTimeout`, because `setImmediate` is nothing more than a `setTimeout` with time `0` as well.

But it would be an absurd task to try to implement all of this manually, which is why we already have the native function that returns exactly the same result:

```js
import { setInterval } from 'timers/promises'

for await (const result of setInterval(1000, 'result')) {
  console.log(result)
}
```

The main difference, like with the other functions, is that we have the time parameter as the first one and the result parameter as the second.

## Cancelling timers

Let's imagine we have code that's being executed at regular intervals, for example, to do polling, that is, constantly requesting an API looking for an expected result. Like in this small example:

```js
let valorExterno = false
setInterval(async () => {
  const response = await fetch('url').then((r) => r.json())
  if (response.valor < 500) valorExterno = true
}, 5000)
```

The problem we face here is that we have to stop executing the interval after we find the value we want. The traditional way to do this in the callbacks model was by receiving a reference to the timer and then using functions like `clearInterval` and `clearTimeout` to stop continuous execution. This reference was returned by the timer itself, so we would do something like this:

```js
let valorExterno = false
let interval = setInterval(async () => {
  const response = await fetch('url').then((r) => r.json())
  if (response.valor < 500) {
    valorExterno = true
    clearInterval(interval)
  }
}, 5000)
```

It's a bit confusing the idea that we can pass a reference to the interval itself so that it can be cancelled by itself. But from the compiler's point of view this code is completely valid, since variables are allocated before function execution. Therefore what the interval will receive is just the memory address that will contain a reference to itself in the future.

With the new Promise-based API, we can't get a direct return from the function because the return of our timer will be the result we expect. So how do we cancel code execution without being able to receive the reference of that interval? In the case of a `setInterval` that returns an async iterator to us, we can just do a break in the code:

```js
import { setInterval } from 'timers/promises'

function promise() {
  return Promise.resolve(Math.random())
}

let valorExterno = false
for await (const result of setInterval(2000, promise())) {
  console.log(result)
  if (result > 0.7) {
    console.log('Desired result obtained, aborting executions')
    break
  }
}
```

But when we have executions that are not continuous, how can we abort the process in the middle? The answer: **inverting control**.

## Abort Controllers

The idea is that, instead of the function that created the timer being responsible for ending it, the timer itself will receive the function, or rather, the **signal** of termination that will be controlled by an external agent. That is, we'll send a function into the timer and tell it when that function should be executed, but we won't work with references anymore. These functions are known as **Abort Controllers**.

The Abort Controller is a _global object_ that represents a cancellation or termination signal of an asynchronous operation. Abort Controllers have only two properties. The first is a function called `abort()`, which initiates the cancellation process of the operation. The other is an instance of a class called `AbortSignal`, which is a class that represents a cancellation signal itself.

It might seem a bit strange to separate the signal and control like this, but this comes directly from a very important design pattern called **Observer**. Essentially, everyone who receives an `AbortController.signal` will be cancelled when the `abort()` function is called. And this is also valid for timers with promises, which now receive a third options parameter that has a property called `signal`, which is an `AbortSignal`.

Let's see an example. To understand better, we'll simulate a very long operation that will take a minute to execute, but that we can cancel in the middle if we have a problem.

```js
function operacaoLonga(signal) {
  return new Promise((resolve, reject) => {
    if (!signal.aborted) signal.onabort = () => reject('Cancelled')
    setTimeout(resolve, 60000)
  })
}

const ac = new AbortController()
setTimeout(() => ac.abort(), 3500)
await operacaoLonga(ac.signal).catch((r) => {
  console.error(r)
  process.exit(1)
})
```

What's happening here is that we have a function that will return a promise in 60 seconds, still using the callbacks model for timers. But it will receive a cancellation signal as a parameter, so you could cancel it externally if it was taking too long. To do this we first check if the signal has already been cancelled with `signal.aborted`. Then we create a listener for an `abort` event that will be fired when the `abort()` function of the `AbortController` is called. This event will only reject our promise.

And when we call the long operation, we pass a new signal to it and cancel the operation after 3.5s of execution. The result is a line in the console saying `Cancelled` and the process terminates with an error code.

Similarly, we can import timers in promise model and use the `AbortController` to cancel the operation. As we can see here with `setTimeout`:

```js
import { setTimeout } from 'timers/promises'

const ac = new AbortController()

await setTimeout(3500, ac.abort('Timeout'))
await setTimeout(60000, 'long operation', { signal: ac.signal })
```

But notice that we're using `setTimeout` multiple times. There's a better way to do this with `AbortSignal.timeout`, which basically implements what we did in the line `await setTimeout(3500, ac.abort('Timeout'))`:

```js
import { setTimeout } from 'timers/promises'

await setTimeout(60000, 'long operation', { signal: AbortSignal.timeout(3500) })
```

This is a helper method that can be used for many things. In fact, we can limit the execution of our promise in the previous example with this same code:

```js
function operacaoLonga(signal) {
  return new Promise((resolve, reject) => {
    if (!signal.aborted) signal.onabort = () => reject('Cancelled')
    setTimeout(resolve, 60000)
  })
}

await operacaoLonga(AbortSignal.timeout(3500)).catch((r) => {
  console.error(r)
  process.exit(1)
})
```

Erick Wendel has a really cool video on the subject where he also explains how we can implement the famous `Promise.race` using only this functionality.

![](https://www.youtube.com/watch?v=u8qk9l304K0)

The `AbortController` and `AbortSignal` are not just made to be used with timers, but with all kinds of promises in general. You can implement it manually as we did before, through the `abort` event using the `onabort` function or the `on` method of `EventListener`. Or you can use `AbortSignal.timeout` to limit the execution of the promise to a certain time without needing to call `abort()` manually, which is particularly useful in cases where we need to create execution timeouts.

Don't forget that every `abort` signal will be treated as an exception, so it's important to handle these exceptions so your code can continue executing. And you can catch the error type very specifically, because all exceptions caused by `AbortController` and `AbortSignal` have the name `AbortError`:

```js
import { setTimeout } from 'timers/promises'

try {
  await setTimeout(60000, 'long operation', { signal: AbortSignal.timeout(3500) })
} catch (err) {
  if (err.name === 'AbortError') {
    console.error('Program received signal to stop execution: ', err.message)
  }
}
```

## Conclusion

As Node.js and JavaScript versions progress, the use of cancellation signals for promises and timers will become increasingly common. Therefore, expect to see much more code that expects to receive some kind of cancellation signal in one of its parameters.

And it's also a great practice, especially for systems that need to perform long tasks or external asynchronous calls, that there be a way for that operation to be cancelled. So you can also take advantage of this concept and use the `AbortController` and `AbortSignal` for that.

[^n1]: We'll have a special article just to cover the event loop in Node.js and all the nuances that timers apply to it. For now, this content already exists in [my series of articles about Node.js internals](https://dev.to/khaosdoctor/node-js-por-baixo-dos-panos-3-um-mergulho-no-event-loop-38l9) that's worth checking out.
