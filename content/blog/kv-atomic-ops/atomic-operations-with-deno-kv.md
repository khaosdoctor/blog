---
title: "Atomic operations with Deno KV"
pubDate: 2023-07-27T08:00:25.000Z
updatedDate: 2026-07-16T15:59:05.000Z
category: "javascript"
tags: ["deno", "typescript", "databases"]
lang: en
description: "Deno KV is advancing faster and faster. Let's learn what atomic transactions are and how they're useful in a KV database."
slug: "atomic-operations-with-deno-kv"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

In [another article](/deno-kv-beta/) we discussed the new closed beta version of Deno KV and also talked about the concept of key and value. But unfortunately, since the article was already quite large, some things were left out, one of those things was the incredible atomicity capability of KV.

But what does it mean to be atomic? And what does that mean in the context of a key-value database like this?

## Atomicity

Atomicity is the letter **A** of the acronym **ACID** that you've probably already heard. Each letter of ACID has profound meaning for any database, especially if it supports transactions:

-   **Atomicity**: Which is the most important for us right now. This is nothing more than the concept of **transactions**. That is, a set of operations that are executed all at once as if they were a single atom. Either everything happens, or nothing happens.
-   **Consistency**: A guarantee that transactions in the database will only modify tables in a predefined way. Additionally, this property also ensures that any kind of data corruption or loss in a certain place will not affect other tables.
-   **Isolation:** Essentially addresses the race condition problem. When multiple users are performing reads and writes on the database, isolation of transactions ensures that these concurrent transactions do not interfere with each other.
-   **Durability:** It is the main property of a database. It ensures that any change to your data through any successful transaction will be persisted even in the event of a system failure.

In addition to non-atomic [operations](https://deno.land/manual@v1.35.1/runtime/kv/operations), KV also supports atomic [transactions](https://deno.land/api@v1.35.1?s=Deno.AtomicOperation&unstable=), where either everything is executed or nothing is executed. This concept is based on **mutations** which are a set of actions applied to a record.

Once again, KV uses `versionstamps` to know what was modified or not. The transaction will only be sent successfully if the current `versionstamps` of the keys are the same as those passed in the mutation. In this way it is possible to guarantee that we are modifying the latest version of the data.

These operations include all of the previous ones with some differences:

-   `check`: equivalent to `get`, but instead of getting a key, it will test an already obtained key against the versionstamp that is in the database
-   `sum`: a type of `mutate` operation, but without a direct shortcut
-   `min`: another `mutate`, but one that has a direct shortcut
-   `max`: another `mutate`, also a direct shortcut
-   `commit`: finishes the transaction and sends the values to the database
-   `delete`: same as the previous one

For this explanation it's better to use an example rather than go through method by method, since most of the functionality is known. Deno's own example is very good because it's one of the main functionalities when we're working with transactions: **money transfer**.

When we are transferring funds from one account to another, first we have to make sure the first account has the funds. If we do it asynchronously, it's possible that while we're trying to transfer money from one account to another, a transaction happens in the middle and we no longer have the necessary funds. That's why we need to execute all operations (withdraw from one account and deposit in another) all at once, or not execute any at all.

```ts
const senderKey = ['account', 'alice']
const receiverKey = ['account', 'bob']
cosnt amount = 100

// tentamos a transação até conseguir
let res = { ok: false }

while (!res.ok) {
	const [senderResponse, receiverResponse] = await kv.getMany([senderKey, receiverKey])

    if (!senderResponse || !receiverResponse) break

    const senderBalance = senderRes.value
    const receiverBalance = receiverRes.value

    if (senderBalance < amount) {
    	throw new Error('Saldo insuficiente')
    }

    const newSenderBalance = senderBalance - amount
    const newReceiverBalance = receiverBalance + amount

 	// salvamos no banco de dados
}
```

So far we're doing everything in memory. To save to the database we need to first check both balances. We can do this with the `check` command:

```ts
const senderKey = ['account', 'alice']
const receiverKey = ['account', 'bob']
const amount = 100

// tentamos a transação até conseguir
let res = { ok: false }

while (!res.ok) {
	const [senderResponse, receiverResponse] = await kv.getMany([senderKey, receiverKey])

    if (!senderResponse || !receiverResponse) break

    const senderBalance = senderRes.value
    const receiverBalance = receiverRes.value

    if (senderBalance < amount) {
    	throw new Error('Saldo insuficiente')
    }

    const newSenderBalance = senderBalance - amount
    const newReceiverBalance = receiverBalance + amount

 	// salvamos no banco de dados
    res = await kv.atomic()
    	.check(senderResponse)
        .check(receiverResponse)
}
```

Here it's important to note two things:

1.  We are using the `atomic()` method, which is the namespace that will have all the atomic properties of KV
2.  We are using `check` and passing as a parameter not a value, but the entire response from the `getMany` command, because we need to pass both the value and the `versionstamp` of that key

What `check` will do is perform a `get` on the KV and verify if the two records are **identical**. If it fails, then the transaction will be aborted. Now we can update each person's values:

```ts
const senderKey = ['account', 'alice']
const receiverKey = ['account', 'bob']
const amount = 100

// tentamos a transação até conseguir
let res = { ok: false }

while (!res.ok) {
	const [senderResponse, receiverResponse] = await kv.getMany([senderKey, receiverKey])

    if (!senderResponse || !receiverResponse) break

    const senderBalance = senderRes.value
    const receiverBalance = receiverRes.value

    if (senderBalance < amount) {
    	throw new Error('Saldo insuficiente')
    }

    const newSenderBalance = senderBalance - amount
    const newReceiverBalance = receiverBalance + amount

 	// salvamos no banco de dados
    res = await kv.atomic()
    	.check(senderResponse)
        .check(receiverResponse)
        .set(senderKey, newSenderBalance)
        .set(receiverKey, newReceiverBalance)
        .commit()
}
```

Every transaction must be finalized with a `commit()` so we can execute the queue of operations that were made.

Now that we understand the concept, let's look at the other operations.

### `kv.atomic().mutate()` - Sum, Min and Max

In addition to normal operations, we have another method called `mutate` within `atomic()`. This method accepts a configuration object that can have three keys:

-   `type`: The type of mutation, which can be, for now, `sum`, `min` or `max`
-   `key`: The key to be modified
-   `value`: The new value, needs to be an object of type `Deno.KvU64` which is created from a `BigInt` with `new Deno.KvU64(100n)` for example

Let's talk about mutations in general. I'll give the first example with `sum`, but there's no great need to explain the others with examples because they follow the same idea:

**Sum**

The `sum` will atomically add a value to a key. If the value does not exist, it will be created with the value that would be added. For example, if we add 10 to a non-existent key, the result will be the key we want to add with the value 10. If the key exists, the value will be added through a sum.

> Mutation operations **can only be done on BigInt data types** which, in Deno KV, are represented by the type `Deno.KvU64`, which means [Deno KV Unsigned 64-bit Integer](https://deno.land/manual@v1.35.1/runtime/kv/key_space#denokvu64-type). This type cannot be stored in any structure; it needs to be a top-level value.

The basic structure of a sum is as follows:

```ts
await kv.atomic()
	.mutate({
    	type: 'sum',
        key: ['accounts', 'alice'],
        value: new Deno.KvU64(80n),
    })
    .commit()
```

This means we can replace our code above with something like:

```ts
const senderKey = ['account', 'alice']
const receiverKey = ['account', 'bob']
const amount = 100

// tentamos a transação até conseguir
let res = { ok: false }

while (!res.ok) {
	const [senderResponse, receiverResponse] = await kv.getMany([senderKey, receiverKey])

    if (!senderResponse || !receiverResponse) break

    const senderBalance = senderRes.value
    const receiverBalance = receiverRes.value

    if (senderBalance < amount) {
    	throw new Error('Saldo insuficiente')
    }

 	// salvamos no banco de dados
    res = await kv.atomic()
    	.check(senderResponse)
        .check(receiverResponse)
        .mutate({
        	type: 'sum',
            key: senderKey,
            value: new Deno.KvU64(-BigInt(amount)),
        })
        .mutate({
        	type: 'sum',
            key: receiverKey,
            value: new Deno.KvU64(BigInt(amount)),
        })
        .commit()
}
```

**Min and Max**

Like `sum`, when `min` and `max` are set as the `type`, the key will obtain the smaller and larger value, respectively, compared between the current value of the key and the value you are passing.

For example, if we have a key `['accounts', 'alice']` whose value is `100`, and we pass a `min` type mutation with the value of `50`, the new value will be `Math.min(100, 50)` which is `50`. However, if the original value is `30`, the key will not be modified. The same applies to `max`.

Like `sum`, if the key does not exist it will be created with the value passed. That is, it will not be assumed that the value is `0` initially for any of these cases.

```ts
await kv.atomic()
	.mutate({
    	type: 'min',
        key: ['accounts', 'alice'],
        value: new Deno.KvU64(100n),
    })
    .commit()
```

## Conclusion

With atomic operations, we can perform safer transactions that are guaranteed to have the expected result.

In the next articles we're going to build some project using Deno Deploy and Deno KV!
