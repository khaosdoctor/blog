---
title: Parallel Assignments - A feature you didn't know existed in JavaScript
pubDate: 2024-03-13T11:00:54.000Z
updatedDate: 2026-07-16T15:52:12.000Z
category: technology
tags: ["javascript", "typescript"]
lang: en
description: Do you know what double assignments or parallel assignments are? Let's discover this unknown feature of JavaScript!
seoTitle: Do you know what parallel assignments in JavaScript are?
slug: parallel-assignments-a-feature-you-didnt-know-existed-in-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Today for another short article here, I'll show you a feature you probably didn't know existed in JavaScript. **Parallel assignments**.

Many languages have the parallel assignments concept implemented, but what is that?

A parallel assignment, or "parallel association", is a feature that allows you to swap the value of two variables at the same time, even if they reference each other. In JavaScript this is part of the [_destructuring_](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) syntax so we can assign more than two variables at the same time.

For example, let's imagine this fibonacci function, which is a function where the next item in the list is the sum of the two previous items:

```js
function fibonacci(terms: number) {  
  let a = 0;
  let b = 1;
  for (let i = 0; i <= terms; i++) {    
    const temp = a + b;   
    a = b;  
    b = temp; 
  }  
  return a;
}
```

If you look closely, inside our `for` loop we have a temporary variable, which only serves to store the value of `a+b` and, then, the variable `a` takes the value of `b` and `b` becomes the sum of the two.

But what if I tell you that it's possible to do this entire for in just one line?

We can use the syntax `[a, b] = [v1, v2]` where `a` and `b` are the variables we want to swap, and `v1` and `v2` are the values we want to give to them respectively. This is possible **even if the variables are references to themselves**, as in our case where `b` will be `a+b`.

So we can rewrite our function to this:

```ts
function fibonacci (terms: number) {
	let a = 0;
	let b = 1;
	for (let i = 0; i <= terms; i++) {
  	  [a, b] = [b, a + b];
	}
	return a;
}
```

_Destructuring_ is widely used when we're creating variables from arrays or objects, like in:

```js
const [a, b] = [0, 1]
const { nome, idade } = { nome: 'lucas', idade: 28, sexo: 'M' }
```

But this syntax can also be applied when we're assigning variables to their values. We can even reduce it further by doing:

```ts
function fibonacci (terms: number) {
    let [a, b] = [0, 1];
	for (let i = 0; i <= terms; i++) {
  	  [a, b] = [b, a + b];
	}
	return a;
}
```

And even transform this function into a generator:

```ts
function* fibonacciGenerator () {
    let [a, b] = [0, 1]
	while (true) {
		yield a;
		[a, b] = [b, a + b]
	}
}

const fGen = fibonacciGenerator()
fGen.next() // 0

for (let i = 0; i < 10; i++) {
  console.log(fGen.next()) // 0 1 1 2 3 5 8 ...
}
```
