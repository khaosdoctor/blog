---
title: "Everything about the new satisfies operator in TypeScript"
pubDate: 2022-10-05T13:00:52.000Z
updatedDate: 2026-07-16T16:05:55.000Z
category: "typescript"
tags: ["typescript", "javascript"]
lang: en
description: "In TypeScript 4.9 beta, we got a new operator, \"satisfies\". Let's understand how this new operator can be useful and why it's so cool!"
seoDescription: "In TypeScript 4.9 beta, we got a new operator, \"satisfies\". Let's understand how this new operator can be useful."
slug: "everything-about-the-new-satisfies-operator-in-typescript"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

In the latest open TypeScript beta, the devs showed what's coming in version 4.9 of the language. Besides some optimizations, which are pretty common, in type inference, we'll have a new operator in the language, `satisfies`. Let's understand a bit more about how this operator will work.

## The `satisfies` operator

When we're developing with TS, we often fall into a tricky dilemma. TS's type inference is very good and specific, so it's nice to have that very specific inference, but at the same time, that inference doesn't take into account some factors, like the names of keys.

In the example we took from the [beta announcement itself](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9-beta/#the-satisfies-operator), we have a very good idea of what this means. Let's imagine the following: we have a type that can be either a string or an RGB tuple, that is, we need a `[number, number, number]`. We can do it like this:

```ts
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  bleu: [0, 0, 255]
// ^^^ temos um typo aqui
}
```

TS's automatic type inference will be that `palette` is:

```ts
{
  red: [255, 0, 0],
  green: "#00ff00",
  bleu: [0, 0, 255]
}
```

That is, we have a literal type. These types allow us to use certain functions for each data type in certain cases. For example, a `toUpperCase` function on `green` since it's a string, and a `.at(0)` on `red` which is an array:

```ts
// Conseguimos usar métodos de array aqui
const redComponent = palette.red.at(0);

// Mas não aqui, porque só podemos usar strings
const greenNormalized = palette.green.toUpperCase();
```

But we lose the inference of the key names. See that we have a typo, we should have written `blue` and not `bleu`. To fix this, we would have to create a new, more generic type and tell TS that that type is the type of the object. In that case, the type could be:

```ts
type Colors = "red" | "green" | "blue"
type RGB = [red: number, green: number, blue: number]

const palette: Record<Colors, string | RGB> = {
  red: [255, 0, 0],
  green: "#00ff00",
  bleu: [0, 0, 255]
}
```

This will give us the error `Object literal may only specify known properties, and 'bleu' does not exist in type 'Record<Colors, string | RGB>'.`, which is expected. That is, we're checking that the keys match the object, so we can fix it:

```tys
const palette: Record<Colors, string | RGB> = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
}
```

We'll have a type like this:

```ts
{
  red: string | RGB,
  green: string | RGB,
  blue: string | RGB
}
```

But now we'll have two annoying errors in the two functions below:

```ts
// Property 'at' does not exist on type 'string | RGB'.
const redComponent = palette.red.at(0);

// Property 'toUpperCase' does not exist on type 'string | RGB'.
const greenNormalized = palette.green.toUpperCase();
```

The first because we don't have `.at` on strings, and the second because we don't have `.toUpperCase` on `RGB`. This only happens because when we tell TS that that object is of a certain type, that type generalizes what will go into that object. For example, in this case, it's unsure whether each key is a string or an array of numbers, and we can't infer both things.

To solve this problem, we would have to make an explicit conversion:

```ts
nent = (palette.red as RGB).at(0);
const greenNormalized = (palette.green as string).toUpperCase();
```

And that's what `satisfies` is for. We could keep the more detailed specification while saying that it should follow some kind of template. For example:

```ts
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255]
} satisfies Record<Colors, string | RGB>
```

Now the new type of `palette` will be:

```ts
{
    red: [number, number, number];
    green: string;
    blue: [number, number, number];
}
```

See how we're now using the power of specific inference with the power of declared type inference to get the most out of TypeScript. This way we can use functions that are strings on keys that are strings, and array functions on numeric keys.

## Conclusion

This is, without a doubt, one of the best additions to the superset in recent times. I believe the main recommendation from now on should be to write all your types without any manual assertion, and use satisfies to say which object it should belong to. This way we get to keep the best of all worlds.

For more examples, check out the [issue that proposed this feature](https://github.com/microsoft/TypeScript/issues/47920).
