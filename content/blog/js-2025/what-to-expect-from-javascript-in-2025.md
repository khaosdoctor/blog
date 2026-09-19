---
title: What to Expect from JavaScript in 2025
pubDate: 2024-07-24T11:00:49.000Z
updatedDate: 2026-07-16T17:54:37.000Z
category: typescript
tags:
  - ecmascript
  - javascript
  - development
lang: en
description: What to expect from JavaScript in 2025? Learn about the major proposals and features you may receive in the future!
slug: what-to-expect-from-javascript-in-2025
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Every year the committee that oversees ECMAScript, known as TC39, meets to discuss major changes and to advance, approve, or reject existing [proposals](https://github.com/tc39/proposals).

In this article I'll show you what happened at this year's meeting which was in Finland (quite close), the proposals that were discussed, but I also want to go through some other proposals that exist in the repository and make my bet on what I think will actually become reality in the next version of the specification!

Before anything, if you have no idea what I'm talking about, I made a complete video a few years ago explaining exactly how this whole process works, including the history behind JavaScript and the ECMA and TC39 names:

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

## [Lazy Module Initialization](https://github.com/tc39/proposal-defer-import-eval)

This proposal was moved to stage 2.7 (which is almost a stage ready for implementation).

> This was actually the old name of the proposal, it underwent a change and is now called "Deferred Import Evaluation"

This is a proposal that won't have much visual effect in code, but it will allow module declarations to be deferred to be executed later, this can create a very good performance effect, especially in modules that don't need to load right at the beginning of the application.

The technique of "not executing" something is an optimization technique well known to every JS dev. So imagine if you could defer the execution of your heaviest module to only when it's used. This could save you many seconds and CPU cycles.

The syntax of this proposal adds a `defer` keyword in front of module declarations:

```js
// a
import "b";
import defer * as c from "c"

setTimeout(() => {
  c.value
}, 1000);
```

In this example, module `b` will be loaded first and only when `c.value` is used will it be loaded.

> [!CAUTION] ⚠️
> It's important to remember that top-level-await cannot be executed in what we call __deferred initialization__ because the execution of the module that has top-level-await has no way to know if the module it's using will respond now or later, in other words, if there's top-level-await, you can't use `import defer`

## [Error.isError](https://github.com/tc39/proposal-is-error)

This is an interesting feature that, if you think about it, has quite an impact, it was moved to stage 2.

The rationale for this proposal is that when we're executing scripts in two different domains, the errors we throw in one domain are not the same instance as an error in another domain.

> By domain here I'm not talking about websites and URLs, but about execution domains (scopes), for example, a window with an iFrame inside has two execution scopes (or two domains), one for the main page and the domain executing the iFrame

The proposal for `Error.isError` is quite simple, it checks if the error in question is a native error and returns a boolean (there's [a case](https://tc39.es/proposal-is-error/#sec-iserror) where it also throws) regardless of the domain where it's being executed.

To illustrate this, imagine we have a main window `jPrincipal` and an iframe `jIframe`. If we throw inside the iFrame, the error will be propagated to the main window because that's where the error handlers are, but if we have a check like `jIframeError instanceof Error` we'll get an error (ironic), because the reality is that the `Error` instance inside the iFrame is different from the `Error` instance in `jPrincipal`.

> This is because all objects, regardless of where they are, will always be passed as memory references in JavaScript, so the reference is always different

For this check to work we would have to compare it like this:

```js
jIframeError instanceof document.getElementsByTagName('iframe')[0].contentWindow.Error
```

Or, with `isError`:

```js
if (Error.isError(jIframeError) { ... }
```

## [RegExp Escaping](https://github.com/tc39/proposal-regex-escaping/)

This proposal advanced to stage 2, and it's probably the best proof that any proposal at any time can be approved or even considered, since it started as an [idea](https://simonwillison.net/2006/Jan/20/escape/) posted by a guy in January 2006, which created a [discussion](https://esdiscuss.org/topic/regexp-escape) in 2010 and is now being implemented.

The basic idea of this proposal is quite simple and quite useful. When we're creating a RegExp in JavaScript, anything we put in there will be interpreted as a valid regular expression, for example:

```js
const s = "Eu quero arquivos com a extensão *.*"
console.log(s.replace(new RegExp("*.*", "g"), ".pdf"))
```

This function will give an error: "Nothing to Repeat". This is because you need to escape the characters, since `*` and `.` are reserved in RegExp. So you can do something like:

```js
const s = "Eu quero arquivos com a extensão *.*"
console.log(s.replace(new RegExp("\\*\\.\\*", "g"), ".pdf"))
```

And now we have "Eu quero arquivos com a extensão .pdf".

With this new proposal the idea is to do:

```js
const s = "Eu quero arquivos com a extensão *.*"
console.log(s.replace(new RegExp(RegExp.escape("*.*"), "g"), ".pdf"))
```

## [Promise.try](https://github.com/tc39/proposal-promise-try)

Another simple idea that's basically a shortcut for something we already do today is wrapping a function in a promise. What happens with JavaScript (usually not with TypeScript) is that we're executing an external function that may or may not be a [Promise](https://dev.to/_staticvoid/series/1993).

Today, to avoid having to know those details, we can simply do it like this, imagine that `f` is my function that I don't know if it's a promise:

```js
Promise.resolve().then(f)
```

What this does is create an already resolved Promise and then execute the function `f`, returning a _thenable_ (a value we can chain with `.then`), but all of that only happens in the next execution of the event loop.

To be able to do all of this execute in the same tick, we can have a more direct approach:

```js
new Promise((resolve => resolve(f()))
```

It will create a promise that will execute `f` in the same tick of its first `then`.

The proposal that is now at stage 3, meaning it's very likely to be implemented this year or next year. The idea is to create `Promise.try`:

```js
Promise.try(f).then(() => ...)
```

Which does the same thing as before.

## Other interesting proposals

Besides these proposals, there are other proposals that were also discussed, but they didn't reach a stage that could be more advanced yet. Apart from some others that stayed in the same place, let's talk about those first:

### Proposals that stayed in the same place

-   [Async Iterators](https://github.com/tc39/proposal-async-iterator-helpers) (2): A sequence of helper methods for Async Iterators (which I already talked about [here](/async-iterators-js/))
-   [Base64](https://github.com/tc39/proposal-arraybuffer-base64) (3): Something I've needed many times, converting ByteArrays (UInt8Arrays, SharedArrays) to base64 and vice versa, today we don't have a native method.
-   [Cancellation](https://github.com/tc39/proposal-cancellation/) (1): Ability to cancel promises mid-flight
-   [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) (3): This is the proposal for [Using](/ts-using/) that's at stage 3
-   [Intl.DurationFormat](https://github.com/tc39/proposal-intl-duration-format) (3): Part of the effort to localize the Web using a native way to transform time into duration.
-   [Intl.MessageFormat](https://github.com/tc39/proposal-intl-messageformat/issues/58) (1): The same as before but for arbitrary texts to be converted and interpolated with variables.
-   [ShadowRealm](https://github.com/tc39/proposal-shadowrealm) (2): A way to execute user code in a separate domain (I talked about it [here](/shadow-realms/))
-   [Shared struct](https://github.com/tc39/proposal-structs) (1): The ability to add immutable objects (structs) in JS
-   [Signals](https://github.com/tc39/proposal-signals) (1): A way to work with state (à la React) natively with a single protocol
-   [Smart Units](https://github.com/tc39/proposal-smart-unit-preferences) (1): Another one from the localization effort, intending to add units automatically according to the locale
-   [Source Maps](https://docs.google.com/presentation/d/1H6nu-Q0FllP2rsnCRxepiB_iBgsA0TMba5FGntDL5fg/edit?usp=sharing) (0): Creates a formal specification for the (already existing) sourcemaps.
-   [Temporal](https://github.com/tc39/proposal-temporal) (3): The proposal for the new JavaScript date API (details [here](/temporal-api/))

### Proposals that had or may have advances

-   [Atomics.pause](https://github.com/syg/proposal-atomics-microwait) (2.7): A way to pause execution in the form of micropauses for operations that require a lock
-   [Decimal](https://github.com/tc39/proposal-decimal) (1): The proposal that intends to add correct decimal numbers (finally) to JavaScript
-   [ESM Phase Imports](https://github.com/tc39/proposal-esm-phase-imports) (2): Allows customizations when loading modules in JS
-   [Iterator Sequencing](https://github.com/tc39/proposal-iterator-sequencing) (2): Allows concatenating two iterators into one so that values are sequential with each other.
-   [Joint Iteration](https://github.com/tc39/proposal-joint-iteration) (2.7): A new method to execute iterators synchronously with each other, the famous `zip` method from lodash
-   [Discard Bindings](https://github.com/tc39/proposal-discard-binding) (2): An interesting proposal that proposes a syntax for variables that won't need to be associated with any memory address, including those we want to discard from destructuring of Arrays and objects.

## Predictions

As always, I'll make some predictions (which could be completely wrong) for what I think could come in the next version of ECMAScript, let's go.

I, personally believe that some of these proposals **won't move** for a long time, two of them **Decimals** and **Temporal** I'm almost sure will stay the way they are (Decimals can advance one or two stages), because they are very large proposals to be implemented in a year (Temporal itself has been there for about 7).

That said, I believe **Source Maps** can get a boost this year since we're starting to see various runtimes like Node Test Runner, Vitest and several others using this standard, so it's possible that this use will end up pushing the proposal forward. But I'm sure it won't see the light of day for a long time.

Other proposals that I believe **may come** in the next version (but with less certainty) are:

-   **Async Iterator Helpers**: Simpler implementations and extra methods are usually added because they don't break the previous spec
-   **Shadow Realm**: With conversations about "realms" intensifying (with Error.isError itself), I think it's quite likely that this proposal will also be passed
-   **Signals**: The community is making a lot of noise about this proposal, but it's at a very early stage to be sure it would come in the next version, very likely not
-   **Phase Imports**: Import management and module loading is very high mainly because of WASM and runtimes like Deno
-   **Deferred Imports**: The same reason as before
-   **Error.isError**: Implementing something like this is not complex, and therefore I think it can be passed
-   **Base64**: Similarly, this is a method that has been requested for a long time and is a relatively primitive function.

Now, other proposals I'm almost certain will be in the next version of the spec

-   Promise.try
-   RegExp.escape
-   Explicit Resource Management
-   At least one of the Intl methods

Let's see if these predictions hold true, if you have different opinions, don't forget to comment on my [social networks](https://lsantos.dev) or call me on [X](https://twitter.lsantos.dev) to exchange ideas!
