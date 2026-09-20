---
title: Meet SparkPlug, the new JS compiler for V8
pubDate: 2021-08-17T20:16:48.000Z
updatedDate: 2026-07-16T16:13:06.000Z
category: technology
tags: ["javascript", "nodejs", "architecture"]
lang: en
description: Meet the reason for a 15% performance boost in V8-based browsers and how it will change your code!
slug: meet-sparkplug-the-new-v8-js-compiler
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

JavaScript is a box of surprises, it seems to be an extremely simple language that runs everywhere. But it's precisely this versatility that makes JS increasingly complex.

A while ago I published a [series of 10 articles](https://dev.to/khaosdoctor/node-js-por-baixo-dos-panos-1-conhecendo-nossas-ferramentas-34b6) about how NodeJS works under the hood. And much of what I talked about there applies not only to NodeJS, but to JavaScript as a whole.

For example, V8 is the engine behind the main performance improvements JavaScript has had over the years, and this came thanks to browser advances (mainly Chrome).

Let's understand what was recently added to V8, which can be very beneficial for applications with short lifespans, like CLIs and small websites. We're talking about the brand-new ultra-fast compiler called **sparkplug!**

## Understanding V8

V8 is the main reason we have today's extremely fast JavaScript. To reach this level of efficiency, V8 has been refined over nearly a decade to extract the maximum from every step in building an application.

These steps are what we call a compilation _pipeline_. Think of it as a sequence of steps that your application (your code) goes through to become code that can run in a browser and, consequently, on your computer.

I won't go into details about how it works here, because I already did that [in part 4 of my series of articles](https://dev.to/khaosdoctor/node-js-por-baixo-dos-panos-4-vamos-falar-do-v8-4pai), but today we have the following pipeline:

![](./image.png "A flowchart of the V8 code flow")

Notice we have three main stages, the first is the code parser, where code is interpreted from text to an intermediate representation called **bytecode** (read more about it [here](https://dev.to/khaosdoctor/node-js-por-baixo-dos-panos-8-entendendo-bytecodes-jib)) and passed to another interpreter called **Ignition**. Ignition's job is precisely to optimize the bytecodes so that the next compiler can optimize them even further.

In short, Ignition will take the complete bytecode and optimize it in a single pass, and then move to the next stage which is **Turbofan**.

Turbofan is V8's optimization compiler, it's divided into layers that operate to optimize different parts of the code at different times, as well as generate the final code for different system architectures.

## What's new

Since 2016, the V8 team has been noticing that JavaScript speed and performance bottlenecks are happening _before_ the code is compiled by Turbofan, that is, at the beginning of the pipeline.

Despite Ignition being quite optimized and optimizing code in a single pass, which allows it to be served to the browser and executed instantly, the performance still wasn't satisfactory.

This came to light with a change in how they were measuring performance, they stopped using benchmarks called _synthetic_ (like testing tools such as Octane) and began [using real navigation data](https://v8.dev/blog/real-world-performance) to measure the performance of websites and the engine itself.

The problem here is that there are things that can't be optimized more than they already are, for example, the V8 parser is quite fast, but there are things a parser needs to do that can't simply be removed from the pipeline.

Furthermore, with a two-compiler model in the pipeline, it wasn't possible to do much division and boost performance even further, because the only way to make everything faster would be to remove the optimization passes, which in the end just reduces performance even more.

The solution: create a new compiler and put it in between the two:

![](./image-1.png "The new simplified pipeline")

This compiler was called Sparkplug.

## What is Sparkplug?

Sparkplug's main goal is to be fast, but really fast. It's so fast that you can almost completely ignore compilation time and recompile the entire code at any moment.

The secret to this, actually, isn't really a secret, it's a hack. The reality is that it doesn't compile functions from scratch, they've already been compiled to bytecode beforehand by Ignition, and it has already done most of the work trying to figure out variable values, whether parentheses are arrow functions, transforming destructurings into assignments, and much more.

The big insight is that Sparkplug won't generate any intermediate representation (called IR). IR is basically code that is the middle ground between machine code and bytecode, usually grouped in instruction triplets and very common in most compilers. Instead, the code skips some steps and is compiled directly to machine code.[^n1]

This is great for speed, but unfortunately you can't optimize much with just that information. That's why Sparkplug is an unoptimized compiler.

So what's the point of all this, if it doesn't optimize the code? The big idea behind adding Sparkplug is that, even though it's just a serialization of the parser, it's still useful because it pre-compiles all the steps that couldn't be optimized in the interpreter itself. This way we get a large performance boost just by removing those small unoptimizable steps at the beginning.

According to the V8 team, Sparkplug's performance gains are 5-15% more than without the compiler!

![](./image-2.png)

![](./image-3.png)

Read the [original article](https://v8.dev/blog/sparkplug) which has much more information about how Sparkplug maintains this compatibility with the existing ecosystem!

[^n1]: An interesting fact is that Sparkplug is, in fact, a large [`switch`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b) inside a [`for`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14) that basically reads each bytecode individually and sends the instruction to the machine code generation
