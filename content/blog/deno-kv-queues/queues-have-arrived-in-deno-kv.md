---
title: Queues have arrived in Deno KV
pubDate: 2024-01-10T11:00:32.000Z
updatedDate: 2026-07-16T15:54:36.000Z
category: technology
tags: ["deno", "typescript", "javascript", "pubsub"]
lang: en
description: The simplest way to build message-based systems is now Deno Queues, let's understand everything about this new tool!
seoTitle: Discover Deno Queues
slug: queues-have-arrived-in-deno-kv
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Since [Deno KV](/deno-kv-beta/) was released, the Deno team has been doing excellent work adding more features to what could have been just a simple key-value database, but now it's much more than that!

One of the newest additions to Deno's toolkit is the use of queues through **Deno Queues**.

## About Queues

Queues are a very old concept in programming. The idea is to have a data structure that delivers one item at a time in a FIFO (First In First Out) model. Queues are excellent when you have processes that take some time to happen but aren't critical and can be done in the background, for example, sending emails and notifications.

With the advancement of distributed computing, queues became quite important because it was now possible to create a queue distributed across multiple systems through a network.

Queues could be either 1:1, meaning one message for a single system, or a **pub/sub** (publisher/subscriber) model, which is most common today, where we have a message queue that is listened to by one or more systems. Whenever a new message arrives, those systems are notified and receive the latest message.

Messaging with queues became quite famous with the use of Apache Kafka and RabbitMQ over the years.

## Deno Queues

Deno is no different! The queue implementation in Deno KV follows the pub/sub model. But instead of being able to listen to multiple queues (for example, one queue for emails, another for webhooks), Deno Queues only has one, so the code is quite simple:

```ts
using db = await Deno.openKv()

db.listenQueue(async (msg) => {
  await mandarEmail(msg.from, msg.to, msg.body)
})

await db.enqueue({ 
  from: 'hello@lsantos.dev', 
  to: 'suporte@formacaots.com.br', 
  body: 'A Formação TS é animal!' 
})
```

That's it... For now, KV can only listen to a single queue, but it's more than enough for serverless applications.

The `enqueue` method accepts another property called `delay` that will delay sending the message by that amount of milliseconds. In the example above, the message would be delivered immediately, but imagine we're sending something an hour from now:

```ts
using db = await Deno.openKv()

db.listenQueue(async (msg) => {
  await mandarEmail(msg.from, msg.to, msg.body)
})

await db.enqueue({ 
  from: 'hello@lsantos.dev', 
  to: 'suporte@formacaots.com.br', 
  body: 'A Formação TS é animal!' 
}, { delay: 3_600_000 })
```

### At-least-once delivery

When dealing with queue models and other distributed systems, we have the concept of **QoS**, or [_Quality of Service_](https://en.wikipedia.org/wiki/Quality_of_service). This concept dictates how our messages will be delivered, for example, queues deliver messages in the order they were received, but other structures can deliver messages and events out of order.

However, what matters to us here is how many times we deliver the message. There are systems that do not guarantee message delivery (UDP for example).

In Deno Queues, we're certain that the message will be delivered at least once and, if the message fails to be delivered, the same handler will be called multiple times (up to 5 by default).

The same happens if, for some reason, you have an exception. After that, the message will be discarded unless you have a **DLQ** (Dead-letter queue).

Since we're already in the queue, you just need to pass a second option to `enqueue` called `keysIfUndelivered` to create a way to track undelivered messages. This option accepts a two-dimensional array of strings (`string[][]`) that will be the keys set if the message fails, for example:

```ts
const user = { id: 123 }
await db.enqueue(user, { 
  keysIfUndelivered: [['dlq', 'user', user.id]] 
})
```

If this message fails to be delivered, a new key `dlq:user:123` will be created with the content of the original message.

### Duplicates

One of the problems we always need to pay attention to in distributed systems is the issue of duplicates.

It's expected that message-based (event) systems can:

- Receive an event only once
- Receive an event multiple times
- Receive an event in order
- Receive an event out of order

So it's super important that there's a way for you to create **idempotency**, meaning that no matter how many times you send the same event, it will only be executed once, whether that idempotency is generated through a key (called an _idempotency key_) or through the logic itself, for example, an operation that sets a value to 100 will always set the value to 100 no matter how many times it's called.

In the [queues launch article](https://deno.com/blog/queues) itself, the team provides an interesting example using _nonces_, which are basically idempotency keys:

```ts
const db = await Deno.openKv()

db.listenQueue(async (msg) => {
  const nonce = await db.get(["nonces", msg.nonce])
  if (nonce.value === null) return

  // Here the message hasn't been processed yet
  await db.atomic()
    // Check again
    .check({ key: nonce.key, versionstamp: nonce.versionstamp })
    // Delete the nonce
    .delete(nonce.key)
    // Some processing
    .sum(["processed_count"], 1n)
    .commit()
})

// Send the message
await db.enqueue({ nonce: crypto.randomUUID() })
```

Notice that we're checking the message twice. First, to see if the nonce value exists in the nonces key. If not, it means we've already processed the message. If yes, we'll open an [atomic transaction](/kv-atomic-ops/) and check again if the version matches the version we're checking to verify that the key hasn't been changed, since it's possible another process could have modified it.

In fact, mixing atomic operations with Deno Queues is a really interesting idea because it opens up entirely new doors for you to build even more complex applications.

---

## FTS Moment!

If you enjoyed this article, I also have a complete TypeScript course called **TypeScript Training!**

I invite you to check it out if you want to learn more about TypeScript with me and our amazing community with hundreds of students!
