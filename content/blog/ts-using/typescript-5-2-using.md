---
title: "TypeScript 5.2's New Feature: Introducing Using"
pubDate: 2023-08-03T11:00:11.000Z
updatedDate: 2026-07-16T15:58:29.000Z
category: "typescript"
tags: ["typescript", "javascript", "nodejs", "development"]
lang: en
description: "TypeScript 5.2 is implementing a new keyword called using. But do you know what it's for?"
seoTitle: "Everything about TypeScript 5.2's \"using\" and its benefits"
slug: "typescript-5-2-using"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Once again we're here for **[TypeScript](https://hotm.art/yd4IsL)** updates! This time we're talking about a feature that's not just new to TS but is also [coming](https://github.com/tc39/proposal-explicit-resource-management) to JavaScript soon!

This is the feature called **explicit resource management**. It's defined as a new keyword: `using`

In languages like C#, `using` is already a [well-known](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-statement) keyword, and it exists in other forms, like Java's `try-with-resources` or Python's `with` statement. The idea of this proposal is to tie the lifecycle of a resource to itself, without needing to call other functions like a `finally` block to clean up the resource.

## Resource Management

When we're talking about lower-level programming like C or C++, resource management is essential, but in higher-level languages, this kind of functionality tends to get lost because the compiler or engine handles it for us.

But sometimes it's necessary to clean up some resources after creating or using them. The most classic example of this is closing a network or database connection. If we have something like:

```ts
import connection from 'seu-banco'

export async function fazerQuery (query: string) {
	const db = connection.start()
    const result = await db.query(query)
    connection.close()
    return result
}
```

If we need to do an early return for some reason, we'll have to duplicate the code that's releasing our resource with `connection.close()`:

```ts
import connection from 'seu-banco'

export async function fazerQuery (query: string) {
	const db = connection.start()
    const result = await db.query(query)
    if (!result) {
    	connection.close()
        return
    }
    connection.close()
    return result
}
```

But we don't guarantee what happens if an error occurs, so we need a `try/catch`, and it's easier to put all this in a `finally` to keep it simpler to read, right?

```ts
import connection from 'seu-banco'

export async function fazerQuery (query: string) {
	try {
        const db = connection.start()
        const result = await db.query(query)
        if (!result) return
        return result
    } catch (err) {
    	console.error(err)
    } finally {
    	connection.close()
    }
}
```

While this is an interesting solution, we've written a considerable amount of code just to close a connection. And that's why the idea of explicit resource management exists, to treat these cases as a primary concern.

## Symbol.dispose

Everything revolves around a property called `Symbol.dispose`, which is an internal symbol of all classes.

Let's imagine this is our connection class (and there's a factory somewhere that returns the instance we used above):

```ts
export class Connection {
	constructor (options: ConnectionOptions) {
    	// ...
    }
    
    start () { }
    close () { }
}
```

To transform our connection class into a class that can be disposed, we need to implement a new property:

```ts
export class Connection {
	constructor (options: ConnectionOptions) {
    	// ...
    }
    
    start () { }
    close () { }
    
    [Symbol.dispose]() {
    	this.close()
    }
}
```

For more convenience, TypeScript already has a global interface called `Disposable` that you can implement to make your code more cohesive:

```ts
export class Connection implements Disposable {
	constructor (options: ConnectionOptions) {
    	// ...
    }
    
    start () { }
    close () { }
    
    [Symbol.dispose]() {
    	this.close()
    }
}
```

Now we can simply call this functionality to clean up our code:

```ts
import connection from 'seu-banco'

export async function fazerQuery (query: string) {
	try {
        const db = connection.start()
        const result = await db.query(query)
        if (!result) return
        return result
    } catch (err) {
    	console.error(err)
    } finally {
    	connection[Symbol.dispose]()
    }
}
```

It doesn't help much, does it? We just moved things around. Even though we now have a specific place to call all the logic, it's still easier than calling specific methods.

## Using

But if we want to move everything to one place, we can take advantage of the new `using` keyword. It works like `let` or `const`, but instead of just declaring a variable, it instructs the engine to call `Symbol.dispose` at the end of that function's scope. So our earlier function can be rewritten like this:

```ts
import connection from 'seu-banco'

export async function fazerQuery (query: string) {
	try {
        using db = connection.start()
        const result = await db.query(query)
        if (!result) return
        return result
    } catch (err) {
    	console.error(err)
    }
}
```

Now we don't have resource management logic inside our app anymore, which makes it much easier to manage these connections and abstract the functionality away from users, especially for those creating libraries![^n1]

Disposals work like a stack, so they're called from the last creation to the first. The documentation example demonstrates this well:

```ts
function loggy(id: string): Disposable {
    console.log(`Creating ${id}`);

    return {
        [Symbol.dispose]() {
            console.log(`Disposing ${id}`);
        }
    }
}

function func() {
    using a = loggy("a");
    using b = loggy("b");
    {
        using c = loggy("c");
        using d = loggy("d");
    }
    using e = loggy("e");
    return;

    // Unreachable.
    using f = loggy("f");
}

func();
// Creating a
// Creating b
// Creating c
// Creating d
// Disposing d
// Disposing c
// Creating e
// Disposing e
// Disposing b
// Disposing a
```

Notice they're created in order from A to D, but destroyed from D to A. If you create a scope in the middle of the function, like with C and D, they're destroyed first when they exit the scope.

### Async with Symbol.asyncDispose

In addition to the synchronous version, we also have the async version of dispose. It behaves the same way, but it's an async function and needs to be used with `await using` instead of `using`.

```ts
async function wait () {
	await new Promise(resolve => setTimeout(resolve, 500))
}

function loggy(id: string): AsyncDisposable {
    console.log(`Creating ${id}`);

    return {
        async [Symbol.asyncDispose]() {
            console.log(`Disposing ${id} async`);
            await wait()
        }
    }
}

function func() {
    await using a = loggy("a");
    await using b = loggy("b");
    {
        await using c = loggy("c");
        await using d = loggy("d");
    }
    await using e = loggy("e");
    return;

    // Unreachable.
    await using f = loggy("f");
}

func();
// Creating a
// Creating b
// Creating c
// Creating d
// Disposing d async
// Disposing c async
// Creating e
// Disposing e async
// Disposing b async
// Disposing a async
```

## Error Handling

What happens if our dispose function has an error? Or if we have an error during the function and also during cleanup? In this case we have a new error type that extends `Error`, called `SuppressedError`.

`SuppressedError` errors have a `suppressed` property that contains the previous error that was generated, and another `error` property for the most recent error.

For example, if we have code like this:

```ts
class ErrorA extends Error {
    name = "ErrorA";
}
class ErrorB extends Error {
    name = "ErrorB";
}

function foo (id: string) {
	return {
    	[Symbol.dispose]() {
        	throw new ErrorA(`Erro do id ${id}`)
         }
	}
}

function bar () {
	using f = foo("1")
    throw new ErrorB("Erro!")
}

try {
	bar()
} catch (e: any) {
	console.log(e.name, e.message) // SuppressedError An error was suppressed during disposal
    console.log(e.error.name) // ErrorA
    console.log(e.error.message) // Erro do id 1
    console.log(e.suppressed.name) // ErrorB
    console.log(e.suppressed.message) // Erro!
}
```

So basically, the most recent error will be the one generated inside the symbol, while the suppressed error is the one that was generated inside the function before disposal was called.

## DisposableStacks

As you might have noticed, `Symbol.dispose` and its async version can be great solutions for more complex code, because we're already using a class and can implement the functionality. But when we have simple code like this, it can seem like overkill to implement all this logic.

In our case, we just want to remember to call `close` at the end of execution, nothing more. For this we have two new features in TypeScript: `DisposableStack` and `AsyncDisposableStack`, which basically work as tools to execute these symbols manually at the end of the function.

So if we forget about our class and assume it has no logic to handle resource cleanup, going back to our original function, we could have written it like this:

```ts
import connection from 'seu-banco'

export async function fazerQuery (query: string) {
	try {
        const db = connection.start()
        using cleanup = new DisposableStack()
        cleanup.defer(() => connection.close())
        
        const result = await db.query(query)
        if (!result) return
        return result
    } catch (err) {
    	console.error(err)
    }
}
```

Notice we're using a feature called `defer` that's very common in [Golang](https://go.dev/tour/flowcontrol/12). What it does is push the execution of this block to the end of the current scope.

Imagine it's a class implemented like this (just for illustration):

```ts
export class DisposableStack implements Disposable {
    #stack = []
    
    defer (fn: (...args: any) => void) {
    	this.#stack.push(fn)
    }
    
    [Symbol.dispose]() {
    	for (const fn of this.#stack) {
            fn()
        }
    }
}
```

The idea is that you can define a stack and call the `defer` method multiple times to add one or more functions to the cleanup stack.

## Conclusion

To use using in newer versions of TypeScript, you need to change some options in `compilerOptions` of `tsconfig`. These include options to change the compilation target to 2022 and add the necessary polyfills, like this:

```json
{
    "compilerOptions": {
    	"target": "es2022",
        "lib": ["es2022", "esnext.disposable", "dom"]
    }
}
```

You can read more about this new feature on the [TypeScript blog](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2-beta/#using-declarations-and-explicit-resource-management) and also learn how to use it properly in my [TypeScript course!](https://hotm.art/yd4IsL).

[^n1]: If you want to learn how to use this feature, take a look at my [complete TypeScript training](https://hotm.art/yd4IsL)!
