---
title: "Types versus interfaces in 2024: which to use?"
pubDate: 2024-04-10T11:00:35.000Z
updatedDate: 2026-07-16T17:57:10.000Z
category: technology
tags: ["typescript"]
lang: en
description: What's the difference between types and interfaces in TypeScript? When to use one and the other?
slug: types-versus-interfaces-in-typescript-2024
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

That's the million-dollar question. I think that after "do I have to know JavaScript to learn TypeScript", this has been the question I've received most often: **"When should I use interfaces and when should I use types?"**

And I'll go further! Why do interfaces exist if types can do everything they can?

To understand all this, we need to understand what a type is, what an interface is, and what the difference is between them.

## Types

Types are the building blocks of TypeScript, it's even in the name. They are the most important and basic things we have in our language.

A type can represent **any other type** in TypeScript, not just simple and primitive types, but objects as well.

So we can do simple things like:

```ts
type str = string
type n = number
```

As well as:

```ts
type pessoa = {
  nome: string
}
type filter = (predicate: string) => string
```

That is, types can represent any object and any interface in TypeScript.

## Interfaces

Interfaces come from an object-oriented approach, opposite to a more functional approach of types. They have existed since the first version of TypeScript and were created to enable design patterns that require polymorphism.

Unlike types, interfaces represent only objects, they cannot represent simple or primitive types.

```ts
interface pessoa {
  nome: string
}
```

## Differences between types and interfaces

When dealing with these two very similar tools, it's hard to know when to use one and when to use the other. Before getting to that point, I want to use this section specifically to state the differences between types and interfaces.

### Interfaces cannot express mapped types

Unlike types, interfaces cannot express mapped types. For example, if we want to have a `Partial<T>` type, we can't have an interface:

```ts
type partial<T> = {
  [K in keyof T]?: T[K]
}

interface Pessoa {
    nome: string
}

type partialPessoa = partial<Pessoa>
```

### Types cannot express extensions efficiently

As we saw earlier, types follow a more functional approach, unlike interfaces that follow a more object-oriented approach.

This means that when we have a type that extends another type, that is, it's the union of these two types, we need to represent it like this:

```ts
type idade = { idade: number }
type nome = { nome: string }
type pessoa = nome & idade // { nome: string, idade: number }
```

While we can express this in interfaces using the `extends` keyword:

```ts
interface Nome {
  nome: string
}

interface Pessoa extends Nome {
  idade: number
}
```

Personally, I find interfaces simpler to read in this case. But types have a problem when we have to deal with unions and intersections: they _cannot_ be cached.

All validation and all type calculations are done in real-time by the compiler, while interfaces can be cached because they cannot be changed dynamically, only through something called _declaration merging_, which, coincidentally (or not), is our next topic.

### Interfaces support declaration merging

Declaration merging is also called an "open type". While interfaces are open types, all type aliases are considered closed types. For example, we cannot create two types with the same name:

```ts
type dog = string
type dog = number // erro
```

A type can exist in only one place, only once, while interfaces can do what's called declaration merging, that is, if we declare it multiple times, the differences between the first declaration and the second are added to the same type:

```ts
interface Pessoa {
  nome: string
} // Pessoa is an object { nome: string }

interface Pessoa {
  idade: number
} // Pessoa is now { nome: string, idade: number }
```

While many people consider this a problem (and use lint rules like ESLint's [no-redeclare](https://typescript-eslint.io/rules/no-redeclare/)), others consider it okay. The truth is that this functionality is not just okay, but it's necessary for TS to work.

If you look at the TS standard libraries, you'll notice that we have a series of interfaces that are redeclared. For example, in `lib.es2015.promise.d.ts`, we have the declaration of what a promise is as a constructor, while in `lib.es5.d.ts` we have the declaration of the promise itself:

```ts
interface Promise<T> {
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
}
```

Now, we have another standard library, `lib.es2018.promise.d.ts`, that redeclares the same interface I just showed, but it adds `finally` to the interface:

```ts
interface Promise<T> {
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
```

This is important because the TS team doesn't need to maintain huge files. With each new ECMAScript version, they can create a new standard library with only the changes. **Without declaration merging, TypeScript couldn't maintain itself.**

### **Index signatures are different in types and interfaces**

When we create a type that is an object, for example:

```ts
type Pessoa = {
  nome: string
  idade: number
}
```

We'll be able to do something that, in my opinion, shouldn't happen. Which is to assign an index signature directly to the type, even if it doesn't have one:

```ts
type Pessoa = {
  nome: string
  idade: number
}

const Joao: Pessoa = {
  nome: 'João',
  idade: 32
}

type RecordGenerico = Record<string, number|string>
const meuRecord: RecordGenerico = Joao
```

So it's as if our type `Pessoa` implicitly had this:

```ts
type Pessoa = {
  nome: string
  idade: number
  [x: string]: string|number
}
```

Meaning that we can assign keys that are part of any types present in the type alias object.

In interfaces, this is not allowed, and you must explicitly say that the interface has an index signature, otherwise you'll get an error:

```ts
interface Pessoa {
  nome: string
  idade: number
}

const Joao: Pessoa = {
  nome: 'João',
  idade: 32
}

type RecordGenerico = Record<string, number|string>
const meuRecord: RecordGenerico = Joao // erro
```

But this works:

```ts
interface Pessoa {
  nome: string
  idade: number
  [x: string]: string|number
}

const Joao: Pessoa = {
  nome: 'João',
  idade: 32
}

type RecordGenerico = Record<string, number|string>
const meuRecord: RecordGenerico = Joao
```

## When to use each one

There's no gain or loss in using only types or only interfaces, so the choice is up to whoever is using these features. Personally, I prefer the following structure:

-   If I'm defining a type that is an object, then **I use interfaces**
-   For all other cases, **use types**

Why?

Simply because interfaces were designed with the idea of modeling dynamic objects in JavaScript, and types were not. So when we use interfaces, TypeScript makes a series of optimizations to make your compilation a little faster.

Furthermore, interfaces can be extended in a more expressive way, and you can work with declaration merging (carefully) to express highly dynamic types, something that's not possible with types.

But types are very flexible, so it makes sense to use types in cases like:

1.  Create an alias to reduce the complexity of a more elaborate type
2.  Express utility types
3.  Create generics that will be used as helpers

The use of interfaces is quite personal. Overall, my advice is that you **be consistent**. So if you're using interfaces for objects, don't use types, and if you're using only types, don't use interfaces.

However, you'll find that it's quite hard not to use interfaces, especially if you're following object-oriented principles, because it's a much more expressive way to implement classes, for example.
