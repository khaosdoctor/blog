---
title: "Safer code with Shadow Realms in JavaScript"
pubDate: 2022-06-21T13:00:00.000Z
updatedDate: 2026-07-16T16:08:44.000Z
category: "javascript"
tags: ["javascript", "nodejs", "ecmascript", "development"]
lang: en
description: "One of the most interesting proposals in JavaScript recently has been making waves. Learn what shadow realms are and how it will be possible to execute code more securely."
seoDescription: "One of the most interesting proposals in JavaScript recently. What are shadow realms and how do they improve your code security!"
slug: "shadow-realms-in-javascript"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

JavaScript has always been and continues to be a highly dynamic language. Because of that, I'm starting a new series of articles where I'll discuss increasingly about new proposals and possible features of this incredible ecosystem!

Today's choice is a proposal being driven forward by none other than our great representative at TC39, [Leo Balter](https://twitter.com/leobalter), along with many other incredible people, and it's called [ShadowRealm](https://github.com/tc39/proposal-shadowrealm).

## A bit of context

When we're talking about the web, we always need to keep in mind that it's like a blank slate, meaning we have a lot of room to create and experiment with almost everything.

One of the most common things we have out there are extensible applications, for example, those where you can create your own code to extend existing functionality, like plugins.

The big problem with this type of application is that we need to run the application's own code, called _core_, together with the user's or plugin code. And in JavaScript, this shares the same global object called [Window](https://developer.mozilla.org/en-US/docs/Web/API/Window), meaning virtually all code is running in the same place, and there's nothing preventing the plugin from accessing sensitive user information, for example.

On the other hand, this type of behavior is what makes applications like jQuery possible, because being in a global environment allows us to create shared objects and also extend standard functionality, like the `$` that jQuery injected into the global object, or modifying the `Array.prototype.pop` method are among the most common things these old libraries did.

Sounds like a security problem, doesn't it?

## Enter ShadowRealm

Realm, in English, is the word that defines a "kingdom". These days we don't have many kingdoms around, but imagine those are countries. And just like countries have their own problems, borders, laws, etc., realms also have their own "world".

A `ShadowRealm` creates another execution context, meaning a new place within the same code with its own global object and its own internal objects (like its own `Array.prototype.pop`), which means we can run code within that place without interfering with external code. It's like we're isolating the code in a separate location.

This feature will always execute code synchronously, which allows virtualization of all DOM APIs that run within it:

```js
const shadowRealm = new ShadowRealm()

shadowRealm.evaluate('globalThis.x. = "Um novo lugar"')
globalThis.x = "root"

const shadowRealmEval = shadowRealm.evaluate('globalThis.x')

shadowRealmEval // Um novo lugar
x // root
```

In this code we're creating a property `x` both in the ShadowRealm and outside of it, with two different values, and we can see that these values are indeed isolated from each other.

It's important to note that a ShadowRealm instance can only transfer primitive data: String, Number, BigInt, Symbol, Boolean, undefined, and null. Any other type of data, like objects, is not allowed. And this is quite important to maintain cohesion and separation of environments, since objects carry references to where they were created, meaning passing an object into a ShadowRealm could leak a higher scope into an internal scope.

However, a ShadowRealm can share functions and values returned by those functions, and this allows quite robust communication between the two parts:

```js
const sr = new ShadowRealm()

const srFn = sr.evaluate('(x) => globalThis.value = x')
srFn(42)
globalThis.value // undefined
sr.evaluate('globalThis.value') // 42
```

There are other cool examples of basic ShadowRealms usage [in the original blog post by the authors](https://developer.salesforce.com/blogs/2022/04/introducing-shadowrealm) that's really neat!

## External value injection

ShadowRealms allow us to execute arbitrary functions and code with the `evaluate` command, which takes a string as a parameter and works like a somewhat safer version of `eval`, but it's still subject to [Content Security Policies (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) in the browser, so a CSP of `unsafe-eval` would disable this functionality.

To inject code directly into a ShadowRealm, it also has the `importValue` method, which basically works like an `import()` within the code to load a module and capture an exported value.

```js
const sr = new ShadowRealm()
const specifier = './spec-file.js'
const name = 'sum'

const shadowSum = await sr.importValue(specifier, name)
shadowSum(1) // Executa a operação e captura o resultado
```

Basically, `await sr.importValue` is a promise that will be resolved with the `name` value imported from `specifier`, so if the specifier is:

```js
//spec-file.js
const sum = (a,b) => a+b

export { sum }
```

We'll have the `sum` function in `shadowSum`.

Additionally, it's important to note that values imported by `importValue` are **always** relative to the ShadowRealm they're inserted into, so, taking another example from the authors' blog post, imagine that instead of being a simple sum function, `spec-file.js` modified `globalThis`:

```js
globalThis.total = 0;

export function sum(n) {
  return globalThis.total += n;
}

export function getTotal() {
  return globalThis.total;
}
```

If we had local code executing the function inside a ShadowRealm, the `globalThis` would be the object **inside** the ShadowRealm, not the `globalThis` of the global scope outside the ShadowRealm:

```js
const sr = new ShadowRealm();

const specifier = './spec-file.js';

const [ shadowSum, shadowGetTotal ] = await Promise.all([
    sr.importValue(specifier, 'sum'),
    sr.importValue(specifier, 'getTotal')
]);

globalThis.total = 0; // Escopo local fora do SR

shadowSum(10); // 10
shadowSum(20); // 30
shadowSum(30); // 60

globalThis.total; // 0
shadowGetTotal(); // 60

// Agora estamos importando no escopo local
const { sum, getTotal } = await import(specifier);

sum(42); // 42
globalThis.total; // 42

// O valor interno é preservado
shadowGetTotal(); // 60
```

## Implications of ShadowRealms

While this API is still a proposal, it already greatly improves how we work with sandboxed code, when we execute code in separate environments, today this is done with iFrames, which is the only relatively good way to separate two contexts in the same place.

However, with SRs, it's possible that we have an even greater capacity to execute not just simple functions, but it's possible we can execute test code in isolated environments completely separating responsibilities, so unit tests, integration tests, or anything else, won't interfere with each other.

Going even further, it would still be possible to run entire applications within other applications as long as those applications are optimized and prepared to work with message models, anyway, the possibilities are many and quite exciting!

## Conclusion

If you want to stay on top of this and many other news from JS, Node, and technology in general with curated content and at the right pace, don't forget to subscribe to [my newsletter](https://news.lsantos.dev) to receive the best content every month!
