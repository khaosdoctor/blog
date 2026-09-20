---
title: Getting Started with ECMAScript Modules
pubDate: 2021-06-23T11:00:00.000Z
updatedDate: 2026-07-16T16:14:16.000Z
category: technology
tags: ["javascript", "nodejs", "typescript"]
lang: en
description: ES Modules are the next generation of module imports in JavaScript. Learn how this feature promises to revolutionize what we know.
slug: getting-started-with-ecmascript-modules
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

It has been a while since people have been talking about using ECMAScript Modules in our packages and JavaScript code. Although the model has been supported on the web as a whole through a `<script type="module">` tag for some time, only now with the official deprecation of Node 10 in favor of Node 16 can we have this complete support on the server![^n1]

## A bit of history

Since 2012 there have been conversations on GitHub and in the official TC39 repositories for the standard implementation of a new module system that would be more appropriate for the new era of JavaScript.

Currently, the most common model used is the famous `CommonJS`, with it we have the classic syntax of `require()` at the top of Node.js modules, but it was not [officially supported by browsers](https://stackoverflow.com/questions/7576001/how-can-i-require-commonjs-modules-in-the-browser) without the help of external plugins like Browserify and RequireJS.

The demand for a module system started from there. With people wanting to modularize their JavaScript applications on the client side as well, but implementing a module system is not easy and it took several years for an acceptable implementation to emerge.

With that, we now have what is called ESM (ECMAScript Modules), which many people already knew about, mainly because it is a syntax that has been part of TypeScript since its creation, in other words, we will no longer work with modules through `require()`, but rather through an `imports` key and another `exports` key.

## CommonJS

In a classic example of CommonJS usage we might have code like this:

```javascript
function foo () { }

module.exports = foo
```

Notice that everything that Node.js (in this case) will read is an object called `module`, inside this we are defining a key `exports` that contains the list of things we are going to export from this module. Then, another file will be able to import it like this:

```js
const foo = require('./foo')
```

When we import a module using this syntax, we are loading it synchronously, because the module resolution algorithm must first find the type of the module, if it is a local module it is mandatory that it starts with `./` otherwise the module resolution will look in the known folders for existing modules.

After finding the module, we need to read the content, parse it, and generate the `module` object that will be used to discover what we can and cannot import from this module.

This type of import, mainly because it is synchronous, causes some problems when running applications in the more asynchronous nature of Node.js, so many people ended up importing modules only when necessary.

## ESM

In ESM we have a drastic change of paradigm. Instead of importing modules synchronously, we are going to start importing asynchronously, in other words, we will not block the event loop with some kind of I/O.

Moreover, we no longer have to manually define what modules import or export, this is done through the two keywords `imports` and `exports`, whenever parsed, the compiler will identify a new symbol that will be exported or imported and automatically add it to the export list.

ESM also comes with some default rules that make module resolution more precise and therefore faster. For example, it is always mandatory that you add the file extension when importing a module. This means that importing modules by file name alone is no longer valid:

```js
import foo from './foo.js'
```

This means the resolution system does not need to know what type of file we are trying to import, because with `require()` we can import various file types besides `.js`, like JSON. This leads us to the second major change, many file types that were previously supported by direct import now need to be read via `fs.promises.readFile`.

For example, when we wanted to import a JSON file directly, we could run a `require('arquivo.json')`, but now we no longer have this capability and we need to use the file reading module to read JSON natively.[^n2]

So, to import JSON as an object you can do it like this:

```js
import {promises as fs} from 'fs';

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'))
```

Every path to a module in ESM is a URL, so the model supports some valid protocols like `file:`, `node:` and `data:`. This means we can import a native Node module with:

```js
import fs from 'node:fs/promises'
```

We won't go into detail here, but you can check more about this feature in the [Node documentation](https://nodejs.org/api/esm.html#esm_urls).

ESM also supports a new file extension called `.mjs`, which is very useful because we don't need to worry about configuration, since Node and JavaScript already know how to resolve this type of file.

Other changes include the **removal** of variables like `__dirname` inside modules in Node.js. This is because, by default, modules have an object called `import.meta`, which contains all the information of that module, which was previously populated by the runtime in a global variable, in other words, we have one less global state to worry about.

To be able to resolve a local module path without using `__dirname`, a good option is to use `fileURLToPath`:

```js
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
```

Although you can also import using the URL directly with `new URL(import.meta.url)` since many Node APIs accept URLs as parameters.

Finally, the most anticipated of all the changes that came in modules is **top-level await**, that's right, we no longer need to be inside an `async` function to execute an `await`, but this only applies to modules! So things like this will be very common:

```js
async function foo () {
  console.log('Hello')
}

await foo() // Hello
```

We already had to use this functionality inside our function to read a JSON file.

## Interoperability

ESM took so long because it needed to be minimally compatible with CommonJS as it was at the time, so interoperability between the two is very important, since we have far more modules in CommonJS than in ESM.

In CJS (CommonJS) we had the possibility of an asynchronous import using the `import()` function, and these expressions are supported within CJS to load modules that are written in ESM. So we can perform an import of an ESM module like this:

```js
// esm.mjs
export function foo () {
  return 1
}

// cjs.js
const esm = import('./esm.mjs')
esm.then(console.log) // { foo: [λ: foo], [Symbol(Symbol.toStringTag)]: 'Module' }
```

On the other hand, we can use the same `import` syntax for a CJS module, but we must keep in mind that every CJS module comes with a namespace, in the default case of a module like the one below, the namespace will be `default`:

```js
function foo () { }
module.exports = foo
```

And, therefore, to import this module we can import its namespace through a _named import_:

```js
import {default as cjs} from './cjs.js'
```

Or through a standard import:

```js
import cjs from './cjs.js'
```

> If you want to see what an export of a CJS module looks like, just execute a general import with `import * as cjs from './cjs.js'` and log the result in the console.

In the case of Node.js, we also have a great option where, when we use named exports with CJS, like this:

```js
exports.foo = () => {}
exports.bar = () => {}
```

The runtime will try to resolve each key in `exports` to a named `import`, in other words, we will be able to do this:

```js
import { foo } from './cjs.js'
```

## Main differences

Let's summarize the main differences between the two types of module systems so we can learn how to use them:

-   In ESM there is no `require`, `exports` or `module.exports`
-   We don't have the famous _dunder vars_ like `filename` and `dirname`, instead we have `import.meta.url`
-   We can't load JSON as modules, we have to read through `fs.promises.readFile` or `module.createRequire`
-   We cannot directly load Native Modules
-   We no longer have `NODE_PATH`
-   We no longer have `require.resolve` to resolve relative paths, instead we can build a URL with `new URL('./path', import.meta.url)`
-   We no longer have `require.extensions` or `require.cache`
-   Because they are full URLs, ESM modules can take query strings like they are HTML pages, so it is possible to do something like this `import {foo} from './module?query=string'`, this is interesting for when we need to bypass the cache.

## Using ESM with Node.js

There are two ways to use ESM, through `.mjs` files or by adding the `type` key in `package.json` with the value `"module"`, this will allow you to continue using `.js` extensions but with modules instead of CJS.

```jsonc
// Using CJS
{
  "name": "package",
  "version": "0.0.1",
  "description": "",
  "main": "index.js",
}

// Using ESM
{
  "name": "package",
  "version": "0.0.1",
  "description": "",
  "type": "module",
  "exports": "./index.mjs",
}
```

If you are creating a new JavaScript package from scratch, prefer to start with ESM, for that you don't even need to add a `type` key in your `package.json`, just change the `"main"` key to `exports` like in this example:

```jsonc
// Using CJS
{
  "name": "package",
  "version": "0.0.1",
  "description": "",
  "main": "index.js",
}

// Using ESM
{
  "name": "package",
  "version": "0.0.1",
  "description": "",
  "exports": "./index.mjs",
}
```

Another important step is to add the `engines` key restricting which versions of Node can run your package without breaking, for this key use the values `"node": "^12.20.0 || ^14.13.1 || >=16.0.0"`.

If you are using `'use strict'` in any file, remove them.

From there on all your files will be modules and will need standard refactors, like replacing `require` with `import` and adding extensions to local file names. As we mentioned earlier.

## ESM with TypeScript

Despite using the ESM model for some time, TypeScript does not usually generate compiled JavaScript in ESM mode, only in CJS. So that we can force the use of ESM even in the distribution files generated by TS, we will need some basic configurations.

First let's edit our `package.json` as if we were creating a normal JS module. This means doing this list of things:

-   Create a `"type": "module"` key
-   Replace `"main": "index.js"` with `"exports": "./index.js"`
-   Add the `"engines"` key with the value of the `"node"` property for the versions we showed earlier

Then, we will generate a `tsconfig.json` file with `tsc --init` and modify it to add a `"module": "ES2020"` key. This will already be sufficient for the final files to be exposed as ESM, but there are some precautions we must take when writing our files in TypeScript:

-   Do not use partial relative imports like `import index from '.'`, **always** use the full path `import index from './index.js'`
-   It is recommended to use the `node:` protocol to import native Node modules like `fs`

The most important part and also the one that, in my opinion, is the one that most leaves to be desired for using ESM with TS is that **we always need to import files with the `.js` extension, even if we are using `.ts`,** in other words, if inside a file `a.ts` you want to import the module present in `b.ts`, you will need an import like `import {b} from './b.js'`.

This is because when compiling, since TS already natively uses ESM as syntax, it will not remove or correct the import lines of your source files.

[^n1]: See an example of ESM module usage in the browser [in this repository](https://github.com/khaosdoctor/js-containerd-example/tree/main/child-process/static)

[^n2]: There is still an experimental API to enable the functionality in Node.js but it comes disabled by default, see more about it [here](https://nodejs.org/api/esm.html#esm_json_modules)
