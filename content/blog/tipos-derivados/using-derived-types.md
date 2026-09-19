---
title: Using derived types
pubDate: 2024-09-11T11:00:14.000Z
updatedDate: 2026-07-16T17:51:23.000Z
category: typescript
tags:
  - typescript
  - javascript
lang: en
description: When should we be smarter about coupling our types to other types? When does repeating code make sense?
slug: using-derived-types
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

When I talk to someone about TypeScript, one of the things that inevitably comes up is the question:

> When do we need to create a new type or when do we derive from another type?

For those in [Formação TS](https://formacaots.com.br), you know that I'm a big fan of deriving types, writing in one place and using variations of that type everywhere else. It's an application of the **DRY** principle (_don´t repeat yourself_) that we can apply to both code and types. And when I say a derived type I'm talking about things like this:

```ts
interface Person {
  name: string;
  id: string;
}

interface Employee extends Person {
  salary: number;
}
```

Notice that we're extending an interface to create a second interface, which contains the types of the first, but isn't exactly the same. And this happens not only with interfaces, but with any other type that depends on another type, such as union types and intersection types:

```ts
type Person = { name: string, id: string }
type Employee = Person & { salary: number }

type Cat = {
  type: 'cat';
  meow: () => void;
}

type Dog = {
  type: 'dog';
  woof: () => void;
}

type Animal = Cat | Dog;
```

Derived types cannot modify the original types, but they can modify the types derived from them. For example, `Employee` cannot modify `Person`, but if another type extends `Employee`, then it can modify that type because if any of its properties change, the other type will be modified too.

When this happens we say the type is **coupled**, because the derived type depends on the original type.

## Is coupling worth it?

Coupled, or derived types, are great when we're dealing with the same "domain". For example, as I mentioned in the [last article on enums](/enums-no-typescript/), usually when we're using enums, one option is to create objects with [`as const`](/entenda-o-que-e-as-const-no-typescript/) and then create the list of values as a separate type:

```ts
const envs = {
  PROD: 'production', 
  DEV: 'development',
  TEST: 'test'
} as const

type Envs = (typeof envs)[keyof typeof envs]
```

If we didn't do that, we would have to duplicate all the values of that object twice, which would create two sources of information we'd need to maintain.

Another case where it's very interesting to derive types is when we're dealing with variations of input types in an API. For example, we have a payload for creating a user:

```ts
interface User {
  id: string
  name: string;
  age: number;
}

type UserCreate = Omit<User, 'id'>
```

In this case it makes sense to have a derivation because our user entity always has an ID when it's created, but when we want to create a user, we don't need to send an ID. The same applies when we're going to update a user, we cannot send the ID and all objects can be optional:

```ts
type UserUpdate = Omit<Partial<User>, 'id'>
```

In other words, it makes a lot of sense to derive if we're dealing with the same entity and both types are part of a whole that doesn't make sense if they're separated. The great advantage is that you can modify the type in one place and it will be automatically propagated throughout the project, which makes development much easier. But these chains of derivation can become more complicated when they get very long because they can have unwanted effects.

## When does decoupling make more sense?

Contrary to what we're used to, decoupling types makes a lot of sense when we're dealing with parts of the data from a complete type. For example, a function that takes only the user's name, or just the name and age.

```ts
import type { User } from 'types'

function calculate(age: User['age']) {}
```

This seems like a simple example, but notice that now the entire file depends on this type in the types folder. If it changes location, all files that depend on it will be affected. Plus, we're decoupling a single property for a use case that may not be known to our user.

> If you're in doubt, imagine the following question: "If I derive this type, when the original type changes, will it sound strange?"

If the answer is yes, decouple the type. And what does "sound strange" mean? For example, if we change a utility file to calculate a user's age to display on a screen, we shouldn't have to modify our database for the same thing.

In the end it's all about observing the work you'll have to maintain in the future. Perhaps the right question to ask is:

> If I decouple, will I have more work to maintain?

So the basic rule is:

-   If, when one type changes, the other **needs** to be changed, then couple them
-   If a derived type creates more work for you when changed, decouple it
