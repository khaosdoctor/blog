---
title: '"Pipeline operators in JavaScript"'
pubDate: 2022-04-04T14:00:00.000Z
updatedDate: 2026-07-16T16:10:07.000Z
category: javascript
tags:
  - javascript
  - ecmascript
  - development
lang: en
description: '"Learn everything about the proposal gaining significant adoption in ECMAScript, the pipeline operators."'
slug: pipeline-operators-in-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

**JavaScript** is always evolving, and [a](/js-tipos-proposal/)[s](/js-tipos-proposal/) is [customary](/novos-tipos-js/), I'll write about another one of the [proposals](https://github.com/tc39/proposal-pipeline-operator#tacit-unary-function-application-syntax) that's gaining adoption in the community. These are **pipeline operators**. This proposal is currently at stage 1, which is very early in the process, but it's been dragging on for [roughly 6 years](https://github.com/tc39/proposal-pipeline-operator/commit/3d4e985dba6e2a5b2bdc1999268537e2071131b6). Although you can test it online using [Babel](https://babeljs.io/repl#?browsers=&build=&builtIns=false&corejs=false&spec=false&loose=false&code_lz=MYewdgzgLgBAZgSzAQwDYwLwwNoHICyApjBAgObK4C6MAUAD4B8MApAHShjDJQAUeKCDABOhACaEhEEMATIEEagEoGzdp2588IAK4xCAW1wAaGLgAWUKAAcIALgD0D1BGRgoICGwkA3ZatY2ACsQJF5cMxUmGE5pVEI2VBAyXhYlIA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=true&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=env%2Cstage-1&prettier=true&targets=Node-16&version=7.17.8&externalPlugins=%40babel%2Fplugin-syntax-typescript%407.16.7%2Cbabel-plugin-const-enum%401.2.0&assumptions=%7B%7D).

If you still don't know how JavaScript works and how it evolves, I invite you to watch my video explaining a bit about this topic:

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

This [is not the first time](https://github.com/tc39/proposal-pipeline-operator#tc39-has-rejected-f-pipes-multiple-times) pipeline operators have been suggested for the language (actually, it's the third), but now it could be a bit different because we have another set of information we can use to complete this puzzle.

## What is the proposal

Pipeline operators can be translated as **flow operators**, and the idea is basically the same as the `.pipe` function we have in streams (which I've already explained [here](https://imasters.com.br/back-end/streams-no-node-js-o-que-sao-streams-afinal-parte-01), [here](https://imasters.com.br/back-end/streams-no-node-js-o-que-sao-streams-afinal-parte-02), and [here](https://imasters.com.br/back-end/streams-no-node-js-o-que-sao-streams-afinal-parte-03)). Essentially, how they work is by making function calls, passing the output of one function to the input of another, much like what the bash `|` does, for example.

The main difference is that, unlike `|`, which only accepts **unary functions**, that is, functions that have a single input parameter (like `(x) => {}`), pipe operators should be able to accept any kind of operation.

To understand a bit better how these operators work and why they were suggested in the language, we first need to understand two programming styles and two ways of writing code, **deep nesting** and **fluent interfaces**. And then learn a bit about the history behind **functional languages**.

## Deep Nesting

When we're talking about pipelines, we're basically talking about sequential function executions, that is, the result of one function or expression is passed to the next, like a cake recipe, where after each step, we take what we already have and pass it to the next phase of the process until we have a final result.

A great example of this is the `reduce` function on arrays, which essentially applies the same function consecutively over a set of values that is modified, passing the result of the previous execution to the next:

```js
const numeros = [1,2,3,4,5]
numeros.reduce((atual, acumulador) => acumulador + atual, 0)
// 1 => { atual: 1, acumulador: 0 }
// 2 => { atual: 2, acumulador: 1 }
// 3 => { atual: 3, acumulador: 3 }
// 4 => { atual: 4, acumulador: 6 }
// 5 => { atual: 5, acumulador: 10 }
// 6 => { atual: undefined, acumulador: 15 }
// 7 => resultado 15
```

This can also be done with what is called nesting, which is when we pass a function execution to another consecutively. So imagine we had the sum we used in the `reduce` earlier, we could represent that same function through:

```js
function soma (a, b) { return a + b }
soma(5, 
     soma(4, 
          soma(3, 
               soma(2, 
                    soma(1, 0)
                   )
              )
         )
    )
```

I think it's easy to understand what the problem is here. Deep nesting, together with [currying](https://en.wikipedia.org/wiki/Currying), are techniques that, although they are also quite used in object-oriented languages, are much more common in languages that have more functional approaches like [Hack](https://en.wikipedia.org/wiki/Hack_\(programming_language\)), Clojure, and [F#](https://en.wikipedia.org/wiki/F_Sharp_\(programming_language\)). This is because these languages, as the name itself says, are based on functions to work with data in a way that's a bit more like the system known as [Lambda Calculus](https://en.wikipedia.org/wiki/Lambda_calculus) in mathematics.

The point is that deep nesting is very hard to read because we don't know where the initial data is coming from, and also because reading needs to start from inside to outside (or from right to left), because we need to know the result of the first function passed to be able to infer the result of the last call.

On the other hand, deep nesting is applicable to practically all types of expressions. We can have arithmetic operations, arrays, `await`, `yield`, and all kinds of things. For example, the previous function could (and probably will, in the [compiler](https://dev.to/khaosdoctor/node-js-por-baixo-dos-panos-10-otimizacoes-do-compilador-39oi)) be written like this:

```js
const resultado = (5 + 
 (4 + 
  (3 + 
   (2 + 
    (1 + 0)
   )
  )
 )
)
```

Currying is when we have functions that are unary by nature, so when we want to compose something, we return a function that will call another function. This way we can compose the two functions as if they were two calls. For example, a function that multiplies two numbers:

```js
const multiplicaDois = x => y => x * y
const resultado = multiplicaDois(5)(2) // -> 10
```

Although currying is elegant, it's a bit costly because we have to type much more, and besides that, longer and more complex functions end up being harder to read by anyone. Still, currying is widely used, especially by libraries like [Ramda](https://ramdajs.com), which are designed for currying from the start.

But there's another form of writing that most of us are already a bit familiar with: **fluent interfaces**.

## Fluent Interfaces

You've probably come across fluent interfaces at some point in your life, even if you didn't know what we were talking about. If you ever used jQuery or even the most common array functions in JavaScript, you've already used a fluent interface.

This type of design is also called **method chaining**.

The big idea behind fluent interfaces is that you don't need to call the object again to run a different, but subsequent, function with the same data from your original object. For example:

```js
const somaDosImpares = [1, 2, 3]
	.map(x => x * 2)
	.filter(x => x % 2 !== 0)
	.reduce((prev, acc) => prev+acc, 0)
```

The biggest example of this architectural model to date is jQuery, which consists of a single mega main object called `jQuery` (or `$`) that receives dozens and more dozens of child methods that return the same main object, so you can chain all of them. This also looks a lot like a design pattern called **[builder](https://imasters.com.br/javascript/design-patterns-com-javascript-typescript-padroes-criacionais).**

Notice that I'm not calling my array again; I'm simply **chaining** (hence the term "chaining") the methods of this array one after another, and I have the closest we have today to an interface that is both highly readable and also mimics the flow behavior we want to obtain with pipeline operators.

The problem is that the applicability of this method is limited because it's only possible if you're working in a paradigm that has functions designated as methods for a class, that is, when we're working directly with object orientation.

However, when it is applied, the reading and usability become so easy that many libraries do that "workaround" in the code just to be able to use method chaining. Think about it, when we have this type of design:

-   Our code flows from left to right, as we're used to
-   All expressions that could suffer from nesting end up at the same level
-   All arguments are grouped under the same main element (which is the object in question)
-   Code editing becomes trivial because if we need to add more steps, we just include a new function in the middle; if we need to remove one, we just delete the line

The biggest problem is that we can't accommodate all interfaces and function types within this same design, because we can't return arithmetic expressions (like `1+2`) or `await` or `yield`, nor object literals or arrays. We'll always be limited to what a function or method can do.

## Then come the pipe operators

Flow operators combine the two worlds and improve the applicability of both models in a more unified and easier-to-read interface. So instead of having a bunch of nested methods or a bunch of functions, we can simply do this:

```js
const resultado = [1,2,3].map(x => x*2) |> %[0] // => 2
```

The syntax is simple: on the left of the `|>` operator we have any expression that produces a value. That produced value will be thrown into a placeholder (or temporary object) which, for now, is `%`, that is, the `%` is the result of what is on the **left** of `|>`. And then, on the right of the operator, we have the transformation done with the result obtained. The final result of these two expressions is the output and will be what is assigned to `resultado`.

If you analyze it using [Babel](https://babeljs.io/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&corejs=3.21&spec=false&loose=false&code_lz=MYewdgzgLgBFICECGECmA2ALDAvDAFACYCUuAfDAgK4BmNqATgHQ0MgC2RxT8AylAwCWYAOb4A5ACMUGTOOIAoBaEixpaACqoAHrDziAFlCgAHCAC4A9JYA2EJGHgQmhVADdxMAD4UApDxAAVRMTRgBhGXxSHzhEGSx8X2IgA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=true&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Cstage-0&prettier=false&targets=Node-16&version=7.17.8&externalPlugins=&assumptions=%7B%7D), for the code below:

```js
const toBase64 = (d) => Buffer.from(d).toString('base64')

const baseText = 'https://lsantos.dev' 
|> %.toUpperCase() 
|> toBase64(%)
```

We'll get the following output:

```js
"use strict";

const toBase64 = d => Buffer.from(d).toString('base64');

const baseText = toBase64('https://lsantos.dev'.toUpperCase());
```

Similarly, if we use functions with currying, babel will be able to decipher this information and create a valid representation.

Currently, there are two most famous implementations of pipe. The first is from F#, a functional programming language created by Microsoft based on OCaml. The second is from Hack, a language created by Facebook a while ago which is, essentially, PHP with static types.

The biggest difference between the operators is that, in the case of the Hack version, it accepts any kind of expression as a valid operator both for the left and right side of the expression through the special variable `%`.

So we can do literally anything:

```js
value |> someFunction(1, %, 3) // function calls
value |> %.someMethod() // method call
value |> % + 1 // operator
value |> [%, 'b', 'c'] // Array literal
value |> {someProp: %} // object literal
value |> await % // awaiting a Promise
value |> (yield %) // yielding a generator value
```

In the case of F#, on the other hand, we're a bit more limited to functions that are unary, so the variable `%` doesn't exist. This means we always need to have some kind of function on the right side of the operator:

```js
const f = soma(1,2) |> x => soma(x, 3)
```

For reasons explained [here](https://2ality.com/2022/01/pipe-operator.html), among others, the proposal is mainly focused on being able to apply the Hack model to JavaScript and not the F# model.

## Conclusion

For now, this operator is still trying to become reality, but there are already plans described [in this section](https://github.com/tc39/proposal-pipeline-operator#possible-future-extensions) that show that some other options for extending the operator are already under analysis, like conditional and optional operators using `if` or `?`, and loop operators with `for of`, in addition to using this operator with `catch`.

There is no date or horizon yet for this proposal to be put into practice, but there are many eyes on what's happening!
