---
title: Using Mocks with Node Test Runner
pubDate: 2024-06-05T11:00:45.000Z
updatedDate: 2026-07-16T17:56:17.000Z
category: javascript
tags:
  - nodejs
  - javascript
  - typescript
lang: en
description: How to use mocks, stubs and spies in your tests using the native Node.js Test Runner
slug: using-mocks-with-the-node-test-runner
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In the [previous article](/comecando-com-o-node-js-test-runner/) I showed how we can start using the **Node.js Test Runner**. Now, how do we do more than just "get started" with the Node.js Test Runner?

After getting feedback from students and readers, many people asked me to continue because there isn't much content about the test runner in Portuguese, so let's keep going! I'll try to write several articles, not necessarily connected, about what I cover with NTR and how we can solve some common cases using it.

Today, let's talk about mocks!

## About mocks, spies, stubs... blah blah blah

First, if you're new to the world of testing and/or don't know about the existence of **test doubles**, I won't explain what they are here. But in 2017 I wrote two articles about testing that are still valid:

-   [What are tests](https://medium.com/trainingcenter/testes-o-que-s%C3%A3o-aonde-vivem-4b8dfe12269e)
-   [About mocks, spies, stubs and everything else](https://medium.com/trainingcenter/testes-unit%C3%A1rios-mocks-stubs-spies-e-todas-essas-palavras-dif%C3%ADceis-f2765ac87cc8)

Before starting this article, read one or both of the previous content because we're going to talk a lot about mocks here today!

## Mocks in the Node.js Test Runner

When NTR came out in Node version 18, it didn't have native support for mocks, meaning you had to download a test doubles library like [Sinon](https://sinonjs.org) to use any kind of mock or spy.

Currently (at the time of this article, we're on version 22), NTR already has some support for mocks, but it's still not complete. For example, we only have support for spies and stubs, but we can't (yet) mock complete modules or entire objects.

> In these cases, where we're used to older projects like Jest, which already has its own mocks system, the simplest thing is to go back to basics and use Sinon to meet the need, since both (NTR and Jest) are heavily inspired by Sinon.

However, even with all the limitations, we can still create mocks for almost every test case we need. I'll go over the mocks API we have with the Node Test Runner and how we can use each of the functions.

## The Mocks API

The `node:test` module has some mocks through an object called `mock` that you can import directly from the package:

```js
import { mock, test } from 'node:test'
```

This mock has some methods you can use to create spies of a function or object using `mock.fn`, let's imagine a continuous addition function like this one:

```js
import { mock, test } from 'node:test'

test('foo', () => {
  const myFun = (...n) => n.reduce((acc, cur) => acc + cur, 0)
})
```

How do we know if it was really called? And what parameters was it called with? We can wrap it in a spy object:

```js
import { mock, test } from 'node:test'
import assert from 'node:assert'

test('foo', () => {
  const myFun = (...n) => n.reduce((acc, cur) => acc + cur, 0)
  const myFunSpy = mock.fn(myFun)

  assert.strictEqual(myFunSpy.mock.calls.length, 0) // not called
  assert.strictEqual(myFun(1,5,7), 13)
  assert.strictEqual(myFunSpy.callCount(), 1) // called
})
```

You can see that everything related to the function's call information is in the `mock` object within `myFunSpy`. When we access this object we have a series of properties:

-   `callCount`: Number of times a function was called, similar to `.mock.calls.length`, but more efficient because it's a function that doesn't create a copy of the internal array of the Tester
-   `resetCalls`: Returns the number of calls to 0
-   `mockImplementation`: Replaces the function's implementation with another one for the entire lifetime of the mock
-   `mockImplementationOnce`: The same as the previous one, but only once (equivalent to using `mockImplementation`, calling the function, and then `restore()`)
-   `restore`: Restores the original behavior of the function, the mock can continue to be used after that

Besides that we have the `calls` object, which is literally the internal tracking array of the tester. This array has a list of all calls made to the function. So, for example, if we want to get the first call, we can do `mock.calls[0]`.

Each call has a series of other properties:

-   `arguments`: The array of positional arguments to the function, so `mock.calls[0].arguments[0]` in the case of the call `myFun(1,10)` would be `1`.
-   `error`: If the function threw an error, this value will contain the thrown error, otherwise it will be `undefined`
-   `result`: Similarly, if the function reached the end and returned a value, that's the returned value, otherwise it's `undefined`
-   `stack`: It's the StackTrace that was used to determine the error if the `error` property exists
-   `target`: If the mock is a class constructor, this property will be the class being constructed
-   `this`: The `this` property of the mocked object

With these properties we can basically mock any possible function. For example, we can ensure that our `myFun` function returned successfully and was called with the right arguments:

```js
import { mock, test } from 'node:test'
import assert from 'node:assert'

test('foo', () => {
  const myFun = (...n) => n.reduce((acc, cur) => acc + cur, 0)
  const myFunSpy = mock.fn(myFun)

  assert.strictEqual(myFunSpy.mock.calls.length, 0) // not called
  assert.strictEqual(myFun(1,5,7), 13)
  assert.strictEqual(myFunSpy.callCount(), 1) // called

  const lastCall = myFunSpy.mock.calls[0]
  assert.deepStrictEqual(lastCall.arguments, [1,5,7])
  assert.strictEqual(lastCall.result, 13)
  assert.strictEqual(lastCall.error, undefined)
})
```

We can also change the behavior of the function so that it always returns the same thing:

```js
import { mock, test } from 'node:test'
import assert from 'node:assert'

test('foo', () => {
  const myFun = (...n) => n.reduce((acc, cur) => acc + cur, 0)
  const myFunSpy = mock.fn(myFun, (...x) => 10) // the function now always returns 10

  assert.strictEqual(myFunSpy.mock.calls.length, 0) // not called
  assert.strictEqual(myFun(1,5,7), 10)
  assert.strictEqual(myFunSpy.callCount(), 1) // called

  const lastCall = myFunSpy.mock.calls[0]
  assert.deepStrictEqual(lastCall.arguments, [1,5,7])
  assert.strictEqual(lastCall.result, 10)
  assert.strictEqual(lastCall.error, undefined)
})
```

> [!NOTE] 💡
> If we pass a third parameter to the function, we can say how many times the mock will be valid, so if we pass `mock.fn(original, implementation, { times: 5 })` we'll mock `original` to have the return of `implementation`, but only in 5 calls

### The `mock` object

Besides having specific properties within the spy function, we also have global properties of the mock itself. For example, we can mock a method of an object using `mock.method`:

```js
import { mock, test } from 'node:test'
import assert from 'node:assert'

test('foo', () => {
  const mathObj = {
    spreadSum: (...n) => n.reduce((acc, cur) => acc + cur, 0),
    sum: (a, b) => a+b,
    max: (a, b) => Math.max(a, b) 
  }

  const maxMock = mock.method(mathObj, 'max')
  assert.strictEqual(maxMock.callCount(), 0)
  assert.strictEqual(mathObj.max(1, 3), 3)
  assert.strictEqual(maxMock.callCount(), 1)
})
```

Like before, we can pass a third parameter which is the implementation, plus a fourth parameter which is an options object with the following properties:

-   `getter`: If `true` the mocked property is treated as a getter
-   `setter`: If `true` the mocked property will be treated as a setter (cannot be used together with `getter: true`)
-   `times`: How many times the implementation will be used

> [!TIP] 💡
> Besides `method`, we also have two shortcuts which are `mock.getter` and `mock.setter` that have the same function as calling `mock.method` with the `getter` or `setter` property as `true`.

Another function we have directly on `mock` is the `reset` function which will reset all properties of all mocks created globally, and the `restoreAll` function which, as you can imagine, does the same as `restore` but at a global level.

## Contexts

Another thing worth mentioning is that the mock object can have two contexts: local and global.

The global context is what we're calling directly from the `node:test` module, while the local one is the context within the individual test. This context can be seen through the (recently [exported](https://github.com/DefinitelyTyped/DefinitelyTyped/pull/69497) by yours truly) interface called `TestContext`.

What we've been doing so far is the global context. To call directly from within the context we can use the parameter that is passed to the `test` or `it` function:

```js
import { test } from 'node:test'
import assert from 'node:assert'

test('local context', (ctx) => {
  const myFun = (...n) => n.reduce((acc, cur) => acc + cur, 0)
  const myFunSpy = ctx.mock.fn(myFun) // see the ctx here

  assert.strictEqual(myFunSpy.mock.calls.length, 0)
  assert.strictEqual(myFun(1,5,7), 10)
  assert.strictEqual(myFunSpy.callCount(), 1)
})
```

We can use it with `it`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('local context with it', () => {
  it('test name', (ctx) => {
    const myFun = (...n) => n.reduce((acc, cur) => acc + cur, 0)
    const myFunSpy = ctx.mock.fn(myFun) // see the ctx
  
    assert.strictEqual(myFunSpy.mock.calls.length, 0)
    assert.strictEqual(myFun(1,5,7), 10)
    assert.strictEqual(myFunSpy.callCount(), 1)
  })
})
```

The big advantage (and the reason I recommend using the local context **always**) is that when a test ends, it will automatically clean up and remove the mock, so one mock won't interfere with another mock.[^n1]

## Conclusion

The Node.js Test Runner is an amazing tool. And it has a lot to offer even though it's missing some features, but even with the incomplete mocks module, we can see that it's possible to do everything we need using just the test runner.

If you're interested in seeing a complete test of a large project, check out our repository of the [project number 3 from Formação TS](https://github.dev/Formacao-Typescript/projeto-3/tree/node-test-runner) that I solve step by step with students during the course!

[^n1]: **Fun Fact:** We had this problem during one of the livestreams in our [Formação TS](https://formacaots.com.br?utm_source=personal-blog&utm_medium=post&utm_campaign=ntr-mocks&utm_id=fixed) community. When we were doing the testing module with the Node.js Test Runner, we accidentally created a global mock that ended up interfering with all the project's tests.
