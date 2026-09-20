---
title: Typing environment variables the right way with TS
pubDate: 2024-07-19T11:00:44.000Z
updatedDate: 2026-07-16T17:54:50.000Z
category: technology
tags: ["typescript"]
lang: en
description: Probably one of the biggest problems we face in TypeScript, discover the solution for typing envs and how to apply it in your project!
slug: typing-environment-variables-the-right-way-with-ts
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

An extremely common problem we face with TypeScript is typing external files, the main one being when we need to type things that come from the system where we're running the application, for example, **process.env**.

I've seen various techniques for typing and even converting these values, but most of them have fundamental flaws. I'll present some here and which ones I prefer to use.

## The problem

When we have environment variables, we're dealing with one of the main sources of unknown possible values in TypeScript. First, we're dealing with an external value that may or may not exist, so it won't have autocomplete or intellisense when you type:

```ts
process.env.
//         ^ We don't have autocomplete here
```

Then, even if we have a valid variable, for example, a server port:

```ts
process.env.PORT
```

TypeScript can't know how to type the variable because it might be undefined, so correctly, it types everything that comes from `process.env` as `string | undefined`, which makes using these variables a nightmare when we have to pass them to functions:

```ts
function foo (x: string) {
  return x.toLowerCase()
}

foo(process.env.UMA_STRING) // error
```

## The solutions

Let's look at some possible solutions. I'll leave some options here and comment on them at the end of each section.

### Type Augmentation

Type augmentation is an advanced TypeScript technique that works well when you're dealing with modules that have no typing and/or are external to your system. In other words, you can essentially tell TypeScript what types you want for a module you already have installed, but don't own.

For example, we can ask TypeScript to override Node.js's global object by adding the correct typing for our envs. So we can do it like this:

```ts
// envs.d.ts
namespace NodeJS {
  interface ProcessEnv {
    PORT: string
  }
}
```

What you're essentially doing is using a concept called _declaration merging_ to merge the two objects together and override TS's natural typing with your own.

This approach is useful for the following cases:

- Small applications
- Few environment variables
- It's not necessary for them to have a type different from string

However, it has critical problems:

- If the variable can only be a specific type, you're not converting
- It doesn't guarantee that the variable exists on the system
- Checking only at compile time

Additionally, using declaration files to override global objects isn't necessarily considered a good practice.

## Conversion object

Another, more "manual" way to do this is to create a simple object and assign values to it, manually casting these objects:

```ts
const envs = {
  PORT: process.env.PORT as string
}
```

This approach has even more problems than the previous one because:

- You're forcing the type conversion, meaning your code assumes the env always exists
- You can't give an error when required variables are missing without writing more code
- It doesn't guarantee anything at runtime or compile time

## Use a validation library (Zod)

This is my preferred method. While researching this article, I found this [other article](https://www.totaltypescript.com/how-to-strongly-type-process-env#solution-2-validate-it-at-runtime-with-t3-env) that talks about a tool called [t3-env](https://github.com/t3-oss/t3-env). You could essentially use it something like this (example from the other article):

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    OPEN_AI_API_KEY: z.string().min(1),
  },
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
});
```

While it's an interesting way to create validation that works at both runtime and compile time, I don't see the point in having this package, since you can use just Zod to do all of this in a much simpler and cleaner way.

> The T3 case is a variation because it also types client variables, which I personally don't like much. I prefer to keep the two things separate.

With only Zod installed as a package, you can create a file called `config.ts`. In it, you can not only have all your environment variables but also any other configuration you might pass to your app:

```ts
import { z } from 'zod'

const appConfigSchema = z.object({
  PORT: z.coerce.number().min(1024).max(65535).default(3000),
  DATABASE_HOST: z.string(),
  DATABASE_USER: z.string(),
  MAIN_EMAIL: z.string().email(),
  MAIN_ACCOUNT_ID: z.string().uuid().optional()
})

export type AppConfig = z.infer<typeof appConfig>
export const appConfig = appConfigSchema.parse(process.env)
```

And then you just use it in your application, from anywhere:

```ts
import { appConfig } from '../config.ts'

console.log(appConfig.PORT) // number between 1024 and 65535, default 3000
```

This validation not only ensures that variables exist on your system, because otherwise Zod will throw a null value error, but also ensures that types at runtime will be valid types within your schema.

Another, slightly more "ready-made" option is to use [znv](https://www.npmjs.com/package/znv), which does exactly the same thing, but has a somewhat prettier error listing.
