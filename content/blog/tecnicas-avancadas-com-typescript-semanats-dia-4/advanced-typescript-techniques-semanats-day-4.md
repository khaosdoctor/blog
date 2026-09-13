---
title: "Advanced TypeScript Techniques - #SemanaTS day 4"
pubDate: 2023-04-06T11:00:47.000Z
updatedDate: 2026-07-16T16:01:51.000Z
category: "typescript"
tags: ["typescript"]
series: typescript-week
seriesOrder: 4
lang: en
description: "Learn all about more advanced TypeScript techniques, from type narrowing to generics and branded types."
seoTitle: "Advanced TypeScript Techniques"
slug: "advanced-typescript-techniques-semanats-day-4"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

We have been talking a lot about types and gone through some good and bad code practices using TypeScript, but I still feel we are missing something here. That something is the less conventional techniques you'll see around.

I don't like calling them _advanced techniques_, but lacking a better name to describe them, I'll stick with it. These techniques are nothing out of the ordinary, but they are very clever uses of the type system to make it work for you more easily. But enough introduction, let's talk about our first technique!

## Satisfies

This is a super recent "technique", I [already talked about it](/ts-satisfies/) here on the blog before. I wouldn't even call it a technique because it's a new operator, but the use of this operator is quite an interesting technique! This is `satisfies`.

When we are dealing with types, one of the problems that frequently occurs is that the more generic types inferred by the compiler end up overriding the more specific types we want. Let's look at an example we already used, with 3D points:

![](./image.png)

See that calling `toFixed` will return an error, as it should, because we need to check if the property exists, but we can assign a non-existent value to a variable anyway, in our case `x`.

> I want to be clear that in this specific case, assigning `x` to a variable wouldn't make much difference because TS will type `ponto.x` as `number | undefined`, meaning we'll have to check it anyway.

This happens because even if we know that our object only has one of the keys, TS can't infer this correctly because the only information we gave it was that our object could have one or two properties. But if we use the `satisfies` operator things change:

![](./image-1.png)

Now we have the correct inference, and the type of `ponto` will be `{ y: number }`, meaning it's as if the compiler took the value of your variable, went to the object you defined with `satisfies`, looked there, and returned to you only the properties of your variable that exist in that object.

Another quite interesting use of satisfies is to ensure that different properties have different types from a more generic type, for example, a mixed object:

![](./image-3.png)

See that we can't use the `toUpperCase()` method because the union of `string | number` doesn't have that method, even though `nome` is a string, but if we tell TS that this more specific object satisfies a more generic form, then we can have our correct inference:

![](./image-4.png)

Now, the type of `carro` will be `{ nome: string, ano: number, cor: string }` instead of a `Record<Props, string|number>` that types all values as `string | number`.

> Notice that in both examples, we had to remove the type annotation from the variable and pass it directly to `satisfies`.

### Deep inference with `as const`

This case deserves to be separate because it's one of the coolest ways to use `satisfies`. But you can also say that a type is a constant, using `let v = 20 as const`, and TS will type that value as `type v = 20`, a **literal type**.

Let's say we have an object with routes for an API. This object has the following interface:

![](./image-5.png)

So far, TS's type inference is typing this object in the following way:

![](./image-7.png)

If we use `satisfies Rotas` at the end of the object, we'll change that inference a bit:

![](./image-8.png)

See that the booleans are now literals `true` or `false`. But if we have a function like this:

![](./image-9.png)

We can't call our route because the literal type `/` is different from the more generic `string` type, so we'll use `as const` on our object:

![](./image-11.png)

And now let's look at our types again:

![](./image-10.png)

See that they are fully inferred as readonly and with literal types, which allows us to pass the correct value to our function.

## Branded types

Branded types are a way to validate certain data types against a certain pattern, for example, if we want to validate that a monetary value is valid, we need two pieces of information: the currency and the amount of that currency.

But each currency, despite having equal values, are completely different, we can't pay 100 reais for something worth 100 dollars because R$100 is not the same as $100. For that we have **branded types**.

Branded types are types that have a _brand_ or _tag_, and can be defined like this:

![](./image-18.png)

The intersection of two types is a new type containing both properties of the other types. By default (but not required), a branded type is the union of a primitive type with an object that contains `__brand` or `__tag` (with 2 underscores).

> This is a community definition, you can call your object however you want.

But notice that if you try to run this code, we'll have an error saying we can't assign `200` to `Dolares`, this is because no branded type is assignable by default, they need to be forced or checked.

We'll talk about verification more here, but for now we can do the following workaround just so I can show you what their real use is:

![](./image-19.png)

Now let's say we need to convert our currencies, for that we'll create a function like this:

![](./image-20.png)

Now we have a function that **only accepts reals** and **only returns dollars**. So we guarantee that the returns from these functions are not the main primitives `number` but a variation of them that can't be specified directly.

If we create a type for reals and call the function, we won't have any errors:

![](./image-21.png)

This is how to work with branded types, they need to be received either as already-checked parameters, or as external data that needs to be checked and converted to a _branded_ type.

> **Note:** NEVER use direct type cast (with `as <type>`) to create a branded type, we'll see other safer ways to do this.

Going back to yesterday's subject about generics, can you see a way to improve our branded type? We can use a generic to create a `Branded<T,B>` type:

![](./image-22.png)

## Type guards and assertion functions

These are the two ways we can check and create a type cast from a normal type to a branded type as I mentioned earlier. While both can be used for the same thing, **assertion functions** and **type guards** are fundamentally different.

### Assertion Functions

Assertion functions, as the name already says, are functions that ensure a passed value is of a certain type, if they aren't, we have an error. In TypeScript, assertion functions are defined with the keyword `asserts <value> is <type>`:

![](./image-24.png)

This is a very useful example to demonstrate the power of branded types together with assertion functions. When working with databases, we need to ensure that a certain value is a UUID and not just any normal string, for that we use an assertion function like this:

![](./image-25.png)

See that we're throwing an error if our regex is not valid, this guarantees that whatever needs this string later, it will be a UUID.

> If you want to know what the UUID regex is that I cut because of space, it's this [one](https://ihateregex.io/expr/uuid/): `^_[0__-__9a__-__fA__-__F]_{8}\b-_[0__-__9a__-__fA__-__F]_{4}\b-_[0__-__9a__-__fA__-__F]_{4}\b-_[0__-__9a__-__fA__-__F]_{4}\b-_[0__-__9a__-__fA__-__F]_{12}$`

Thus, we can use it in the following way:

![](./image-26.png)

### Type Guards

Type guards are almost exactly the same as assertion functions, but instead of throwing an error, they return a boolean guaranteeing that they are of a certain type, using the syntax `<value> is <type>`:

![](./image-27.png)

Type guards are very useful when you want to validate a type but don't want the app to throw an error stopping execution, which is very useful, for example, if your value can be converted later to the required type.

Together with assertion functions, type guards are the safest ways to ensure that a certain type is of a certain "brand", but of course you can also use normal functions that return the value as `value as Brand`, given that you'll already do the validation before the return.

## Enums

Enumerators are present in most statically typed programming languages since forever. However, they [are not yet a reality in JavaScript](https://github.com/rbuckton/proposal-enum). TS implements the enumeration pattern, and they are not considered an advanced technique, but knowing when to use enums and when not to use them is.[^n1]

There are people against and others in favor of using enums, I personally like to use them quite a bit, but we have to agree that they have disadvantages, mainly because they are **the only TS construct that generates JavaScript code**. That's right, if you write an enum like this:

![](./image-28.png)

Unlike what TypeScript does with the rest of the types (the so-called _type erasure_) and erases them from the final code. This enum will be represented in the following way in real production code:

![](./image-29.png)

This happens because enums can be used both as types and as values:

![](./image-30.png)

In the function above, you can see that the parameter `a` is of type `Animal` and we call the function with the enum value. And an important detail is that **we can't use the string**, meaning we couldn't call `setAnimal('Dog')` because `'Dog'` is not an enum value.

> This isn't a big problem, but unfortunately, when we receive values from outside like APIs and such, we have to do a type cast in some cases to satisfy the enum.

Personally, I don't see a problem, especially because we won't see this code or work on it manually, but many believe it's not a good option. But what are the other options?

### Disjoint unions

Another way to do enums is to use disjoint unions, which are unions of literal types:

![](./image-31.png)

Here we don't have the enum code, but we also can't use its types anywhere, which leaves these strings scattered through the code. In a large system this can be very problematic.

> You can even "solve" this by assigning each value to a constant and using the constants as parameters, but that's not much better.

### Dictionary of constants

Another way is to create a dictionary:

![](./image-32.png)

It lets us use both the strings and the dictionary value, but we could pass any string there and it would also work, which is terrible.

To solve this we can use a constant dictionary of constants (complicated), basically it's adding an `as const` at the end, this makes the object become a disjoint union of strings:

![](./image-33.png)

### Constant enums

There's another way to declare an enum, which is a constant enum, meaning when you compile the code, all the values that were used in the enum will be placed literally in the final code, that is:

![](./image-34.png)

In this code, besides not being able to use the values as string (because we have an enum) the final JavaScript looks like this:

![](./image-35.png)

See that the enum no longer exists, except for the comment, you wouldn't even know it's an enum. This is great when you're creating your own applications because there's a notable reduction in memory and increase in speed in large projects, but [the official documentation](https://www.typescriptlang.org/docs/handbook/enums.html#const-enums) itself says they should not be shared with other projects, as we talked about on day 2 with declaration files.

> The only way to share const enums is by enabling a configuration called [`preserveConstEnums`](https://www.typescriptlang.org/tsconfig#preserveConstEnums) that essentially makes the const enum a normal enum.

## Practice exercises

How about we correct yesterday's exercises? The Flatten and FlattenDeep types can be found [here](https://www.typescriptlang.org/play?#code/PTAEGUEsFsAcBsCmBnAUAFwJ60aAYvAIbrqIB2APACqiIAepZAJsqIWZgNoC6AfKAF5QNeoxagAFJDIAzRACdQAVQCUPUAH5loAFzDUqEKACMoAPYBXUACZUAYzNlk6NnoLFGFTgHJj3gDSg3tbefIJBIYZgzvLSAOb2js6gAEZuRCTkFDHxPPxCvt4GUaAAIgCi4ACCeACSAPIlALQtrW1tBkYAciikTBjYuO6ZZKWIiLDUtAzk4uyY+cLTYqxSsgrKatygqKCa2qKzq9JyigAKWzt7e1rDjGMTFGf8u9d6Sq96VJ3R6LFkCQcThcdnSHnID0mnGhnByAO4CLCBT8P1AZAs0BSCkSwNATDBI0hFHRmIUi1sJXgkFI8kIkDQQOSiAJ93GUMKgR8IU53gAzAFQNDvAAWAU+ACsoURCMWhVQQA). The class implementation can be found [here](https://www.typescriptlang.org/play?#code/JYOwLgpgTgZghgYwgAgGIHsoFs7IN4BQyycUEuAFAJQBcyIArlgEbRHIBu6ANkytXUYs2AXwIEE3OAGdpyAIoM4AEygr0yYFgAO3CFgjg5GbLkLEE6ENLBQGCMJmQUy6kNwCeyKcvSCmrFBU+GLE7KTkAvQB0PjsxGRgDFAgyGAAFsDSAHQ+GgBU+cgATOxi7Fy8BlFCgXHEyInJqRlZuerIhcgAzGUE5ZIycgDCwFAIDNwaWrr6hmDGmDj1jeS+7l7KwHAGtn7RwlDslta29o5Qzq7rno1wwPu10MHmDa05WzsQe8gAvHcPfKlYjlYgRSgveKrJIpZAAWTgGWyAAUAJKdeGI9LZbToADuFHe2TUDwANCUqH0Kjw+M5IQ1oc1nAAWDEIpFotlYnH4wmZHIk9Dk7pUKgAel6IP64kGsmQABUoNsQABzSbTHR6AxGNBLMzHKw2OwOJwuNZWW7MGQQfyHcnXC1eODcGFwW2BF6gkiuOkrBLfJl8tpW6QoIpE52u4JikpU4iVWnUfDIMUx5FK6TLWzKtVSI4NJqwiOuJPh-nZSPJOB9ERAA).

For today's challenge:

-   Using the type declarations we saw before, extend the native JavaScript `setTimeout` and `setInterval` methods to return a branded type of `TimeoutID` and `IntervalID`, then extend the `clearTimeout` and `clearInterval` functions to accept only branded types as parameters and not just any number.

> Don't forget to leave your feedback about #SemanaTS here [in this form](https://forms.gle/6hAqjVmah9uyR4by8)!

[^n1]: My former coworker, Robin Pokorny, has [a great article](https://robinpokorny.com/blog/typescript-enums-i-want-to-actually-use/) about this on his blog, I'll try to summarize this point with my opinions, but it's worth reading.
