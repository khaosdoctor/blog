---
title: What's New in the TypeScript 4.3 Beta
pubDate: 2021-05-10T18:38:14.000Z
updatedDate: 2026-07-16T16:15:49.000Z
category: technology
tags: ["typescript", "javascript"]
lang: en
description: Let's understand everything about what just came out for TypeScript 4.3 and what you can already test!
slug: whats-new-in-the-typescript-4-3-beta
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

The new TypeScript version [went into beta](https://devblogs.microsoft.com/typescript/announcing-typescript-4-3-beta/) on April 1, 2021! For now this version isn't ready to use in production, but it already includes some really cool changes and fixes!

To test all this you can install the newest version with `npm i typescript@beta` and start enjoying the new features!

## Separate Read and Write Types

Originally when we have some kind of property in a class that can be written and read in different ways, we create a getter and a setter for that property, for example:

```javascript
class Foo {
    #prop = 0
    
    get prop() {
        return this.#prop
    }

	set prop (value) {
        let val = Number(value)
        if (!Number.isFinite(num)) return
        this.#prop = val
    }
}
```

In TypeScript, by default, the type is inferred from the return type in the `get`, the problem is that if we have a `set` property that can be set in various ways, for example as a `string` or `number`, the return type of this property will be inferred as `unknown` or `any`.

The problem with this is that when we're using `unknown`, we force a cast to the type we want, and `any` really doesn't do anything. This model forced us to choose between being precise or permissive. In TS 4.3 we can specify separate types for input and output of properties:

```typescript
class Foo {
    private prop = 0
    
    get prop(): number {
        return this.prop
    }

	set prop (value: string | number) {
        let val = Number(value)
        if (!Number.isFinite(num)) return
        this.prop = val
    }
}
```

And this isn't limited to just classes, we can do the same thing with object literals:

```typescript
function buildFoo (): Foo {
  let prop = 0
  return {
    get prop(): number { return prop }
    set prop(value: string | number) {
      let val = Number(value)
      if (!Number.isfinite(val) return
      prop = val
    }
  }
}
```

And this also applies to interfaces:

```typescript
interface Foo {
  get prop (): number
  set prop (value: string | number)
}
```

The only limitation we have here is that the `set` method **must** have the same type in its list of types as the `get`, in other words, if we have a getter that returns a `number` the setter needs to accept a `number`.

## The `override` Keyword

A less common but equally important change comes when we have derived classes. Usually, when we use a derived class with `extends`, we have several methods from the parent class that need to be overridden, or adapted. To do this we write a method in the derived class with the same signature:

```typescript
class Pai {
  metodo (value: boolean) { }
  outroMetodo (value: number) {}
}

classe Filha extends Pai {
  metodo () { }
  outroMetodo () { }
}
```

What happens is that we're overriding the two methods from the parent class and using only the ones from the derived class. However, if we modify the parent class and remove the two methods in favor of a single method, like this:

```typescript
class Pai {
  metodoUnico (value: boolean) { }
}

classe Filha extends Pai {
  metodo () { }
  outroMetodo () { }
}
```

What happens is that our derived class won't override the parent class method anymore, and therefore will have two completely useless methods that will never be called.

Because of this, TypeScript 4.3 added a new keyword called `override`. What this keyword does is tell the server that a method in the derived class is being explicitly overridden, so we can do it this way:

```typescript
class Pai {
  metodo () { }
  outroMetodo () { }
}

classe Filha extends Pai {
  override metodo () { }
  override outroMetodo () { }
}
```

In this example we're telling TypeScript to explicitly look in the parent class to see if there are two methods with these names. And if we modify our parent class and keep the derived class:

```typescript
class Pai {
  metodoUnico (value: boolean) { }
}
classe Filha extends Pai {
  override metodo () { }
  override outroMetodo () { }
}

// Error! This method can't be marked with 'override' because it's not declared in 'Pai'.
```

Additionally a new flag `--noImplicitOverride` was added to prevent us from forgetting to make this identification. When this happens we won't be able to override any method without writing `override` first, and all unmarked methods won't be extended.

## Auto Imports

The last important update we're going to talk about is more about a significant quality of life improvement for everyone who writes imports (which is, basically, everybody). Before, when we wrote `import {` TypeScript had no way to know what we were going to import, so we frequently wrote `import {} from 'modulo.ts'` and then went back to `{}` to be able to use autocomplete on what was left.

  
In version 4.3, we'll have the intelligence of auto-imports that already exist in the editor to be able to complete our declarations, as the video shows:

![Animation describing the importing of a module using autoimport to complete the text](./111011663-f53c7580-834e-11eb-9a2a-3dc3ea-032468.gif "Animation with the details of autoimport to complete the declaration of imported modules in TypeScript")

The important part here is that we need the editor to support this functionality, for now it's available in VSCode 1.56 normal, but only with the [TS/JS nightly extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next) installed.

## Other Updates

In addition to the updates we discussed, TypeScript also modified and improved **quite a lot** how _template literal types_ are inferred and identified. Now we can use them in a much simpler and more direct way.

We also have better Promise assertions and a breaking change in `.d.ts` files that can be read there in the official release article.
