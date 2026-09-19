---
title: Where to use ANY in TypeScript
pubDate: 2024-08-07T11:00:19.000Z
updatedDate: 2026-07-16T17:54:12.000Z
category: typescript
tags:
  - typescript
  - javascript
lang: en
description: We already know that "any" is a bad usage pattern, but learn about some use cases where any is our only option!
slug: when-to-use-any-in-typescript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Anyone who was at my **TypeScript Formation** streams (or took the training) knows I'm extremely against `any` in code. Mainly because `any` has become an escape valve, whenever we want to disable TypeScript we can just use `any` in our code and everything resolves. Many people have already asked me: "Well, why does TypeScript have `any` if we can't use it?"

The reality is that `any` is an extremely important type. First because it's the only type that can be associated with any type without that type being restricted to a more specific type. Additionally, it's the most open type of all and accepts everything, meaning `any` is everywhere.

While in most cases using `any` is very bad, there are some interesting cases where `any` is actually our only correct option.

## Allowing type inference

The first example is exactly what I mentioned above. When we use `any`, we're not fixing a specific type and we're allowing TS to infer that type. The way TypeScript resolves typings is always from the most open to the most closed, meaning `any` is like initializing a numeric variable as "infinity".

A classic example (that you'll find in many places) is `ReturnType`, a utility type that exists natively in TypeScript and basically what it does is get the return type of a function. Let's try to recreate that type:

```ts
type ReturnType<T extends (...args: unknown[]) => unknown> = T extends (...args: unknown[]) => infer Retorno ? Retorno : never
```

Basically, we're saying we want a type, that type takes a generic that will be a function, we really don't care what exists in the parameters or return of the function, so to avoid having to use `any` we use `unknown`. That way our type is safer, right? But what if we do this here:

```ts
const foo = (i: string) => i
type retorno = ReturnType<typeof foo>
```

We'll get an interesting error:

```
ype '(i: string) => string' does not satisfy the constraint '(...args: unknown[]) => unknown'.
  Types of parameters 'i' and 'args' are incompatible.
    Type 'unknown' is not assignable to type 'string'.
```

This is because when we use `unknown` we're automatically telling TypeScript that we don't know what's there, so TS will **force** us to cast it manually. What we want is for TS to do the inference itself. So for that we need to say that "we don't care what's there" and TS will always try to bring the most specific type possible.

If we change our type declaration to:

```ts
type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer Retorno ? Retorno : never
```

Our error disappears and our type `retorno` will be `string`.

## External values

Another option is when we're dealing with values that are truly external. This is a valid use case for `any`, but we must always remember that it's necessary to type these values later. For example:

```ts
const dadoExterno: any = algumaChamadaDeAPI()
// processamento aqui
const dadoInterno: SeuTipo = dadoConfirmado
```

The use of `any` in this case is only when we're getting the data, through a `JSON.parse` or any other call, but it's **extremely important** that we don't keep the `any` afterwards. If we need to do any processing, it's important that we cast that type to another much more specific type.

## Legacy codebase migration

One of the most important use cases is when we're migrating from JavaScript to TypeScript in a legacy codebase. For that it's common to start the migration using `any` in the old code and gradually change those `any` values to specific types.

This is probably the most acceptable case for using `any` in any application.
