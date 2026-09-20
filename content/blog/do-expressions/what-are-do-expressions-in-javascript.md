---
title: What are "do expressions" in JavaScript?
pubDate: 2022-09-07T13:00:17.000Z
updatedDate: 2026-07-16T16:06:41.000Z
category: technology
tags: ["javascript"]
lang: en
description: Understand what one of the most famous and important forms of expressions coming to JavaScript soon is!
seoTitle: What are "do expressions" in JavaScript?
slug: what-are-do-expressions-in-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In yet another series of articles about the most recent and exciting proposals we have at [TC39](https://github.com/tc39/proposals) I bring you another one of these ideas that I find super cool and really hope (and give my support when possible) they enter the language in the future.

Today we're going to talk about a really interesting proposal, it's not something new, especially for those who have already heard about **functional programming**. The proposal touches on what is called _[do expressions](https://github.com/tc39/proposal-do-expressions)_, or block expressions.

> This is still a proposal in stage 1, meaning there's a good chance it could be rejected, however, since it's been open for about 5 years, I believe there's still hope!

## Do expressions

The proposal introduces the idea of a "new" keyword for JavaScript, the `do`. I say "new" because this keyword already exists in expressions like `do while`, so the syntactic part of the language becomes (somewhat) simpler.

A `do` block is what we call _expression-oriented programming_, where the result of an assignment, like `const x = 1`, can be the result of a more complex expression. This simplifies code writing a lot so you're not using ternaries all the time, which are good, but hard to read.

Some examples we can give of this type of use are so we can have variables with the smallest possible scope, avoiding them leaking elsewhere. For example, if we want to do an operation with a variable X, instead of doing this:

```js
function main(x, y, options) {
  const finalX = par(x) && !options?.useY ? x + y : !par(x) ? x * 2 : 10
  return options?.useY && options?.fromZero ? finalX-- : finalX
}
```

Which is quite complex code to read, or we can simplify a bit with:

```js
function main(x, y, options) {
  let finalX = 10
  if (par(x) && !options?.useY) finalX = x + y
  else if (!par(x)) finalX = x * 2
  if (options?.useY && options?.fromZero) finalX--
  return finalX
}
```

But then we would have an accumulator variable `finalX` within the function scope. If that function were long, we could have a memory leak. What if we could leave that entire expression within the same scope? That's what's being proposed here:

```js
function main (x, y, options) {
  return do {
    let finalX = 10
    if (par(x) && !options?.useY) finalX = x + y
    else if (!par(x)) finalX = x * 2
    if (options?.useY && options?.fromZero) finalX--
    finalX
  }
}
```

Or, if you only need to assign to a variable:

```js
function main (x, y, options) {
  const x = do {
    let finalX = 10
    if (par(x) && !options?.useY) finalX = x + y
    else if (!par(x)) finalX = x * 2
    if (options?.useY && options?.fromZero) finalX--
    finalX
  }
  // Rest of the code
}
```

This might not be the best example, but with this style of development you can reduce the scope to the smallest possible unit, the expression unit. This way the garbage collector of your runtime will know when resources can be freed more efficiently, since expressions can be completely discarded when they finish.

### Uses

Some interesting uses:

1. Minimal scope for variables:

```js
let x = do {
  let tmp = f();
  tmp * tmp + 1
};
```

2. Use of conditionals for more readable code:

```js
let x = do {
  if (foo()) { f() }
  else if (bar()) { g() }
  else { h() }
};
```

3. _do expressions_ have an excellent use for templating languages, like JSX:

```js
return (
  <nav>
    <Home />
    {
      do {
        if (loggedIn) {
          <LogoutButton />
        } else {
          <LoginButton />
        }
      }
    }
  </nav>
)
```

### What is allowed

Beyond simpler cases, some more complex cases, the so-called _edge cases_ are also allowed. For example:

#### Assignment using `var`

By default, any type of variable assignment returns an empty result. This is why (as I'll show soon) it's not possible to assign any type of variable as an expression, except when we're using `var`. The scope of the variable would be global and the value could undergo a _hoist_ to the top of the local function.

#### Empty

You can use a `do {}`, which would be equivalent to having a function with `void 0`

```js
function v () {
    return void 0
}
```

#### Asynchronism with `await` or `yield`

You can use `await` or `yield` depending on the scope of the function that contains the `do`. For example, if your function is an `async` function, you can use a `do { await ... }`. If it's a [generator](https://medium.com/trainingcenter/javascript-entendendo-generators-408cbce9aee) the same applies to `yield x`.

#### Errors with `throw`

The `throw` works the way we expect, meaning we can throw an error inside a `do` expression:

```js
const p = do {
    if (!p?.prop) throw new Error('Ops')
    else p.prop * 2
}
```

#### Control flow breaks with `break`, `continue` or `return`

Similarly, you can use control flow keywords when you're in an appropriate scope. For example, using a `return` if the `do` is inside a function. The same way it's possible to use `continue` or `break` inside loops.

Remember that `return` will return from the entire function, not just from the `do`. So:

```js
function getUserId(blob) {
  let obj = do {
    try {
      JSON.parse(blob)
    } catch {
      return null; // exits the function with null return
    }
  };
  return obj?.userId;
}
```

A special case is that JS can get confused when the `continue` and `break` expressions don't have what we call a _label_. A label is a way of telling the runtime that that expression has a name, so we can tell JS exactly which control structure we're referring to. This is especially useful when we have nested loops:

```js
outer:
for (let i = 0; i < 5; i++) {
    inner:
    for (let j = 0; j < 10; j++) {
        if (i % 2 === 0) break outer
    }
}
```

That way, it's not possible to have `continue` or `break` without a label in `do`.

#### Function parameters

You can also use `do` inside function parameters, and they accept `return`:

```js
function foo (p = do { 
               if (!x) throw new Error('X is required') 
	       else return null 
}) {}
```

#### Conflict with `do while`

To remedy the conflict of the keyword `do` in `do while`, you can use `do` expressions inside parentheses:

```js
do while (true) {
    let x = (do { ... })
}
```

### Limitations

Because of syntax breakage, especially in some cases, this functionality is quite limited in what can or cannot be done.

If any of the following expressions are detected, the code automatically returns an error immediately.

#### Direct assignments

You cannot return only variable assignments:

```js
(do {
  let x = 1;
});
```

This happens because declarations have an empty value as the value of "completion". Meaning if nothing happens, they return nothing. So if you do something like `do { 'before'; let x = 'after'; }` all of that will return `'before'` and the second expression won't return anything.

#### Function creation

Similarly you cannot create functions inside expressions:

```js
(do {
  function f() {}
});
```

#### Loops

Loops are not allowed inside expressions, in no case, not even nested in other control structures like `if`:

```js
(do {
  while (cond) {
    // código
  }
});
```

Or

```js
(do {
  if (condition) {
    while (inner) {
      // código
    }
  } else {
    42;
  }
});
```

#### Labels outside loops

You also cannot define arbitrary labels, only labels that are outside the expression are valid:

```js
(do {
  label: {
    let x = 1;
    break label;
  }
});
```

#### `if` without `else`

All `if`s inside an expression **must** contain an accompanying `else`:

```js
(do {
  if (foo) {
    bar
  }
});
```

## Conclusion

This is still a very early proposal, which means that probably a lot of what's written here will change in the future. But it promises to bring a new way to make your code more organized and, who knows, more efficient in terms of resource usage.
