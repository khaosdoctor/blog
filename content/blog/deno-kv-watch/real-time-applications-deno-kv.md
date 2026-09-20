---
title: Real-time applications with Deno KV
pubDate: 2024-01-24T11:00:34.000Z
updatedDate: 2026-07-16T15:53:37.000Z
category: technology
tags: ["deno", "typescript", "javascript", "databases"]
lang: en
description: Creating real-time applications became much easier with a new tool released by Deno in version 1.38.5, the watch mode!
slug: real-time-applications-deno-kv
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Real-time applications have always been a major challenge for most developers, mainly because they follow a paradigm quite different from what we are used to working with.

Because of this, most applications that needed some kind of real-time communication would end up going in a direction like [WebSockets](https://pt.wikipedia.org/wiki/WebSocket), which are a bit harder to implement so we would generally resort to long polling when we weren't in a hurry to receive updates.

Deno once again innovated a lot in relation to what can be done with the runtime and applications, making the creation of real-time applications much easier.

## KV Watch

A while ago I published an article here talking about Deno's new key-value database, [Deno KV](/deno-kv-beta/).

Just to remind us what KV is. It is a database in the key-value model, meaning we don't have structures like tables and so on, most of our logical operations are done on top of values stored in keys that follow a textual pattern, for example, the likes on a post with the ID `1234` could be represented by a number stored in the key `posts:1234:likes`

KV has several really interesting APIs, like [queues](/deno-kv-queues/) and [cron](/deno-cron/), but the one that makes all of this possible is **watch**.

With this new API, Deno KV can observe changes in real-time on the keys, so whenever one of these keys changes, we can emit an event somewhere notifying of that change.

The new API works through an [async iterator](/async-iterators-js/) that will return the new value of the watched key:

```ts
const db = await Deno.openKv()

const stream = db.watch(["chave1"], ["chave", "2'])
for await (const entries of stream) {
  entries[0] // { key: ['chave1'], value: 'v', versionstamp: ... }
  entries[1] // o mesmo porém com a chave 2
}
```

## Building real-time applications

Since the idea of this article is to be short and direct, I won't show completely how we can build a real-time application here, but I'll give an example of how we can work with this new tool

### Server-sent Events

The most common when we're doing real-time applications in the frontend is to try to create some kind of persistent connection between the client and the server. Actually, this is probably the only way, and we're well used to calling it WebSocket.

There is another way to create these persistent connections with another web pattern called [Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events) (SSE), which is something really implemented in [Oak](https://oakserver.github.io/oak/sse.html).

SSEs are basically a connection that stays constantly open from the client to the server, essentially a WebSocket, but you can do the communication over HTTP instead of sending messages over TCP directly. And you do this through an endpoint.

In the frontend, we create an `EventSource` with an endpoint:

```ts
const eventSource = new EventSource("/api/users/123/notification/subscribe")
```

On the server side, we need to have a handler for this route, which will create a data stream:

```ts
import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

router.get('/api/users/:id/notification/subscribe', async (ctx) => {
  const target = ctx.sendEvents()
  const events = kv.watch(['users', ctx.params.get('id'), 'notifications'])
  for await (const {value} of events) {
    target.dispatchMessage({ notification: value })
  }
})

app.use(router.routes())
await app.listen({ port: 8080 })
```

Whenever we have a change in our notifications array, we send it to the frontend and can update our client.

Of course this is a simple example, but it shows what we can do with this API.

---

## FTS Time!

If you liked this article, I also have a complete TypeScript course called **TypeScript Formation!**

I invite you to take a look there if you want to learn more about TypeScript with me and our amazing community with hundreds of students!
