---
title: What's New in TypeScript 5.4
pubDate: 2024-02-14T11:00:19.000Z
updatedDate: 2026-07-16T15:53:14.000Z
category: typescript
tags:
  - typescript
lang: en
description: See the main changes in the TypeScript 5.4 beta, including the new NoInfer type with detailed explanations!
slug: whats-new-in-typescript-5-4-beta
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Another day, another TS version! This time we're going to talk about the main changes coming in the TypeScript 5.4 beta.

Just a reminder that this is still a beta version, so it's possible not all features will make it to the final release.

## Better type inference in closures

One of the biggest issues TS had with inference (and type narrowing) was that inside closures like `map`, types often weren't inferred correctly.

A classic example is when you have a parameter that could be multiple types, but inside the function it gets narrowed to a single type:

```ts
function uppercaseStrings(x: string | number) {
    if (typeof x === "string") {
        return x.toUpperCase();
    }
}
```

Here, TS knows the type is a string because we explicitly check for it. If it passed that check, it must be a string.

But when you use the same type after narrowing in another context, like this example from the TS team:

```ts
function getUrls(url: string | URL, names: string[]) {
    if (typeof url === "string") {
        url = new URL(url);
    }

    return names.map(name => {
        url.searchParams.set("name", name)
        //  ~~~~~~~~~~~~
        // error!
        // Property 'searchParams' does not exist on type 'string | URL'.

        return url.toString();
    });
}
```

The issue is that inside the `map` closure, TS didn't correctly infer that the `url` variable had to be a URL at that point. If it was a string, it was converted, so it should be safe.

> [!NOTE] 💡
> To work around this, it's common to create an intermediate variable that holds the final value, like `let url = typeof url === 'string' ? new URL(url) : url`

But inside the map, TypeScript saw that the `url` variable could be modified elsewhere, so it stuck with the original parameter type, causing the error. In the new version, TS is smarter. It now infers types based on the last assignment to a variable, so:

1. If it's a parameter or a `let` variable
2. If that variable is used in non-hoisted functions
3. TS will look at the last point where the variable was modified and infer the type from there

However, if you modify the variable anywhere else, even to the same value, it invalidates all later type inferences because there's no way to guarantee the type stayed the same.

## `NoInfer<T>`

A new utility type that prevents TS from inferring generic type parameters that are passed in. We covered this extensively in the generics section of [**TypeScript Formation**](https://formacaots.com.br), and there are two kinds of generics:

1. Explicit generics, where you pass the type directly: `foo<string>('param')`
2. Implicit generics, inferred by TS. If `foo` were something like `foo<T> (a: T)`, you could call `foo('param')` and TS would infer the parameter as string

But this inference doesn't always work, especially with complex types. The example the TS team gave here is simple, but it illustrates the problem well:

```ts
function createStreetLight<C extends string>(colors: C[], defaultColor?: C) {
    // ...
}

createStreetLight(["red", "yellow", "green"], "red");
```

Here we have a function that takes a list of colors and an optional default color. When you call it as expected, everything works:

```ts
function createStreetLight<C extends string>(colors: C[], defaultColor?: C) {
    // ...
}

createStreetLight(["red", "yellow", "green"], "red");
```

But when you pass a color that's not in the array, TS infers that this color should also be part of the original array:

```ts
// Here the generic C becomes red | yellow | green | blue
createStreetLight(["red", "yellow", "green"], "blue");
```

There are currently two ways to solve this. The first is to create an enum or object with the allowed colors:

```ts

const colors = ["red", "yellow", "green"] as const;
function createStreetLight<C extends typeof colors[number]>(colors: C[], defaultColor?: C) {
  // ...
}

createStreetLight(["red", "yellow", "green"], "blue");
// Blue errors because it's not in the original array
```

But ideally you wouldn't need an external type and could infer a type from another one. That's why we usually create a second generic that extends the first:

```ts
function createStreetLight<C extends string, D extends C>(colors: C[], defaultColor?: D) {
}

createStreetLight(["red", "yellow", "green"], "blue");
//                                            ~~~~~~
// error!
// Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green" | undefined'.
```

Notice that `D extends C` makes the inference of D based on the first generic, so the second parameter isn't tied to the first. That works, but creating a whole new generic type just for this feels like overkill, which is why we have the new `NoInfer` type.

It does exactly that. When you put `NoInfer` on a parameter, you're saying you don't want TS to infer that parameter as a candidate for the generic type. It's like saying "stop inferring the type here":

```ts
function createStreetLight<C extends string>(colors: C[], defaultColor?: NoInfer<C>) {
    // ...
}

createStreetLight(["red", "yellow", "green"], "blue");
//                                            ~~~~~~
// error!
// Argument of type '"blue"' is not assignable to parameter of type '"red" | "yellow" | "green" | undefined'.
```

Another way to think about it: "don't use this parameter as a candidate for inference".

## groupBy on Objects and Maps

Following the grouping proposals (like the one for [Array](/array-groupby-stage-3/)), we now have the static methods `Object.groupBy` and `Map.groupBy`. They take an iterable and transform it into an object or map, grouping the values by a function you provide.

> This proposal has been on the TC39 proposals list for quite a while

```ts
const array = [0, 1, 2, 3, 4, 5];

const myObj = Object.groupBy(array, (num, index) => {
    return num % 2 === 0 ? "par": "impar";
});
```

This gives you a final object:

```ts
const myObj = {
    par: [0, 2, 4],
    impar: [1, 3, 5],
};
```

`Map.groupBy` works the same way, except it returns a map instead of an object.

> [!CAUTION] ⚠️
> These typings will only work if you set `target` to `esnext` or update your `lib` configuration to include these types. Eventually these functions will be available under the `es2024` target

## Other changes

- Import Attributes are now correctly typed
- Added quick fixes for missing parameters in the editor
