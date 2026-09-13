---
title: "\"Do you already know Deno KV?\""
pubDate: 2023-07-20T11:00:50.000Z
updatedDate: 2026-07-16T15:59:17.000Z
category: "javascript"
tags: ["deno", "databases", "typescript"]
lang: en
description: "\"Have you heard of the new Deno KV? Then it's time to discover this tool that could save your life\""
seoTitle: "\"Principles of Deno KV\""
slug: "have-you-heard-of-deno-kv"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

I've been talking about [Deno](/deno/) for a while now, and I've already [discussed Deno KV here](/deno-kv/) when it was still an alpha experiment with no defined API. Now we finally have the **official** beta version that's being tested.

## What are KV databases

KV is short for "Key Value", which refers to a concept called **key and value** in data storage. It's also the name of a paradigm with the same meaning.

Key and value databases are not rare or new. There are hundreds of them out there. The most famous and widely used today is **Redis**, but there are others like ETCD, Arango, Memcached, etc.

The concept behind key and value databases is that they are extremely simple to use, because they have no inherent complexity. You can think of a KV database as a table:

| **Key** | **Value** |
| --- | --- |
| name | Lucas |
| age | 28 |
| profession | dev |

And that's it. There's no big secret beyond that idea. What differentiates most key and value databases is how they optimize and store these data structures in memory or on disk, the types of data they support, and so on. But the basic idea is the same.

### Advantages

The advantage of this type of structure is that it's **extremely fast** to search or insert a value, because keys are indexed by default and there's only one value per key. Even with billions of keys, it's easy to know where each one is based on its value.

> This is why databases like Redis and Memcached are used so often as website caches. Reading is so fast that it doesn't impact performance.

Often, as was the case with Redis years ago, there was no need for disk storage at all. Persistence was basically a dump of memory to a binary file, and then reading that same file when the database started again.

### Disadvantages

Precisely because they have no relationship support, key and value databases can't represent complex structures very well. They don't have any structure that can natively relate one piece of data to another. Usually the relationship is implicit in the key name. For example, if we want to store a teacher and their classes, we can use a key `teachers:<id>` and then another key `teachers:<id>:classes`. This defines that the classes belong to that teacher.

> This technique is called **secondary indexes**. The naming convention for keys is called [Key Space](https://deno.land/manual@v1.35.1/runtime/kv/key_space).

Therefore, systems with relationships or clear dependencies between their data usually still benefit from traditional SQL databases like Postgres. But that doesn't mean we can't represent any relationships in key and value databases. Just as we did earlier by putting the relationship directly in the key name, we can also take advantage of something that key and value databases have that relational databases typically don't: _the ability to store any type of value in any type of key._

We call this property **schemaless**, meaning the database has no tables with a defined **schema**, unlike traditional tables with numeric columns, varchar, etc. Redis, for example, can store anything from strings (including JSON objects) to bytes, bitmaps, and much more.

So it's technically possible to represent complex relationships using only the key and value paradigm, but the more complex these relationships become, the harder it is to manage these keys when working on your application. Since the database won't give you any help finding one relationship or another, you'll have to do everything manually in code.

> To mitigate most of these issues, Deno itself has a [manual on secondary indexes](https://deno.land/manual@v1.35.1/runtime/kv/secondary_indexes) that shows how we can create relationships between multiple keys.

The disadvantage of key and value databases usually shows up here. When you need to architect a system with many relationships, your code quickly becomes a tangle of dependency resolution between your application's entities. Not to mention it takes much longer to write your code since you also have to write all the database logic.

> Usually, the solution for something like "list all students of a teacher" and "list all teachers of a student", where the keys have equal relationships but opposite results, is to duplicate the key, one for each side of the relationship.

Now that we know the advantages and disadvantages of key and value databases, let's understand better how Deno KV works.

## Deno KV

Deno KV is a serverless, globally distributed key and value database. Among its key features is variable consistency, allowing you to choose between a **strongly consistent (strong consistency)** or **weakly consistent (eventual consistency)** model.

The difference is that with **strong consistency**, you always have access to keys right after they're inserted. There's no propagation delay or anything like that. Just like traditional databases, KV also supports transactions.

With **eventual consistency**, you sacrifice consistency for speed, meaning reads are much faster, but not always guaranteed.

In my other article I already discussed KV, but it wasn't complete. What we had back then was an alpha version released only for users to check how the interfaces worked. But now we have a much more stable version, although it hasn't been released to the public yet.

Deno KV is in **closed beta** and you can [request access](https://dash.deno.com/kv) by visiting the [Deno Deploy documentation site](https://deno.com/deploy/docs/kv), which is Deno's cloud. KV is already fully integrated there (something that didn't exist in alpha). During closed beta, usage is free and includes 1GB of storage.

The base APIs remain the same, so to create a new database or open an existing one, we simply do:

```ts
// main.ts
const kv = await Deno.openKv('nome opcional do banco');
```

It's important to note that at the time of writing this article, Deno Deploy doesn't yet support multiple databases. So you can use a ternary to load either a local or default database.

```ts
// main.ts
const isProduction = Deno.env.get('DENO_ENV') === 'production'
const kv = await Deno.openKv(isProduction ? '' : './meubanco.db')
```

To run it, just execute `deno run --unstable -A main.ts`, remembering that the `--unstable` flag needs to be there during beta.

If you used a different name (or path), you'll see that in the location you chose, Deno created a SQLite database, which is the backend it uses for local projects.

> You can access this database with any SQLite client and see what's inside.

## Usage

Deno KV supports several operations and you can see the manual for all of them directly in the [API](https://deno.land/api@v1.35.1?s=Deno.Kv&unstable):

-   Get
-   GetMany
-   List
-   Set
-   Delete

## `kv.set(key, value)`

Used to insert a value into the database. Usage is simple:

```ts
const res = await kv.set(['users', 'alice'], { name: 'alice', age: 28 })
```

The result stored in `res` is an object with a **versionstamp**. I won't go into detail here, but [the documentation explains it well](https://deno.land/manual@v1.35.1/runtime/kv/key_space#versionstamp). In short, a versionstamp is a unique incremental non-sequential ID that represents the version of your value.

```js
//exemplo de resposta
const res = {
    versionstamp: '000002fa526aaccb0000'
}
```

Like other databases such as MongoDB, KV also stores different versions of the same value so you can compare the values you get from a `get` with those from a `set`. Since consistency can be weak, it's possible that the value you got from a `get` is older than the value that was set due to replication delay.

This way versionstamps are comparable and orderable. A stamp that is greater than another means that stamp is more recent.

```ts
const versionA = '000002fa526aaccb0000'
const versionB = '000002fa526aacc90000'
versionA > versionB // true, A é mais recente
```

### Key spaces

As we mentioned earlier, we can set keys with scopes. These scopes are defined by an array. If the key is a string, Deno assumes it's a simple key, but if we pass an array, each position in the array becomes a scope of the key:

```ts
const chaveSimples = 'users'
const chaveComEscopo = ['users', 'alice']
```

Keys can have [various types](https://deno.land/manual@v1.35.1/runtime/kv/key_space#key-part-ordering):

-   `Uint8Array` - An array of bytes
-   `string`
-   `number`
-   `bigint`
-   `boolean`

Keys can't be objects, structures, or classes. If the key doesn't exist, it will be created. If it already exists, it will be replaced. **All write operations are strongly consistent**.

## `kv.get<T>(['chave'], options?)`

The [`get`](https://deno.land/api?s=Deno.Kv&p=prototype.get&unstable) is the individual version of [`getMany`](https://deno.land/api?s=Deno.Kv&p=prototype.getMany&unstable). Both are commands to retrieve values from the database. They accept only complete keys and cannot be used to list, for example, all keys with `['users']`.

```ts
const res = await kv.get(['users', 'alice'])
// { key: ['users', 'alice'], value: 'valor', versionstamp: 'stamp' }
```

In the second parameter, we can pass an options object that contains only the `consistency` key, which can have the value `'strong'` or `'eventual'`.

Additionally, you can specify the return type in the type parameter T, identifying what type of object will be returned.

```ts
const res = await kv.get<string>(['users', 'alice']) // res é string
```

Similarly, we can use `getMany` to get more than one key at a time:

```ts
const [res1, res2, res3] = await kv.getMany<[string, string, string]>([
  ["users", "sam"],
  ["users", "taylor"],
  ["users", "alex"],
]);
```

If a key is not found, the result will be an object `{ key: ['chave', 'buscada'], value: null, versionstamp: null }`.

> It's always a good idea to check if a value exists using the **versionstamp** rather than the `value`, since the `value` can actually be null.

## `kv.list<T>(selector, options?)`

The [list](https://deno.land/api?s=Deno.Kv&p=prototype.list&unstable) is a more powerful version of `get`, designed specifically to list a large number of keys based on a specific selector.

`options` is an options object that can contain several keys:

-   `limit`: how many objects are returned in the search
-   `cursor`: a cursor indicating where to resume iteration. If it doesn't exist, starts from the beginning (ideal for pagination)
-   `reverse`: reverses the array before returning it, essentially starting from the end
-   `consistency`: same as `get`
-   `batchSize`: list fetches values in batches. Larger batches bring more data at once. Default is 100, maximum is 500.

`selector` is an object whose keys are the chosen selectors. There are two types of selectors that can be used:

-   `prefix`: Searches for all keys that start with a given prefix, meaning the first elements of the array match the passed elements. For example, `{ prefix: ['users'] }` searches for all keys that start with `['users']`, including `['users', 'alice']` or `['users', 'bob']`.

> You can also pass `start` and `end` parameters to the `prefix` to specify where the list should begin and end (including `start` and excluding `end`).

```ts
const iter = kv.list<string>({ prefix: ["users"] }, { limit: 2 } )
const users = [];
for await (const res of iter) users.push(res);
console.log(users[0]); 
// { key: ["users", "alex"], value: "alex", versionstamp: "00a44a3c3e53b9750000" }
console.log(users[1]); 
// { key: ["users", "sam"], value: "sam", versionstamp: "00e0a2a0f0178b270000" }

const iter = kv.list<string>({ prefix: ["users"], start: ["users", "taylor"] });
const users = [];
for await (const res of iter) users.push(res);
console.log(users[0]); 
// { key: ["users", "taylor"], value: "taylor", versionstamp: "0059e9035e5e7c5e0000" }
```

It's important to note that the result of any `list` returns an `asyncIterator` that can be iterated with `for await of`.

-   `range`: if we omit the `prefix` key and include only `start` and `end`, we retrieve only the keys between those two values, excluding `end` and including `start`.

```ts
const iter = kv.list<string>({ start: ["users", "a"], end: ["users", "n"] });
// usuários entre 'a' e 'm' já que 'n' não está incluso
const users = [];
for await (const res of iter) users.push(res);
console.log(users[0]); 
// { key: ["users", "alex"], value: "alex", versionstamp: "00a44a3c3e53b9750000" }
```

> Unlike `prefix`, `range` can contain **partial keys**, meaning the key can contain any character that matches the pattern, as we did with `a` and `n`.

## `kv.delete(chave)`

Deletes a key. If the key doesn't exist, nothing happens. These operations are always **strongly consistent**.

```ts
await kv.delete(['users', 'alice'])
```

## And there's much more

This article covers only the basic parts of KV, but we'll have another article covering all the **atomic** operations and transactions that KV also supports. Later we'll talk about queues and pub/sub features.

However, with just the basic operations, you can already do a lot. I strongly recommend that you take a look at the current state of Deno KV and test it on Deno Deploy to draw your own conclusions.

See you later!
