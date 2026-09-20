---
title: How I Implemented Date Mocks in Node.js Core
pubDate: 2024-07-31T11:00:32.000Z
updatedDate: 2026-07-16T17:54:23.000Z
category: technology
tags: ["nodejs", "javascript", "open source", "tests"]
lang: en
description: Ever wanted to contribute to an open source project? Let me explain how I added my code to Node.js!
seoTitle: "Implementing Date Mocks in the Node Test Runner: A Story"
slug: how-i-implemented-date-mocks-in-node-js-core
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

A little over a year ago, I had the great pleasure of working on the [Node.js core](https://github.com/nodejs/node/pull/48638), and it was one of the most interesting experiences I've had. If you're using Node today, there's my code in there! I'm now returning to help grow the community around it. But what I want to tell you here is how [Date mocks](/node-test-runner-mocks/) work inside the [Node Test Runner](/comecando-com-o-node-js-test-runner/), piece by piece.

The goal of this article is to document what was done in this feature, but also to show that it's not that complex to understand the open source code we have out there. You can also contribute to the project you love most.

## The goal

This all sounds great, but what are mocks and why would we use something like this?[^n1]

I wanted to be able to do something like this:

```js
import assert from 'node:assert';
import { test } from 'node:test';

test('mocks Date.now to whatever value the user sets', (context) => {
  const now = Date.now()
  console.log(now) // current date, time keeps running

  // we enable the mocks
  context.mock.timers.enable({ apis: ['Date'] });

  // now the date is fixed at 1000ms after the initial epoch
  context.mock.timers.setTime(1000)
  assert.strictEqual(Date.now(), 1000) // true
});
```

Basically, date mocks are commonly used to test features that are time-sensitive. For example, a routine or cronjob that would run after X days from an event. This was very common at Klarna (and it is at most companies) when we had to deal with credit card lifecycles. For instance, each day we need to get cards that expired 30 days ago and run some process. How do you test that? By replacing the computer's date with your own, making Node think it's on a specific date.

Thanks to JavaScript's dynamic nature, this isn't that complex. But I discovered you need to know the specification really well to understand the consequences of what you can do.

## The beginning

To understand how mocks work, we need to go back to some previous PRs. Work on my PR started with a tip from a great friend, [Erick Wendel](https://github.com/ErickWendel), who had made a [PR](https://github.com/nodejs/node/pull/47775) a few months earlier implementing mocks for timers (`setTimeout`, `setInterval`, etc).

![](./image.png "Erick's original PR")

When I started using the test runner in my projects, I immediately ran into a big problem: even though we could mock timers, I couldn't mock dates! That meant I couldn't reset my test's clock and control how I wanted it to behave. Something had to be done.

I suggested this idea to the team first (I could have just done it, but I decided to ask first) and most people liked it. Since other test runners (Jest, Ava, Vitest, mocha, jasmine...) already had this feature, it would be good to have it implemented in NTR as well. This would bring more adoption to the platform.

## The planning

The idea was that date mocks would behave similarly to the [Sinon implementation](https://github.com/sinonjs/fake-timers/blob/main/src/fake-timers-src.js?rgh-link-date=2023-07-02T19%3A29%3A31Z), which is also the implementation used in Jest. This meant it was an API already familiar to people.

I started researching what the main methods would be and how I could integrate this new API into the existing mocks API. I concluded it would be easier to implement only the `now` method of the date, which was simpler and could be more useful. This was the initial version of my PR:

![](./image-1.png)

Notice that I was already thinking it might be better to mock the entire date object, not just `now`. This is considerably more complex than just the module.

> I won't go step by step through what I did here, but the initial context is important for understanding future decisions.

In the end, after many comments, the integration with the timers API created earlier by Erick turned out like this:

```js
// Everything the API already had before
MockTimers.reset()
MockTimers.tick(100)
MockTimers.runAll()

// Implementations that were changed
MockTimers.enable({ timersToEnable: ['setInterval', 'setTimeout', 'Date' ], now: 1000 })

// New methods
MockTimers.setTime(100)
```

I would keep the main usage since it was already in production, but I modified the `MockTimers.enable` parameter from an array of strings to an object, because now we could pass configurations for dates.

Additionally, MockTimers would have a new `setTime` method that would change the date in the mock. But as is custom in Node, the initial parameters of most APIs are optional. So I changed the idea so it would also work like this:

```js
MockTimers.enable({ now: 1000 }) // without a list, we would mock all methods

// or

MockTimers.enable() // starts at epoch 0
```

With the initial API decided, comes the main question: **How can I mock one of the language's main APIs without breaking anything?**

## The code

Surprisingly, the entire date mock addition to Node was done in a single [file](https://github.com/nodejs/node/blob/74ddce8853e8c3de90f1037940ee5dcf38201b65/lib/internal/test_runner/mock/mock_timers.js) called `mock_timers.js` inside `lib/internal/test_runner/mock`. This is a fairly common practice in older and established projects because it keeps PRs much smaller since the file is large but contains all necessary changes.

> There was a small change in another file, but I'll talk about that later.

When I started coding this feature, I thought: "But how do I create a mock?" In reality it's quite simple. A mock is nothing more than an object with an interface **identical** to the original object, but with different behavior. So, for example, if you wanted to manually mock the `now` method of `Date`, you'd just do something like this:

```js
const original = Date.now
Date.now = () => 0

console.log(Date.now()) // 0
console.log(original()) // 1720812736744
```

Of course, a method isn't an object, so how do we do that? First, we have to create our new properties. In this case it's the initial date, which will be `0`, which is a private property called `#now`:

```js
//https://github.com/nodejs/node/blob/bb7fc653e9199c5b65a7ed268f9e827d049d7a81/lib/internal/test_runner/mock/mock_timers.js#L123

class MockTimers {
  // ... start of code here
  #now = kInitialEpoch;
}
```

`kInitialEpoch` is a constant (that's why it starts with `k`) defined at [line 50](https://github.com/nodejs/node/blob/bb7fc653e9199c5b65a7ed268f9e827d049d7a81/lib/internal/test_runner/mock/mock_timers.js#L50) as `0`.

> Constants like this are very common in Node core, especially when used with Symbols, since we need to guarantee internal non-enumerable properties. We'll see more about this here.

Besides this property, as we did in our manual mock, we have to save the original method. Inside MockTimers, Node already does this with several other private properties:

```js
// https://github.com/nodejs/node/blob/bb7fc653e9199c5b65a7ed268f9e827d049d7a81/lib/internal/test_runner/mock/mock_timers.js#L99
class MockTimers {
  #realSetTimeout;
  #realClearTimeout;
  #realSetInterval;
  #realClearInterval;
  #realSetImmediate;
  #realClearImmediate;

  #realPromisifiedSetTimeout;
  #realPromisifiedSetInterval;

  #realTimersSetTimeout;
  #realTimersClearTimeout;
  #realTimersSetInterval;
  #realTimersClearInterval;
  #realTimersSetImmediate;
  #realTimersClearImmediate;
  #realPromisifiedSetImmediate;
}
```

They're here because when we call `reset`, these mocks need to stop existing. We have to update them with the original methods. So all of MockTimers is nothing more than a class that replaces `globalThis.<your object>` with an identical mock and stores the original value until you tell it to recover. Now things are simpler.

Let's add another property there that will be the descriptor of the `Date` object:

```js
//https://github.com/nodejs/node/blob/bb7fc653e9199c5b65a7ed268f9e827d049d7a81/lib/internal/test_runner/mock/mock_timers.js#L118

class MockTimers {
  // ... start of code here
  #nativeDateDescriptor // L118
  #now = kInitialEpoch; // L123
}
```

> [!IMPORTANT] 💡
> It's important to note that `Date` isn't a function, so we can't just store its value. Since it's an object, JavaScript will pass this variable by reference. We have to store the descriptor we get with `Object.getOwnPropertyDescriptor`.

When I started seeing how timeouts were implemented, I had an idea. Today they're being created each by a function, like this:

```js
  #setTimeout = FunctionPrototypeBind(this.#createTimer, this, false);
  #clearTimeout = FunctionPrototypeBind(this.#clearTimer, this);
  #setInterval = FunctionPrototypeBind(this.#createTimer, this, true);
  #clearInterval = FunctionPrototypeBind(this.#clearTimer, this);
  #clearImmediate = FunctionPrototypeBind(this.#clearTimer, this);
```

> An important detail is that Node can't use [primordials](https://github.com/nodejs/node/blob/bb7fc653e9199c5b65a7ed268f9e827d049d7a81/typings/primordials.d.ts#L49) (like `someFunction.bind(this)` directly, since that's implemented by the engine. So there are internal functions that go directly to the root of where these methods are executed (there in V8) and do the same thing, but with a different name. So `bind` would be `FunctionPrototypeBind`, but the idea is the same.

So I would follow the same pattern, and that's where our story begins.

### It's just a function

Our function that creates a date object is relatively simple:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
}
```

We create two initial objects. The first will be a constant associated with a [Symbol](https://medium.com/trainingcenter/javascript-symbols-decifrando-o-mist%C3%A9rio-383e359e64e3) that will represent the mocks object as a whole. We'll need this later because we need to return the current timestamp when [it's not used as a constructor](https://262.ecma-international.org/5.1/#sec-15.9.2) (like `Date()`). Remember, we need to access properties the user defined, like `kInitialEpoch`. This property appears early on, but it will only be used near the end of our function.

The second is the native Date constructor unchanged, because we'll need to return some functions that don't need mocks, for example `toString`.

Shortly after, we'll create a function inside this function. The idea is that we can create our mock object inside this function and return it to the user. We only do this because it needs to be able to create the date as an instance with `new Date`. This is only possible if we create a class or a function. Besides that, closures like this allow us to encapsulate our internal mocks code, keeping it private:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;
      ...
    }
}
```

Inside it we already pull our new constant that was defined above and create an object with its value.

> The whole section about the Symbol and kMock will be explained in a separate section further down, so you don't need to worry about understanding it here.

Let's treat the first and only different use case we have. When we call the static `now` property, the date isn't an instance, and we need to be able to identify that.

> [!NOTE] 🥵
> This was one of the hardest parts to code in this code because it's a type of metaprogramming where we're looking at an object's property as if we were the external agent. In other words, the object itself has to know if it was called as an instance or as a static method.

I looked at Sinon's [implementation](https://github.com/sinonjs/fake-timers/blob/a4c757f80840829e45e0852ea1b17d87a998388e/src/fake-timers-src.js#L456) a lot for this, along with two parts of the ECMA spec. First, [ECMA 262 edition 5.2, Section 15.9.2](https://262.ecma-international.org/5.1/#sec-15.9.2), which basically describes the behavior when we call the function as `Date()`. It needs to return **the full date in UTC as a string**.

![](./image-4.png)

Great, but how do I know it was called as a function? We can use `if (!(this instanceof MockDate))`, right? This should work because if the date isn't an instance of our mock object, then it's a function, which is the only other way to call it. So we just implement our result, which is the date as a string:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
    }
}
```

What we want to do is just return the real date as a string, but at a specific epoch. The epoch we defined as initial or the `now` the user passes to the mock. That's why we need the `kMock` and also the `NativeDateConstructor`. This way we can get the REAL date object and build it as if it were `new Date(Date.now())`, and then get the string representation.

[Unfortunately, that doesn't work.](https://github.com/nodejs/node/pull/48638#discussion_r1255170017) For several reasons, inside our function we'll have a big problem with `this` because it will enter an inconsistent state. But the most glaring issue is that `instanceof` [isn't reliable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#:~:text=Note%20that%20the%20value%20of%20an%20instanceof%20test%20can%20change%20if%20constructor.prototype%20is%20re%2Dassigned%20after%20creating%20the%20object%20\(which%20is%20usually%20discouraged\).%20It%20can%20also%20be%20changed%20by%20changing%20object%27s%20prototype%20using%20Object.setPrototypeOf.). We can fake an object's instance if we replace its prototype with whatever we want.

> Actually this is one of more than a dozen comments where we only discuss this. And it was the last problem I solved before merging the code, even though it's the first thing the function does.

After researching a LOT, I found another part of the more recent specification ([edition 14 section 21.4.2.1](https://262.ecma-international.org/14.0/#sec-date)) that says roughly how it should be implemented:

![](./image-5.png)

> Version 5.2 and version 14.0 of the specification are extensions of each other. Version 14 is the newest from 2023, while 5.2 is very old. Because of this, all specifications from 5.2 moved locations, but all the content from 5.2 exists in 14.

Here we have a clue about what to do. What is `NewTarget`? It's exactly a native property of any function or class that allows us to know the **execution context** of that object. It's represented as `new.target`, that is, the object that's in front of the `new` keyword. When we call Date as `new Date`, `new.target` will be a Date constructor. But when we execute `Date()` as a function, `new.target` is `undefined` because there's no `new` to have a target ([documentation here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target#syntax)). So now it's simple, we just replace our `instanceof`:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!new.target) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
    }
  }
```

From here on the implementation gets considerably simpler. The next step is knowing which [of the 11 ways to call date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#syntax) we're using. I simply copied Sinon's implementation for this and made some changes:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
      switch (arguments.length) {
        case 0:
          return new nativeDate(MockDate[kMock].#now);
        case 1:
          return new nativeDate(year);
        case 2:
          return new nativeDate(year, month);
        case 3:
          return new nativeDate(year, month, date);
        case 4:
          return new nativeDate(year, month, date, hours);
        case 5:
          return new nativeDate(year, month, date, hours, minutes);
        case 6:
          return new nativeDate(year, month, date, hours, minutes, seconds);
        default:
          return new nativeDate(year, month, date, hours, minutes, seconds, ms);
      }
    }
}
```

Remember that we have to count the number of arguments and that they're all positional. We only need to handle specific arguments. Because if the user is passing a specific date to us, we don't need to return the date they gave us, since they're creating a new object. So when we have 1 argument, it counts for both when we create an object from another object like `new Date(new Date())`, or a string `new Date('2024-05-10')`, or anything else. We're delegating to the original date the execution of this function.

Now that we've finished our `MockDate` function, we have to define all the extra properties that Date has (`toString`, `toISOString`, etc) because they'll stay the same and I don't want to implement everything by hand. However, our date object can't replace the prototype of our current object. So we'll remove the prototype and only associate the properties:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
      
      switch (arguments.length) {
        case 0:
          return new nativeDate(MockDate[kMock].#now);
        case 1:
          return new nativeDate(year);
        case 2:
          return new nativeDate(year, month);
        case 3:
          return new nativeDate(year, month, date);
        case 4:
          return new nativeDate(year, month, date, hours);
        case 5:
          return new nativeDate(year, month, date, hours, minutes);
        case 6:
          return new nativeDate(year, month, date, hours, minutes, seconds);
        default:
          return new nativeDate(year, month, date, hours, minutes, seconds, ms);
      }
  }

    // we remove the prototype
    const { prototype, ...dateProps } = ObjectGetOwnPropertyDescriptors(NativeDateConstructor);
    // we associate the properties
    ObjectDefineProperties(MockDate, dateProps);

}
```

The only method we have to replace is `now`, which always has to return what the user put in the mock. This is quite simple because now is a static method. We can simply do `MockDate.now = ...`:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
      
      switch (arguments.length) {
        case 0:
          return new nativeDate(MockDate[kMock].#now);
        case 1:
          return new nativeDate(year);
        case 2:
          return new nativeDate(year, month);
        case 3:
          return new nativeDate(year, month, date);
        case 4:
          return new nativeDate(year, month, date, hours);
        case 5:
          return new nativeDate(year, month, date, hours, minutes);
        case 6:
          return new nativeDate(year, month, date, hours, minutes, seconds);
        default:
          return new nativeDate(year, month, date, hours, minutes, seconds, ms);
      }
  }

  // we remove the prototype
  const { prototype, ...dateProps } = ObjectGetOwnPropertyDescriptors(NativeDateConstructor);
  // we associate the properties
  ObjectDefineProperties(MockDate, dateProps);

  // keeps this correct inside the function
  MockDate.now = function now() {
    return MockDate[kMock].#now
  }

}
```

The next step is a small change to prevent that when you do `Date.toString()`, you get the real native code which is `'﻿﻿function Date() { [native code] }'`, and not the implementation of our Mock code. Remember, it needs to be **INDISTINGUISHABLE** from a Date. For this we override the `toString` function with the original code:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
      
      switch (arguments.length) {
        case 0:
          return new nativeDate(MockDate[kMock].#now);
        case 1:
          return new nativeDate(year);
        case 2:
          return new nativeDate(year, month);
        case 3:
          return new nativeDate(year, month, date);
        case 4:
          return new nativeDate(year, month, date, hours);
        case 5:
          return new nativeDate(year, month, date, hours, minutes);
        case 6:
          return new nativeDate(year, month, date, hours, minutes, seconds);
        default:
          return new nativeDate(year, month, date, hours, minutes, seconds, ms);
      }
  }

  // we remove the prototype
  const { prototype, ...dateProps } = ObjectGetOwnPropertyDescriptors(NativeDateConstructor);
  // we associate the properties
  ObjectDefineProperties(MockDate, dateProps);

  // keeps this correct inside the function
  MockDate.now = function now() {
    return MockDate[kMock].#now
  }
  
  MockDate.toString = function toString() {
      return FunctionPrototypeToString(MockDate[kMock].#nativeDateDescriptor.value);
    };

}
```

We're nearing the end. Now we need to define the only property we've already used a lot but haven't defined yet, the `kMock`. Did you notice?

### kMock

The `kMock` is a symbol inside our implementation that's basically a reference to our overall Mocks object. This way we can get private properties like `#now` and the original date constructor. But it hasn't been defined until now. Won't that cause a serious problem?

Actually no, because whenever we called `MockDate[kMock]` we were inside a function. `MockDate` won't exist until the end of our `#createDate` function. So it's safe that we only define it at the end, especially because we need both the MockDate and the symbol for that. We only defined the symbol up there to hold the reference we're going to use. Because now we can do this here:

```js
  ObjectDefineProperties(MockDate, {
    __proto__: null,
    [kMock]: {
      __proto__: null,
      enumerable: false,
      configurable: false,
      writable: false,
      value: this,
    },

    isMock: {
      __proto__: null,
      enumerable: true,
      configurable: false,
      writable: false,
      value: true,
    },
  });
```

What we're doing here are two things. We're taking our `MockDate` function and creating properties on it. First, we're setting the prototype to null to avoid inheritance problems. Then we're saying that `[kMock]` is another object that's not enumerable, not modifiable, and can't be configured. In other words, it's completely immutable and pointing to `MockTimers`, which is the `this` in the context of `#createDate`.

Then we have another property that's my personal touch on this code. A way to know if this date is a mock instance by calling `MockDate.isMock`. This value is enumerable but not changeable. This is necessary sometimes when we're dealing with tests using multiple date mocks.

Our function looks like this so far:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
      
      switch (arguments.length) {
        case 0:
          return new nativeDate(MockDate[kMock].#now);
        case 1:
          return new nativeDate(year);
        case 2:
          return new nativeDate(year, month);
        case 3:
          return new nativeDate(year, month, date);
        case 4:
          return new nativeDate(year, month, date, hours);
        case 5:
          return new nativeDate(year, month, date, hours, minutes);
        case 6:
          return new nativeDate(year, month, date, hours, minutes, seconds);
        default:
          return new nativeDate(year, month, date, hours, minutes, seconds, ms);
      }
  }

  // we remove the prototype
  const { prototype, ...dateProps } = ObjectGetOwnPropertyDescriptors(NativeDateConstructor);
  // we associate the properties
  ObjectDefineProperties(MockDate, dateProps);

  // keeps this correct inside the function
  MockDate.now = function now() {
    return MockDate[kMock].#now
  }
  
  MockDate.toString = function toString() {
      return FunctionPrototypeToString(MockDate[kMock].#nativeDateDescriptor.value);
    };
  
  ObjectDefineProperties(MockDate, {
    __proto__: null,
    [kMock]: {
      __proto__: null,
      enumerable: false,
      configurable: false,
      writable: false,
      value: this,
    },

    isMock: {
      __proto__: null,
      enumerable: true,
      configurable: false,
      writable: false,
      value: true,
    },
  });
}
```

### Final touches

The final touch is setting the prototype of our `MockDate` to the original Date's prototype. This way we don't break applications from people doing `instanceof Date`. Besides that, we define the common global static methods we won't replace and return all our work:

```js
#createDate() { // L279
    kMock ??= Symbol('MockTimers');
    const NativeDateConstructor = this.#nativeDateDescriptor.value;
    // Our function that will be the mock
    function MockDate(year, month, date, hours, minutes, seconds, ms) {
      const mockTimersSource = MockDate[kMock];
      const nativeDate = mockTimersSource.#nativeDateDescriptor.value;

      if (!(this instanceof MockDate)) {
        return DatePrototypeToString(new nativeDate(mockTimersSource.#now))
      }
      
      switch (arguments.length) {
        case 0:
          return new nativeDate(MockDate[kMock].#now);
        case 1:
          return new nativeDate(year);
        case 2:
          return new nativeDate(year, month);
        case 3:
          return new nativeDate(year, month, date);
        case 4:
          return new nativeDate(year, month, date, hours);
        case 5:
          return new nativeDate(year, month, date, hours, minutes);
        case 6:
          return new nativeDate(year, month, date, hours, minutes, seconds);
        default:
          return new nativeDate(year, month, date, hours, minutes, seconds, ms);
      }
  }

  // we remove the prototype
  const { prototype, ...dateProps } = ObjectGetOwnPropertyDescriptors(NativeDateConstructor);
  // we associate the properties
  ObjectDefineProperties(MockDate, dateProps);

  // keeps this correct inside the function
  MockDate.now = function now() {
    return MockDate[kMock].#now
  }
  
  MockDate.toString = function toString() {
      return FunctionPrototypeToString(MockDate[kMock].#nativeDateDescriptor.value);
    };
  
  ObjectDefineProperties(MockDate, {
    __proto__: null,
    [kMock]: {
      __proto__: null,
      enumerable: false,
      configurable: false,
      writable: false,
      value: this,
    },

    isMock: {
      __proto__: null,
      enumerable: true,
      configurable: false,
      writable: false,
      value: true,
    },
  });
  
  MockDate.prototype = NativeDateConstructor.prototype;
  MockDate.parse = NativeDateConstructor.parse;
  MockDate.UTC = NativeDateConstructor.UTC;
  MockDate.prototype.toUTCString = NativeDateConstructor.prototype.toUTCString;
  return MockDate;
}
```

## Mock methods

Now that we have the main mock, we can define the other functions that come with it. First we need to modify our [`enable`](https://github.com/khaosdoctor/node/blob/8991402b81d24e7479dff2e076147c19ecc07bb8/lib/internal/test_runner/mock/mock_timers.js#L644) method so it can also accept the new API. The modification we'll make here is basically validation:

```js
// we create `now` as a parameter in the options
enable(options = { __proto__: null, apis: SUPPORTED_APIS, now: 0 }) {
  // we clone the options object
  const internalOptions = { __proto__: null, ...options };

  // ... original code

  // we set the value if it doesn't exist
  if (!internalOptions.now) {
    internalOptions.now = 0;
  }

  // If APIs isn't passed, we'll have all enabled
  if (!internalOptions.apis) {
    internalOptions.apis = SUPPORTED_APIS;
  }

  // ... Original code

  // Now can be a Date instance so we check for that
  if (this.#isValidDateWithGetTime(internalOptions.now)) {
    this.#now = DatePrototypeGetTime(internalOptions.now);
  } 
  // Otherwise it's a number
  else if (validateNumber(internalOptions.now, 'initialTime') === undefined) {
    this.#assertTimeArg(internalOptions.now);
    this.#now = internalOptions.now;
  }

  this.#toggleEnableTimers(true);
}
```

Our [`#isValidDateWithGetTime`](https://github.com/khaosdoctor/node/blob/8991402b81d24e7479dff2e076147c19ecc07bb8/lib/internal/test_runner/mock/mock_timers.js#L512) function doesn't really check if it's a Date instance. Actually it only checks if that object has a `getTime` property, which is what we need to use:

```js
#isValidDateWithGetTime(maybeDate) { // L512
  try {
    DatePrototypeGetTime(maybeDate);
    return true;
  } catch {
    return false;
  }
}
```

Our [`#toggleEnableTimers`](https://github.com/khaosdoctor/node/blob/8991402b81d24e7479dff2e076147c19ecc07bb8/lib/internal/test_runner/mock/mock_timers.js#L522) function is basically a large object with two properties: `toFake` and `toReal`. It contains the functions we need so we can convert the object to mock and back to native:

```js
#toggleEnableTimers(activated) { // L522
  const options = {
    __proto__: null,
    toFake: {
      __proto__: null,
      // ... original timeout code
      Date: () => {
        this.#nativeDateDescriptor = ObjectGetOwnPropertyDescriptor(globalThis, 'Date')
        // the magic happens here
        globalThis.Date = this.createDate()
      }
    },
    toReal: {
      __proto__: null,
      // ... timers
      Date: () => {
        ObjectDefineProperty(globalThis, 'Date', this.#nativeDateDescriptor)
      }
    }
  }

  const target = activate ? options.toFake : options.toReal
  ArrayPrototypeForEach(this.#timersInContext, (timer) => target[timer]())
  this.#isEnabled = activate
}
```

Besides this, we have three other mock timer methods: `setTime`, which is exclusive to dates, and `tick` and `runAll`.

The [`setTime`](https://github.com/khaosdoctor/node/blob/8991402b81d24e7479dff2e076147c19ecc07bb8/lib/internal/test_runner/mock/mock_timers.js#L690C1-L696C4) will change the value of `#now`, so it's quite straightforward:

```js
setTime(time = kInitialEpoch) { // L690
  validateNumber(time, 'time');
  this.#assertTimeArg(time);
  this.#assertTimersAreEnabled();

  this.#now = time;
}
```

The [`tick`](https://github.com/khaosdoctor/node/blob/8991402b81d24e7479dff2e076147c19ecc07bb8/lib/internal/test_runner/mock/mock_timers.js#L613) already existed, but we need to make a small modification. This method advances time by a certain number of milliseconds, so we have to advance `#now` as well:

```js
tick(time = 1) { // L613
  // ... validation code 

  this.#now += time;
  
  // ... rest of the code unchanged
}
```

The last method is [`runAll`](https://github.com/khaosdoctor/node/blob/8991402b81d24e7479dff2e076147c19ecc07bb8/lib/internal/test_runner/mock/mock_timers.js#L728), which had a small change in another file. The idea of this method is to run all scheduled timers. For that we use a structure called `PriorityQueue`, which is basically a queue sorted by time. The timer with the smallest timeout is at the top and the one with the largest timeout is at the bottom.

The PriorityQueue is defined at `lib/internal/priority_queue.js`. It already had a method called `peek` that gets the first item from the queue without removing it. We need to get the last one because now we need to know which timer has the longest time. We subtract it from the time that has already passed (our `#now`) and call the `tick` method with that subtraction. This way we run all timers without adding extra time to our date (because now `tick` is adding milliseconds to our `#now`). For this I created a method called [`peekBottom`](https://github.com/nodejs/node/pull/48638/files#diff-21786c167d9eed3034877e03e9bc8640bf6bcf2b7c5b33980226d76e3a69d4bdR41-R44).[^n2]

The implementation itself is quite straightforward:

```js
runAll() { // L728
  this.#assertTimersAreEnabled();
  const longestTimer = this.#executionQueue.peekBottom();
  if (!longestTimer) return; // empty queue
  // Advances the time
  this.tick(longestTimer.runAt - this.#now);
}
```

## And that's it?

That was the end of the timers implementation. But the work wasn't done. Since the article is already long, I won't post much more about that. The tests for this feature were another matter entirely. In total I must have spent at least 13 hours on this project, plus about 3 months on comments, resolutions, and everything else. In the end, this feature was implemented in Node version 21.2 (there's even a [post](/node-21-2/) explaining how to use it).

![](./image-8.png "You can see I was pretty happy")

Also, if you look at the PR history, you'll see that I spent days fighting GitHub's CI because there were so-called flaky tests that were fixed by Yagiz some time later.

![](./image-7.png "I was going crazy by that point")

These flaky tests were keeping my application from getting a green signal, but the errors had nothing to do with the code I changed. That's why it's so important that contributors like us can help with test coverage and process verification.

## Conclusion

It was a long article, but I wanted to bring this content here because I want to show you that it's definitely possible to participate in large open source projects and make a difference, even with small contributions like this one.

The process of contributing to a large project is complex. It involves many, many variables and many days and weeks of conversation with everyone. But it's extremely challenging and rewarding when everything comes to an end!

I hope you felt inspired to try contributing to Open Source!

See you!

[^n1]: I won't go into detail about what mocks are here, but you can learn more about them in this [article](https://medium.com/trainingcenter/testes-unit%C3%A1rios-mocks-stubs-spies-e-todas-essas-palavras-dif%C3%ADceis-f2765ac87cc8) (old, but still relevant)

[^n2]: I won't put this PriorityQueue implementation here, but the [link](https://github.com/nodejs/node/pull/48638/files#diff-21786c167d9eed3034877e03e9bc8640bf6bcf2b7c5b33980226d76e3a69d4bdR41-R44) above will take you there
