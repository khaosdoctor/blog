---
title: Node 21.2 is the most special version of all!
pubDate: 2023-11-24T23:50:58.000Z
updatedDate: 2026-07-16T15:55:11.000Z
category: javascript
tags:
  - nodejs
  - javascript
  - development
lang: en
description: Join me in understanding what changed in Node.js version 21.2, why this is one of the most special versions of all! And what it means!
seoTitle: Node 21.2 improves the test runner with Date Mocks support
slug: node-21-2-is-the-most-special-version-of-all
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

I recently posted [an article](/node-21/) discussing the new features in Node version 21, but one of those updates was left out!

And this is precisely the [version 21.2](https://nodejs.org/en/blog/release/v21.2.0) of the runtime that, for me, is the most special version of all, because this time I was there helping to make Node even better!

![](./image.png)

That's right! After almost 3 years away from the open source community, I decided to return to the ecosystem once more, and this time with Node.js!

> [!TIP] 💡
> I made [a LinkedIn post](https://www.linkedin.com/posts/lsantosdev_opensource-mocks-javascript-activity-7131061453322649600-qmc9?utm_source=share&utm_medium=member_desktop) about this, if you want to check it out later! But here I'll focus on the update itself!

## Why is it special?

Because I'm in it! 😎, just kidding! Of course this version is special to me, but it's also special for another reason, **this will be the first time we have the ability to test 100% of an application with Node's native test runner!**

Node added support for a [native test runner](/node-test-runner/) a few versions ago, but unfortunately the tool's support was quite odd. We couldn't mock anything, there was no good way to make code assertions, and the output was questionable.

Gradually, the test runner improved and is becoming increasingly important in the ecosystem. So much that in version 20 it's already possible to use it normally to test most of the applications we create.

But we still had a problem: we couldn't test applications that depend on time. We simply had no way to mock anything related to dates or hours, so any application that depends on timers like `setTimeout` or others couldn't be tested. With the [addition of timers to the mocking system](https://github.com/nodejs/node/pull/47775) we started to have support for timers, so `setTimeout`, `setInterval`, and `setImmediate` were covered.

But we still didn't have support for dates, we couldn't mock a date object like `Date`. And that's when I had the idea to build on Erick's implementation and add support for `Date`, and now all date options are covered!

## Date mocks

The complete module documentation is already live in the newest version of [Node's docs](https://nodejs.org/dist/latest-v21.x/docs/api/test.html#dates), but I'll go through some examples here:

https://nodejs.org/dist/latest-v21.x/docs/api/test.html#dates

First, it's important that you read my [original article about the test runner](/node-test-runner/) to understand how it works, but essentially, we have a `--test` flag that can be passed to the Node command. This flag will execute any files passed after it as a test and report in text format.

```shell
node --test arquivo.test.js
```

To initialize a test file we can simply create any file with the extension `.js`, `.mjs`, or `.cjs`. And then import Node's test module. Let's create a simple test for example:

```js
import assert from 'node:assert';
import { test } from 'node:test';

test('mocks the Date object', (context) => {
  assert.ok(true) // ok
});
```

You can also use the `describe` and `it` pattern:

```js
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('mocks the Date object', () => {
  it('should pass', () => {
    assert.ok(true)
  })
});
```

So far we're just testing our test, but let's create a function that depends on our date object, for example, a function that tells us what the current day of the week is:

```js
const dayIndex = [
  'Domingo', 
  'Segunda', 
  'Terça', 
  'Quarta', 
  'Quinta', 
  'Sexta', 
  'Sábado'
]

function getWeekDay() {
  const today = new Date()
  return dayIndex[today.getDay()]
}
```

How can we test a function that depends on today's date without needing to replace its behavior? The answer is **Date mocks!**

A bit further down, we'll start a simple test that will ensure we're mocking our date object. We can do this through the test context in an object called `mock.timers` using the `enable` function.

```js
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('getWeekDay', () => {
  it('deve substituir o objeto de data', (c) => {
    c.mock.timers.enable({ apis: ['Date'] })
    assert.strictEqual(Date.now(), 0)
    c.mock.timers.reset()
  })
})
```

Notice that we call the `enable` function and pass an object `{ apis: ['Date'] }`. This object receives the configuration of which APIs are enabled for mocking. You can see all the configurations [in the official documentation](https://nodejs.org/dist/latest-v21.x/docs/api/test.html#timersenableenableoptions).

> [!CAUTION] ⚠️
> If you're using version 21.2, the typing isn't correct in TypeScript because [my PR to add the types](https://github.com/DefinitelyTyped/DefinitelyTyped/pull/67035) hasn't been included yet, but it should be added in the next even version (22).
>
> So if your VSCode doesn't give you the correct typing, don't worry. Just make sure you're using version 21.2 or higher.

Note also that we're using an object `c`, which is the test context. Time mocks are only enabled in a local context, to prevent you from enabling a mock and not completely disabling it in a global context for other tests. And at the end of the test, it's equally important that we reset the mocks with `reset` so we can return to the original state.

> When we initialize the date mock without any parameters, we're saying we want to initialize the date to epoch 0, that is, January 1st, 1970.

Now that we know we're mocking correctly, let's test for all days of the week. To do this we'll create a loop, setting our clock to a specific date each time, one test for each day of the week:

```js
  it('deve retornar o dia da semana correto', (c) => {
    c.mock.timers.enable({ apis: ['Date'] })
    const dates = [
      new Date('2023-11-12T00:00:00.000Z'),
      new Date('2023-11-13T00:00:00.000Z'),
      new Date('2023-11-14T00:00:00.000Z'),
      new Date('2023-11-15T00:00:00.000Z'),
      new Date('2023-11-16T00:00:00.000Z'),
      new Date('2023-11-17T00:00:00.000Z'),
      new Date('2023-11-18T00:00:00.000Z'),
    ]

    for (const [i, date] of dates.entries()) {
      c.mock.timers.setTime(date.getTime())
      assert.strictEqual(getWeekDay(), dayIndex[i])
    }
    c.mock.timers.reset()
  })
```

See that now we're creating an array of dates that represent a week. This week will be passed to the date object of our mock through `setTime`, which is the method that sets what the current system date is!

This method always takes a positive integer, unlike the `now` key of the `enable` method (like `enable({ apis: ['Date'], now: new Date() })`), so we need to call `getTime` and, at the end, call `reset`.

If we run `node --no-warnings --test date.mjs`, we'll have a successful test!

```bash
❯ node --no-warnings --test date.mjs
▶ getWeekDay
  ✔ deve substituir o objeto de data (0.423292ms)
  ✔ deve retornar o dia da semana correto (0.765291ms)
▶ getWeekDay (2.142209ms)

ℹ tests 2
ℹ suites 1
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 58.35425
```

## Dates and timers

Unlike timers, dates are a global object, meaning if you run `enable` with a `Date`, **all dates will be mocked**. This also includes the internal clock used by timers like `setTimeout` and `setInterval`. That is, if you advance the date, you'll advance the timers too.

So imagine the following situation: You have a date object that's a mock, and also a timer to be executed in 1 second. If you advance the date object using `setTime` by, say, 1 hour, you **will necessarily execute the timer function**, since it will be as if time had passed 1 hour into the future.

Fortunately this test is quite simple to do. We just need to start mocking our timers (which will stop Node's internal clock) and create a 1-second timeout, then advance the time by more than that:

```js
import assert from 'node:assert';
import { test } from 'node:test';

test('executa os timers quando a data passa', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const fn = context.mock.fn(); // Criamos uma função mock
  setTimeout(fn, 1000);

  context.mock.timers.setTime(800);
  // Ainda não passou 1s, o timer não foi executado
  assert.strictEqual(fn.mock.callCount(), 0);
  // A data foi adiantada
  assert.strictEqual(Date.now(), 800);

  // Estamos adiantando mais a data
  context.mock.timers.setTime(1200);
  // Agora nosso timer é executado
  assert.strictEqual(fn.mock.callCount(), 1);
  assert.strictEqual(Date.now(), 1200);
});
```

It's important to remember this because timers are independent of the date when mocked, meaning you can control them individually. However, when you enable mocks for both dates AND timers, then both will work together because they use the same internal clock.

## Conclusion

This is a very special article for me because, for the first time, I'm describing and teaching how to use a feature I built myself.

The test runner is still an ongoing project and has a lot to improve. So let's go one step at a time and gradually we'll have one of the best native runners!
