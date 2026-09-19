---
title: Simpler CLIs with Util.parseArgs
pubDate: 2022-10-20T13:00:04.000Z
updatedDate: 2026-07-16T16:05:43.000Z
category: javascript
tags:
  - nodejs
  - javascript
  - typescript
lang: en
description: Learn how Node.js made building command-line tools easier with the new parseArgs method!
slug: simpler-clis-with-util-parseargs
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Command-line applications, often called CLIs (Command Line Interfaces), are extremely common, especially when working with developers.

These applications are typically orders of magnitude lighter than graphical applications, simpler to use, and allow automation and scripting natively. However, this comes at the cost of interface polish and some user experience, since you need some knowledge, or sometimes quite a bit, of command-line environments to get started with basic functionality.

While the UI side is becoming increasingly advanced with libraries like [blessed](https://github.com/chjj/blessed), and UX is getting more advanced with libraries like [inquirer](https://github.com/SBoudrias/Inquirer.js), the DX, or Developer Experience, remains the same. Developing a CLI ends up being complicated and full of little hacks we have to make, especially to understand what the user sent in the initial command, the so-called arguments.

Today, popular libraries like [Yargs](http://yargs.js.org/), [commander](https://github.com/tj/commander.js/), [meow](https://github.com/sindresorhus/meow), and [caporal](https://caporal.io) make the task of fetching command-line arguments and passing them to the application to execute something easier. But this is something so simple that people wonder: "Why isn't this native to Node.js?" Well, that wait is over.

## `util.parseArgs`

In version 18, Node.js implemented an **experimental** API called `util.parseArgs`. The goal is to make it easier and automate how we fetch command-line arguments to improve (and even eliminate) the need for external libraries to do the same thing.

It has a pretty simple API that takes only a configuration object:

```js
import { parseArgs } from 'node:util'
const { values, positionals } = parseArgs({ args, options })
```

The configuration object has four options:

-   `args`: The array of arguments we want to parse. By default, it will be `process.argv` with the first two arguments removed (the `execPath` and `filename`, which are the path to the Node command that was executed and the name of the file that's running), leaving only what comes after.
-   `options`: Another object used to define which arguments are recognized as valid by the program. This key is required and is an object with items that should follow this interface:
    -   `type`: A string defining the type of the argument. Currently, `parseArgs` only supports `string` and `boolean`
    -   `multiple`: A boolean that defines whether the argument can be passed multiple times. If `true`, all values for that argument are collected in an array. Otherwise, the last set option is used. Defaults to `false`
    -   `short`: A single-character alias for the option. For example, if `--all` has the abbreviation `-A`, then `short` would be `A`
-   `strict`: Whether the program should throw an error if an unrecognized argument is passed. Defaults to `true`
-   `allowPositionals`: Whether the command accepts positional arguments, that is, arguments without flags like `-a`. These arguments will be received in a separate array that we destructure as `positionals`
-   `tokens`: Returns the tokens that were passed. This is more useful when you want to extend the behavior of the original function, not as much when you just want to use the basic functionality.

The return value of `parseArgs` is an object with three keys:

-   `values`: A map of all option names with their respective values
-   `positionals`: An array of strings with the positional arguments passed, in order.
-   `tokens`: An array of objects returned if the `tokens` configuration option is `true`

The token object can have tokens of two types, either options or positional arguments. All of them will be returned in a single object that has all the tokens. All values in this object will have at least two keys:

-   `kind`: Either `option`, `positional`, or `option-terminator`
-   `index`: The index of the element in the arguments array, so the original argument of a token can be obtained with `args[token.index]`

For option-type tokens (those with flags), we'll have some extra properties:

-   `name`: The **long** name of the token, for example `all`
-   `rawName`: The original name of the option, without removing the dashes, the way it was passed to the command, for example `--all`
-   `value`: The value of the argument. If it's a boolean, this value will be `undefined`
-   `inlineValue`: Whether the value was specified inline like `--foo=bar`

For positional arguments without options, we only have the value in a `value` key, which is equivalent to `args[index]`.

These tokens are always returned in the order they were passed, so it's possible to extend the functionality if you need to support one type of argument before another.

Another important thing is when we have so-called short option groups, cases like `-abc`. In these cases, each one will be expanded to a different token, so if we have common cases like `-vvv`, we'll have three option-type tokens.

Let's look at some examples.

### Simple options

Imagine we have the following code:

```js
const options = {
  verbose: {
    type: 'boolean',
    short: 'v',
  },
  color: {
    type: 'string',
    short: 'c',
  },
  times: {
    type: 'string',
    short: 't',
  },
}

const { values, positionals } = parseArgs({options, args: ['-v', '-c', 'green']})
```

We'll have the following object in `values`:

```js
{
  __proto__: null,
  verbose: true,
  color: 'green'
}
```

Our `positionals` array will be empty because we're not specifying that we want positionals. Notice that in `values`, the keys are always the full option names.

### Positional parameters

If we modify the code to allow `positionals` like this:

```js
const { values, positionals } = parseArgs({
    options,
    allowPositionals: true,
    args: [
      'home.html', '--verbose', 'main.js', '--color', 'red', 'post.md'
    ]
  })
```

We'll have the following output in `values`:

```js
{
    __proto__:null,
    verbose: true,
    color: 'red'
}
```

But now we'll have an array of positional options in `positionals`:

```js
['home.html', 'main.js', 'post.md']
```

Notice that they appear in the order we're sending them in the code.

### Multiple options

If we use the same option multiple times normally, as I mentioned before, only one key will be created, for example:

```js
const options = {
  'bool': {
    type: 'boolean',
  },
  'str': {
    type: 'string',
  },
}
parseArgs({
  options, args: [
    '--bool', '--bool', '--str', 'yes', '--str', 'no'
  ]
})
```

We'll have a `values` like:

```js
{
  __proto__:null,
  bool: true,
  str: 'no'
}
```

Notice that we only have the last value of the option. Now, if we pass the `multiple` parameter to any option type in our `options` object:

```js
const options = {
  'bool': {
    type: 'boolean',
    multiple: true,
  },
  'str': {
    type: 'string',
    multiple: true,
  },
}
parseArgs({
  options, args: [
    '--bool', '--bool', '--str', 'yes', '--str', 'no'
  ]
})
```

We'll have the following value in `values`:

```js
{
  __proto__:null,
  bool: [ true, true ],
  str: [ 'yes', 'no' ]
}
```

### Short option groups

There's a type of value we can pass to a command line that's known as a **shorthand**. The idea is that when we set multiple boolean options, we can group them all under a single `-`. For example, instead of `main.js -v -s`, we can do `main.js -vs`.

This also works in `parseArgs` without needing to do anything extra. We just need to set the `short` option for these properties:

```js
const options = {
  'verbose': {
    type: 'boolean',
    short: 'v',
  },
  'silent': {
    type: 'boolean',
    short: 's',
  },
  'color': {
    type: 'string',
    short: 'c',
  },
}
parseArgs({options, args: ['-vs']})
```

It will give us this `values` object:

```js
{
  __proto__:null,
  verbose: true,
  silent: true,
}
```

### Option terminators

There's a specific type of option called a **terminator**. After this argument, everything else is treated as positional. In most shells, this option is `--`. For example, when we wanted to run an NPM command and send an argument to the command that would be executed, we'd do: `npm run <command> -- param param param`, and the command would receive the three parameters individually. The same applies to `parseArgs`:

```js
const options = {
  'verbose': {
    type: 'boolean',
  },
  'count': {
    type: 'string',
  },
}

parseArgs({options, allowPositionals: true,
 args: [
   'how', 
   '--verbose', 
   'are', 
   '--', 
   '--count', 
   '5', 
   'you'
 ]
})
```

The `values` object will be:

```js
{
  __proto__:null,
  verbose: true
}
```

And we'll have the `positionals`:

```js
[ 'how', 'are', '--count', '5', 'you' ]
```

Notice that when we use a terminator, all remaining values are considered positional.

## Tokens

When we talk about tokens, the functionality is a bit more complex. To explain this, we need to explain how this API actually works.

The `parseArgs` works in two phases:

-   The first phase is parsing the arguments array into a tokens array. The goal is to have a sort of parsed arguments array like the one we already have, but with type annotations, indicating if the argument is an option, a positional argument, etc.
-   In the second phase, the output of this first phase is read by the parser and we end up with the array we had before.

We can access the first part as an output if we set the configuration array with the `tokens` option as `true`. Then we'll have a `tokens` key in the final output.

The type of this object will be the following interface (as explained [here](https://2ality.com/2022/08/node-util-parseargs.html#parseargs-tokens)):

```ts
type Token = OptionToken | PositionalToken | OptionTerminatorToken;

interface CommonTokenProperties {
    /** Where does the token start in the string? */
  index: number;
}

interface OptionToken extends CommonTokenProperties {
  kind: 'option';

  /** Long name */
  name: string;

  /** The name of the option in the `args` array */
  rawName: string;

  /** The value of the option. Always `undefined` for boolean. */
  value: string | undefined;

  /** Is the value inline (ex --level=5)? */
  inlineValue: boolean | undefined;
}

interface PositionalToken extends CommonTokenProperties {
  kind: 'positional';

  /** The value of the positional argument, args[token.index] */
  value: string;
}

interface OptionTerminatorToken extends CommonTokenProperties {
  kind: 'option-terminator';
}
```

Let's look at an example. Say we have the following options array:

```js
const options = {
  'bool': {
    type: 'boolean',
    short: 'b',
  },
  'flag': {
    type: 'boolean',
    short: 'f',
  },
  'str': {
    type: 'string',
    short: 's',
  },
}
```

When we run `parseArgs({ options, tokens: true, args: [ '--bool', '-b', '-bf' ] })`, we get the following object:

```js
{
    values: {
      __proto__:null,
      bool: true,
      flag: true,
    },
    positionals: [],
    tokens: [
      {
        kind: 'option',
        name: 'bool',
        rawName: '--bool',
        index: 0,
        value: undefined,
        inlineValue: undefined
      },
      {
        kind: 'option',
        name: 'bool',
        rawName: '-b',
        index: 1,
        value: undefined,
        inlineValue: undefined
      },
      {
        kind: 'option',
        name: 'bool',
        rawName: '-b',
        index: 2,
        value: undefined,
        inlineValue: undefined
      },
      {
        kind: 'option',
        name: 'flag',
        rawName: '-f',
        index: 2,
        value: undefined,
        inlineValue: undefined
      },
    ]
  }
```

It's important to note that even though we have a single option called `bool`, we have three indices in the array because we're passing the key three times. A more complete example can be using terminators and also inline values like this:

```js
parseArgs({
    options, allowPositionals: true, tokens: true,
    args: [
      'command', '--', '--str', 'yes', '--str=yes'
    ]
})
```

Which gives us the following output:

```js
{
    values: {
      __proto__:null,
    },
    positionals: [ 'command', '--str', 'yes', '--str=yes' ],
    tokens: [
      { kind: 'positional', index: 0, value: 'command' },
      { kind: 'option-terminator', index: 1 },
      { kind: 'positional', index: 2, value: '--str' },
      { kind: 'positional', index: 3, value: 'yes' },
      { kind: 'positional', index: 4, value: '--str=yes' }
    ]
  }
```

Notice that when we use a terminator, all remaining values are considered positional.

An example would be using this functionality to implement a CLI that uses subcommands, like git with `git commit` or Azure with `az aks create`. I'll go through [this implementation](https://2ality.com/2022/08/node-util-parseargs.html#using-tokens-to-implement-subcommands) explaining how it would work.

First, let's define a function to fetch the first command, which is a positional, and then we'll fetch the first positional element we find:

```js
function parseSubcommand(config) {
  // Allowing positionals since the subcommand is positional
  const {tokens} = parseArgs({
    ...config, tokens: true, allowPositionals: true
  });
  // Find the first occurrence of the positional
  let firstPosToken = tokens.find(({kind}) => kind==='positional');
  if (!firstPosToken) {
    throw new Error('Command name is missing: ' + config.args);
  }
```

Then we'll get the command's options and call parseArgs again:

```js
  const cmdArgs = config.args.slice(0, firstPosToken.index);
  // Replace the occurrence in `config.args`
  const commandResult = parseArgs({
    ...config, args: cmdArgs, tokens: false, allowPositionals: false
  })
```

Now we'll get the subcommand of this command:

```js
  const subcommandName = firstPosToken.value

  const subcmdArgs = config.args.slice(firstPosToken.index+1)
  // Replace `config.args`
  const subcommandResult = parseArgs({
    ...config, args: subcmdArgs, tokens: false
  })

  return {
    commandResult,
    subcommandName,
    subcommandResult,
  }
}
```

The entire function would look like this:

```js
function parseSubcommand(config) {
  const {tokens} = parseArgs({
    ...config, tokens: true, allowPositionals: true
  })
  let firstPosToken = tokens.find(({kind}) => kind==='positional')
  if (!firstPosToken) {
    throw new Error('Command name is missing: ' + config.args)
  }

  //----- Command options
  const cmdArgs = config.args.slice(0, firstPosToken.index)
  const commandResult = parseArgs({
    ...config, args: cmdArgs, tokens: false, allowPositionals: false
  })

  //----- Subcommand
  const subcommandName = firstPosToken.value;

  const subcmdArgs = config.args.slice(firstPosToken.index+1)
  const subcommandResult = parseArgs({
    ...config, args: subcmdArgs, tokens: false
  })

  return {
    commandResult,
    subcommandName,
    subcommandResult,
  }
}
```

## Conclusion

The `parseArgs` is an excellent option for making CLI creation easier and showing how we can further improve application development with Node.js. Don't forget to read the official documentation and the article I showed in this post!
