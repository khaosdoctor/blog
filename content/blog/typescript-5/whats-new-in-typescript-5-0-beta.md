---
title: What's New in TypeScript 5.0 Beta
pubDate: 2023-02-02T11:11:51.000Z
updatedDate: 2026-07-16T16:03:46.000Z
category: typescript
tags:
  - typescript
  - development
  - ecmascript
  - javascript
  - nodejs
lang: en
description: TypeScript 5.0 beta is out! Time to discover what's new in this version of the superset we all love!
seoTitle: TypeScript 5.0 Beta What's New
slug: whats-new-in-typescript-5-0-beta
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Another day, another version of our beloved JavaScript superset is here! On January 26, 2023, [Microsoft released the TypeScript 5.0 beta](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/), and this version includes some of the most interesting and important features launched in TypeScript in a long time! Let's discover what they are!

## Installing the beta

Before anything else, if you want to test any TypeScript 5.0 beta features, don't forget to install the npm package with the `@beta` tag, like this:

```bash
npm install typescript@beta
```

Then check out [this tutorial](https://code.visualstudio.com/Docs/languages/typescript#_using-newer-typescript-versions) to set your VSCode version to the newest TypeScript version.

## Decorators are finally stable

For many years, TypeScript used its own implementation of [decorators](/javascript-decorators/), a proposal we've discussed here on the blog, with this proposal promoted to stage 3 in TC39, it's now possible to use decorators without setting the `--experimentalDecorators` flag or the same option in `tsconfig.json`.

To explain what a decorator is in summary, imagine we have a class like this:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
}

const p = new Person("Ray");
p.greet();
```

And we want to log what happens inside the greet function for debugging purposes. Generally the most common approach is to fill the code with `console.log` like this:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    greet() {
        console.log("LOG: Entering method.");

        console.log(`Hello, my name is ${this.name}.`);

        console.log("LOG: Exiting method.")
    }
}
```

It's quite common to do this almost everywhere, but imagine if we needed it for all methods... It would be quite complicated. And then decorators come in.

Decorators are a **meta-functionality** of various languages that allows you to modify standard behaviors of functions and classes according to an annotation in the format `@name`, a decorator is a regular function, but with a specific signature:

```ts
function debug (originalMethod: any, _context: any) {
	return function (this: any, ...args: any[]) {
    	console.log(`[DEBUG] Entering method`)
        const result = originalMethod.call(this, ...args)
        console.log(`[DEBUG] Exiting method`)
        return result
    }
}
```

Think of it as a function that returns a substitute method that will be used in place of the original method. We will always return a function that takes two parameters, a `this` and the `args`, which are the scope and the arguments of the original function.

> An important note: arrow functions cannot have a `this` parameter because the scope of these functions will be lexical and not logical, meaning the compiler will associate the `this` automatically.

The outer function will have two other parameters, the `originalMethod` which is the function of the original method passed by reference, and a context which is an object with various information about the decorated method, like name, etc.

With this, we can modify our original method to contain the following annotation:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    @debug
    greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
}

const p = new Person("Ray");
p.greet();

// Output:
//
//   [DEBUG] Entering method.
//   Hello, my name is Ray.
//   [DEBUG] Exiting method.
```

And we can do the same thing for any other function, this makes decorators one of the most powerful proposals that exist in TypeScript so far.

But, as you may have noticed, we have an unused argument in the original function, the `context`, this object contains various information about the method that was called and TypeScript has a specific type for it, the `ClassMethodDecoratorContext`, so let's type our decorator correctly:

```ts
function debug (originalMethod: any, context: ClassMethodDecoratorContext) {
	const methodName = String(context.name)
	return function (this: any, ...args: any[]) {
    	console.log(`[DEBUG] Entering method ${methodName}`)
        const result = originalMethod.call(this, ...args)
        console.log(`[DEBUG] Exiting method ${methodName}`)
        return result
    }
}
```

Notice that, in addition to logging that we enter and exit the method, we also log the name of the method. But that's not all, the context also has a function called `addInitializer` which we discussed [in the article about decorators](/javascript-decorators/). This method is a way to create a hook at the beginning of the constructor (or in the static initialization block itself of a class). A classic JavaScript example:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
        this.greet = this.greet.bind(this);
    }

    greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
}
```

Another way to write this code is to initialize the `greet` method as an arrow function:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    greet = () => {
        console.log(`Hello, my name is ${this.name}.`);
    };
}
```

This pattern is widely used when we want to make sure that `this` won't be re-associated with the function when we call `greet` outside of context. And this can be done through `addInitializer` to call the `bind` method for us in all cases:

```ts
function bound(originalMethod: any, context: ClassMethodDecoratorContext) {
    const methodName = context.name;
    if (context.private) {
        throw new Error(`'bound' cannot decorate private properties like ${methodName as string}.`);
    }
    context.addInitializer(function () {
        this[methodName] = this[methodName].bind(this);
    });
}
```

Notice that, in this decorator, we are not returning a substitute method, this means we will leave the original method as is and only create the bind of `this` for the `greet` method, and we can use multiple decorators on the same method without problems:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    @bound
    @debug
    greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
}

const p = new Person("Ray");
const greet = p.greet;

greet();
```

As you can see, the two decorators were stacked one above the other, it's important to note this because they run in reverse order, meaning `@bound` will decorate what is returned from `@debug` and so on.

> Think of them as being applied from bottom to top.

Another note, if you prefer, you can also put them on the same line:

```ts
    @bound @loggedMethod greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
```

To make it even more interesting, we can create a wrapper of a decorator, making it a factory of decorators, for example, if we want to change the prefix of our log message:

```ts
function addLog (prefix = '[DEBUG]') {
    return function debug (originalMethod: any, _context: any) {
    	const methodName = String(context.name)
        return function (this: any, ...args: any[]) {
            console.log(`${prefix} Entering method ${methodName}`)
            const result = originalMethod.call(this, ...args)
            console.log(`${prefix} Exiting method ${methodName}`)
            return result
        }
    }
}
```

Then we can use this decorator as a function:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    @addLog("")
    greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
}

const p = new Person("Ray");
p.greet();

// Output:
//
//   Entering method 'greet'.
//   Hello, my name is Ray.
//   Exiting method 'greet'.
```

Decorators can be used on more than methods, we can add these decorators on properties, getters, setters and even classes.

### And the `--experimentalDecorators`

The TypeScript team says that the `experimentalDecorators` flag will continue to exist for now, and that there are no plans to remove it from the language in the near future. This flag was super important before this proposal and was the only way we had to use decorators.

Using decorators without the flag will be totally valid as normal TypeScript or JS code, however, the TC39 proposal (this proposal) is not compatible with the other `emitDecoratorMetadata` flag that allowed you to add decorators on parameters, but there is an addition to the original TC39 proposal that proposes the addition to parameters as well.

### Typing decorators

In the previous examples, we typed the decorators `debug`, `addLog` and `bound` in a way that they remained quite simple and didactic, but the ideal is to perform the typing of each part of the decorator in a fairly strict type.

If we take our `debug` example:

```ts
function debug (originalMethod: any, context: ClassMethodDecoratorContext) {
	const methodName = String(context.name)
	return function (this: any, ...args: any[]) {
    	console.log(`[DEBUG] Entering method ${methodName}`)
        const result = originalMethod.call(this, ...args)
        console.log(`[DEBUG] Exiting method ${methodName}`)
        return result
    }
}
```

We have here two very important parameters that we need to type, the first is the original method, which is a function, it can be defined as a type of this signature:

```ts
type OriginalMethod<This, Args extends any[], Return> = (this: This, ...args: Args) => Return
```

Notice that we are separating input and output, with the generics `Return`, `This` and `Args`, this way we can pass exactly what values we will send to the function.

Then we can type our decorator like this:

```ts

type OriginalMethod<
	This, 
    Args extends any[], 
    Return
> = (this: This, ...args: Args) => Return
    
function debug<This, Args extends any[], Return> (
  originalMethod: OriginalMethod<This, Args, Return>,
  context: ClassMethodDecoratorContext<This, OriginalMethod<This, Args, Return>>
) {
  const methodName = String(context.name)
  return function (this: This, ...args: Args): Return {
    console.log(`[DEBUG] Entering method ${methodName}`)
    const result = originalMethod.call(this, ...args)
    console.log(`[DEBUG] Exiting method ${methodName}`)
    return result
  }
}
```

And this is the way we correctly type any decorator.

## const type for type parameters

A quite common use of TypeScript types is to get defined values for a list or a primitive, for example, when we have a function like the one below:

```ts
const routerFactory = <T>(routes: T[]) => ({
  reRoute(original:T, newRoute: T) {
    return newRoute
  }
})
```

The type we will receive from this function when we call it will be that `T` is a `string` therefore we will receive an array of strings and return a string. But we can only add a redirect on our routes that already exist, so we can create an array and pass these routes to the function:

```ts
const routerFactory = <T>(routes: T[]) => ({
  reRoute(original:T, newRoute: T) {
    return newRoute
  }
})

const router = routerFactory([
  '/',
  '/about',
  '/contact',
  '/blog',
  '/blog/:id',
])
```

But still, we can call our function with any string, because the type is still being resolved to `string`. This means we can pass anything:

```ts
router.reRoute('lkjkljklj', 'lkjlkjlkjlkj') // works
```

One solution would be to use the `as const` modifier but for that our function would need to accept an options object with the routes and also we have to remember to do this every time we instantiate this functionality. However, in 5.0, we can add a type annotation called `const`:

```ts
const routerFactory = <const T>(routes: T[]) => ({
  reRoute(original:T, newRoute: T) {
    return newRoute
  }
})

const router = routerFactory([
  '/',
  '/about',
  '/contact',
  '/blog',
  '/blog/:id',
])
```

Now our `routes` will be typed as a union of all the strings in the array `("/"|"/about"|"/contact"|"/blog"|"/blog/:id")[]` so that the internal strings need to be members of that array to be valid.

But keep in mind that you might be thinking of doing something like this:

```ts
const availableRoutes = [
  '/',
  '/about',
  '/contact',
  '/blog',
  '/blog/:id',
]

const routerFactory = <const T>(routes: T[]) => ({
  reRoute(original:T, newRoute: T) {
    return newRoute
  }
})

const router = routerFactory(availableRoutes)
```

In this case, `availableRoutes` will be inferred as an array of strings. Therefore the inference of `const` won't make a difference here, for this code to work like the previous one, we need to add `as const` to the array initially:

```ts
const availableRoutes = [
  '/',
  '/about',
  '/contact',
  '/blog',
  '/blog/:id',
] as const
```

But we will also need to make a modification to our function, since now our array is no longer an array of strings, but a union type, so it's being typed as a subtype of `readonly string[]`, therefore we need to tell this to the factory:

```ts
const availableRoutes = [
  '/',
  '/about',
  '/contact',
  '/blog',
  '/blog/:id',
] as const 

const routerFactory = <const T extends readonly string[]>(routes: T) => ({
  reRoute(original:T, newRoute: T) {
    return newRoute
  }
})

const router = routerFactory(availableRoutes)
```

But now we will have a problem if we want to call `reRoute` because T will be the array itself, and not the individual strings of that array, for that we need to go down one level and type `reRoute` as well as a generic U that will be one of the strings of T:

```ts
const availableRoutes = [
  '/',
  '/about',
  '/contact',
  '/blog',
  '/blog/:id',
] as const 

const routerFactory = <const T extends readonly string[]>(routes: T) => ({
  reRoute<const U extends T[number]>(original:U, newRoute: U) {
    return newRoute
  }
})

const router = routerFactory(availableRoutes)
```

Now we will have the same result if we call the function, meaning we need to pass two strings that are within the array of available routes sent initially.

## All enums are unions

When we start using enums in TypeScript, they were nothing more than a direct list of numbers, each number associated in our hearts to a label, but for TypeScript they were all numbers, this means that an enum of this type:

```ts
enum E {
    Foo = 10,
    Bar = 20,
}
```

Would not see a difference in receiving any of the values (foo or bar) within a function, as long as the type of the parameter was `E`:

```ts
function takeValue(e: E) {}

takeValue(E.Foo); // works
takeValue(123);   // error!
```

In TypeScript 2.0, string enums were included, these allow us to make a range of type manipulations and we can filter, exclude, get a subset and various other operations to reduce the number of types accepted, like I do, for example, [in my enigmajs code](https://github.com/khaosdoctor/enigmajs/blob/main/src/types.ts#L6).

This meant that all enums that were strings were treated as a union of all the strings of its members, and not just as `number`, however when we had enums that were initiated by functions or values not computable at development time, TypeScript ignored the new implementation and went to the old implementation, losing the advantages of the types:

```ts
enum E {
    Blah = Math.random()
}
```

In the new version of TypeScript, the compiler is much smarter and can now infer all types of any enum as a union type!

## Other changes

- The `extends` key inside `tsconfig.json` now supports multiple configuration files allowing to extend configs from multiple places
- `bundler` value is now an option for `moduleResolution` in `tsconfig.json` that models the way bundlers like webpack work to resolve modules.
- New custom flags to configure how each type of import works
- Support for `export type * as foo from 'package.ts'`
- Support for [satisfies](/ts-satisfies/) and [`@overload`](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#overload-support-in-jsdoc) in JSDoc
- [Performance improvements](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#speed-memory-and-package-size-optimizations) between 80 and 90% and package size reduction of 58% (TypeScript got smaller and faster, much faster)

See the [official documentation](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta) on the TypeScript website for a more complete list with smaller changes and more!
