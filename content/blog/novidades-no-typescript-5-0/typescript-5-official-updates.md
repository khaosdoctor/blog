---
title: TypeScript 5.0's Official Features
pubDate: 2023-03-23T11:00:38.000Z
updatedDate: 2026-07-16T16:03:10.000Z
category: technology
tags: ["typescript"]
lang: en
description: It's official! TypeScript has released version 5.0, and I'm going to tell you all about what's new!
slug: typescript-5-official-updates
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

It's official! In my [last post](/typescript-5/) on this subject, I covered the semi-official release of TS 5.0. The beta version was almost ready but still wasn't fully 100%, so I'm covering a new release here with all the official features that came out in the latest version of our blue friend!

The vast majority of the features stayed the same, so the [post](/typescript-5/) is still valid and I won't repeat myself here, but I'll show you the main differences since the RC beta and the official release.

## Decorators

The first change came in decorators. If you remember correctly, decorators are small functions that can be used as language constructs that will add behavior to an existing function, like adding a debug log:

```ts
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    @loggedMethod
    greet() {
        console.log(`Hello, my name is ${this.name}.`);
    }
}

const p = new Person("Ron");
p.greet();

// Output:
//
//   LOG: Entering method.
//   Hello, my name is Ron.
//   LOG: Exiting method.
```

Decorators have their own syntax (with the `@`), but they are simple functions. The decorator we're calling in this function has the following implementation:

```ts
function loggedMethod(originalMethod: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name);

    function replacementMethod(this: any, ...args: any[]) {
        console.log(`LOG: Entering method '${methodName}'.`)
        const result = originalMethod.call(this, ...args);
        console.log(`LOG: Exiting method '${methodName}'.`)
        return result;
    }

    return replacementMethod;
}
```

Basically it's a function that returns a function. The difference between the RC and the final version is that decorators can now be used before declarations like `export` and `export default`, before you could only use a decorator on a direct declaration and then export the function.

## Module Resolution = Bundler

Another change that was introduced in TypeScript 5.0 is actually an addition to a modification created in 4.7. In that version, the `module` key received two new options, `node16` and `nodenext` that precisely modeled how Node.js handled [ESModules](/os-ecmascript-modules-estao-aqui/). However, Node has several restrictions that don't exist in other tools, the main one being that imported files need to have the extension explicitly specified:

```ts
import * as utils from './utils.mjs'
```

This wasn't true for most bundlers or other tooling that have a more relaxed resolution more similar to what `node` already offered, but the other problem is that the implementation was outdated. That's why a new `moduleResolution` option was added, the `bundler`.

For this change, the difference between the RC and the final version is that the `bundler` type can now only be used if the `module` flag is `esnext`. This was done, according to the team, to ensure that all `import`s aren't transformed to require before the bundler resolves dependencies.

## Compiler Changes

While we had several great changes in this version, the compiler got the most gains! The entire compiler was moved to modules, as [the team described here](https://devblogs.microsoft.com/typescript/typescripts-migration-to-modules/), and this brought some things:

-   TS only runs on Node versions higher than 12, because it's the first that supports ESM
-   The package size was reduced by 46%
-   Project build time increased by 10% to 25%

These optimizations become even more evident when we look at [these graphs](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#speed-memory-and-package-size-optimizations) showing that the package went from 64mb to 37mb:

![](./image-12.png)

Also, the migration to modules turned TS into a rocket, with performance increases not only in execution but also in installation, as shown by the benchmark compared to the previous version:

![](./image-13.png)

## Conclusion

All other changes remained the same, so I strongly recommend you read the original article about the changes that came in the RC, because they are very useful and can help you have more tools to build your applications.

[TypeScript 5.0 Beta Features](/typescript-5/)

This was a short article, but worth highlighting, especially for the performance gains and notable changes in TypeScript's heart.
