---
title: Deno now has a native database
pubDate: 2023-04-19T11:00:53.000Z
updatedDate: 2026-07-16T16:01:17.000Z
category: technology
tags: ["typescript", "deno", "databases"]
lang: en
description: Deno surprises us again with a native key-value database implemented directly in the global namespace! Let's understand how it works!
seoTitle: Native key-value storage with Deno KV
slug: deno-now-has-a-native-database
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Another day, another update from the runtime that keeps surprising us! Deno announced that, since version 1.32, it now has a native key-value database!

## It's not that strange

Before you think, "But why would someone put a database in a runtime? Isn't it better to have a lib for this?". In fact, having a key-value database inside the runtime natively seems like something very elaborate for a standard lib, but what if we've already been doing this for many years without noticing?

The reality is that whenever we created small applications using Node, or even Web servers, one of the fastest and most efficient ways to persistently store data without having to use a complete database solution is to use the computer's file system (the famous _file system_, or FS). And the easiest way to use the FS is through a key-value model.

Initially, before the [advent of `map`](https://medium.com/trainingcenter/javascript-maps-entendendo-o-conceito-8654d5eb1314), someone could say that it's quite complicated to implement a class that acts like a database, because you would need something more complete like:

```javascript
class Database {
	insert () {}
    search (query) {}
    delete (id) {}
    update (id, data) {}
}
```

Beyond managing internal state and also concurrency for opening the same file at the same time, which could lead you to implement `locks` or even a MUTEX.

I myself have made several small databases using arrays and objects to store values in the FS when I wanted something simple and fast.

Maps changed the way of thinking because they already had many of the methods like `delete`, native to the API. Thus, creating a database this way was basically serializing and deserializing an array in a file, which still remains the biggest complexity.

## Deno KV

The Deno team announced [recently](https://deno.land/manual@v1.32.4/runtime/kv) that version 1.32 of the runtime already has a native implementation of a Key-Value store (KV), but in a more evolved way.

To use it, just open the database using `Deno.openKv()`, which optionally takes a path that will be where the database is saved.

```typescript
const kv = await Deno.openKv();
```

Now we have the four basic methods of a CRUD:

-   Insertion through the `kv.set` method
-   Removal through the `kv.delete` method
-   Reading through the `kv.get` method
-   And updating can be done by re-inserting a record with the same key

The change is that, besides accepting simple keys, Deno KV also accepts prefixes and nested keys. Just pass a parameter as an array for the key when setting. So if we want to create a "folder" called `users` with all user-related keys there, we can do it like this:

```typescript
await kv.set(['users', 'lucas'], { name: 'Lucas' })
```

We can also get the value using the same notation:

```typescript
const valor = await kv.get(['users', 'lucas'])
// valor.key -> ['users', 'lucas']
// valor.value -> { name: 'Lucas' }
```

But besides that, we can take advantage of generators and async iterators to read a whole set of keys that start with the same prefix with `kv.list`:

```typescript
for await (const entry of kv.list({ prefix: ["users"] })) {
  console.log(entry.key);
  console.log(entry.value);
}
```

> The list method also accepts other [types of selectors,](https://deno.land/api@v1.32.4?unstable&s=Deno.Kv#method_list_0) such as an alphanumeric range and several [options](https://deno.land/api@v1.32.4?s=Deno.KvListOptions&unstable=) to change the behavior, such as `limit` and `cursor`

### Versions

If the same key is overwritten using `kv.set` on the same key, Deno will automatically keep a set of versions called `versionstamp`, which is nothing more than a very large number that is the value of that version.

Versions can be very useful in file systems that are shared by many computers or applications, so that multiple writes can be performed at the same time. To ensure that one does not overwrite the other, we can compare version numbers before and after writing to ensure they were applied in the order we want:

```typescript
const db = await Deno.openKv()
const results = await db.getMany([['chave1'], ['chave2']])
results[0].versionstamp // "00000000000000010000"
results[1].versionstamp // null
```

## Conclusion

Deno KV may not seem super interesting at first glance, but the way it is designed allows us to have great ease when building small and medium-sized applications, mainly because we have everything at hand.

Not only that, but we can also take advantage of this system to build, for example, small non-persistent local cache systems, which can be the difference between an application's performance being good or bad.

However, it is important to note that **the Deno KV API is still experimental** and may undergo changes at any time. For more information, I recommend [reading the API documentation](https://deno.land/api@v1.32.4?s=Deno.Kv&unstable=) to understand a little more about everything it can do!
