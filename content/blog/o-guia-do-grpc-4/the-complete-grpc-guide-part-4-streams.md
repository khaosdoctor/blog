---
title: "The Complete Guide to gRPC Part 4: Streams"
pubDate: 2021-07-07T12:00:00.000Z
updatedDate: 2026-07-16T16:13:40.000Z
category: technology
tags: ["grpc", "javascript", "protobuf", "architecture", "infrastructure"]
series: grpc
seriesOrder: 4
lang: en
description: Learn how to use one of the most interesting features of gRPC, streams! Performance and speed for large data in a super simple way!
slug: the-complete-grpc-guide-part-4-streams
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In the previous articles in this series, we learned what gRPC is, how it works, and how we can use this protocol to transfer data between systems with different technologies and languages. However, all of this was done using only the simplest models of protobuf definition, meaning we were sending a simple request and receiving a simple response in a client/server model.

## Streaming

In addition to what are called _Unary Calls_, we also have _Streaming calls_, which are nothing more than responses and requests made through an asynchronous data stream. We have three types of streaming calls in gRPC:

-   **Serverside streaming:** When the request is sent in a simple way (unary), but the server response is a data stream.
-   **Clientside streaming:** It is the opposite of the previous one, when we have the request being sent in the form of data streams and the server response is unary.
-   **Duplex streaming:** When both the request and response are data streams.

This is reflected in a `.proto` file in a very simple way. Let's go back to our [repository for the second article in the series](https://github.com/khaosdoctor/grpc-guide-part2-javascript-sample), where we have the following `notes.proto` file:

```protobuf
syntax = "proto3";

service NoteService {
  rpc List (Void) returns (NoteListResponse);
  rpc Find (NoteFindRequest) returns (NoteFindResponse);
}

// Entities
message Note {
  int32 id = 1;
  string title = 2;
  string description = 3;
}

message Void {}

// Requests
message NoteFindRequest {
  int32 id = 1;
}

// Responses
message NoteFindResponse {
  Note note = 1;
}

message NoteListResponse {
  repeated Note notes = 1;
}
```

If we wanted to modify the call so that instead of sending a ready-made list of notes, we send a stream of notes as a response in the `List` service, we can simply add the word `stream` in the direction we want:

```protobuf
service NoteService {
  rpc List (Void) returns (stream NoteListResponse);
  rpc Find (NoteFindRequest) returns (NoteFindResponse);
}
```

Done! We don't need to do anything else, our response will be a stream of notes as defined in `NoteListResponse`.

For the other stream models, we can follow the same idea, if we want a clientside stream, we put stream only on the request side:

```protobuf
service NoteService {
  rpc List (Void) returns (NoteListResponse);
  rpc Find (stream NoteFindRequest) returns (NoteFindResponse);
}
```

And for duplex streams, we put `stream` on both sides:

```protobuf
service NoteService {
  rpc List (Void) returns (stream NoteListResponse);
  rpc Find (stream NoteFindRequest) returns (stream NoteFindResponse);
}
```

## What are streams

If you don't yet know the concept of streams, don't worry, I made a series of articles on iMasters just about that:

-   [What are streams - part 1](https://imasters.com.br/back-end/streams-no-node-js-o-que-sao-streams-afinal-parte-01)
-   [What are streams - part 2](https://imasters.com.br/back-end/streams-no-node-js-o-que-sao-streams-afinal-parte-02)
-   [What are streams - part 3](https://imasters.com.br/back-end/streams-no-node-js-o-que-sao-streams-afinal-parte-03)

Basically, streams are a continuous flow of data that are loaded at the time of their reading. This model has several benefits, for example, when we are working with very large files or content, if we have to return this content to whoever asked for it, we would have to load the entire file into memory first, and then be able to respond.

If your file is, say, 3GB, then you'll use 3GB of memory. Whereas in a stream, you're showing the file as it is loaded and the content that came later is being discarded and freed from memory. This way you have much faster processing using far fewer resources.

In this talk I showed visually what this means:

![](https://www.youtube.com/watch?v=gzWv4PPD4S0)

For this reason, streams are widely used with large files and data because they can support a huge amount of information using very few resources.

## Streams and gRPC

Since it's so simple to use streams in gRPC, it was to be expected that support for them in the protocol would be very good. And this is, in fact what happens, stream support in gRPC is one of the best that exists and integrates with almost all supported languages.

For this demonstration, we'll use the same application [that we used in article number 2](https://github.com/khaosdoctor/grpc-guide-part2-javascript-sample), and we'll make some changes to it to transform a unary call into an asynchronous call.[^n1]

Let's start from a base, we clone the original repository from article 2 so we can have the complete application. The first thing we need to do is change our `.proto` file to add a stream to the note listing service.

The first change is simply adding `stream` to `rpc List`. And then we'll remove `NoteListResponse` so we have a response only as `Note`, the file looks like this:

```protobuf
syntax = "proto3";

service NoteService {
  rpc List (Void) returns (stream Note);
  rpc Find (NoteFindRequest) returns (NoteFindResponse);
}

// Entities
message Note {
  int32 id = 1;
  string title = 2;
  string description = 3;
}

message Void {}

// Requests
message NoteFindRequest {
  int32 id = 1;
}

// Responses
message NoteFindResponse {
  Note note = 1;
}
```

It is important to note that we are only removing the response entity because, as we are talking about a stream, obviously all the data that will come will be notes. If we kept it as a response type `{ note: { } }`, with each chunk of the stream we would have a new `note` object that would have (of course), a note inside... This is quite repetitive.

## Server

The next step is to change our server, actually, only a small part of it. The first and simplest change we'll make is to remove our small in-memory database that has our three fixed notes and move it to a `notes.json` file that will represent a large amount of data.

In this file I put approximately 200 notes:

```json
[
  {
    "id": 0,
    "title": "Note by Lucas Houston",
    "description": "Content http://hoateluh.md/caahaese"
  }, {
    "id": 1,
    "title": "Note by Brandon Tran",
    "description": "Content http://ki.bo/kuwokal"
  }, {
    "id": 2,
    "title": "Note by Michael Gonzalez",
    "description": "Content http://hifuhi.edu/cowkucgan"
  }, { ...
```

> Remember that 200 notes is not, by far, a large amount of data. This is just an example.

Now, we load the file at the top of our server with `require` (remember that this does not work for [ES Modules](/os-ecmascript-modules-estao-aqui/)):

```js
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')
const notes = require('../notes.json')
```

The second part of the file we'll change will be the definition of the `List` method. To do this let's look at the old definition for a moment:

```js
function List (_, callback) {
  return callback(null, { notes })
}
```

We have some things to change here:

1.  The response can no longer be `{ notes }`, because we're no longer returning an object
2.  We can't return the entire file at once anymore, or our chunk will be too large, we'll iterate line by line through notes to be able to return them to the client
3.  The function signature no longer takes a callback

We'll solve all of this the following way, first, instead of two parameters of a unary call, a stream only takes a single parameter, which we'll call `call`:

```js
function List (call) {
    //
}
```

The `call` object is an implementation of a write stream along with the call record, so, if we had any kind of parameter to be sent, we could obtain them through `call.request.parametro`.

Now let's define that a _chunk_ of our stream will be an individual note, so we'll iterate through the array of notes and return the notes individually:

```js
function List (call) {
  for (const note of notes) {
    call.write(note)
  }
  call.end()
}
```

Notice that we're calling `call.write` and passing the note directly, this is because we changed our response to be only a note and not an object with a `note` key.

It is also interesting to note that as soon as the call to `write` is detected, the response will be sent and the client will receive it, this is useful when we have to do some kind of processing, for example, if we needed to transform all titles to uppercase, we could do that transformation and send the results without waiting for all notes to be loaded.

Finally, we call `call.end()`, which is important, as it instructs the client to close the connection, if this is not done, the same client will not be able to make another call to the same service.

## Client

For the client, very little will change, in fact, only the method call. Our old call could be made in two ways:

```js
client.listAsync({}).then(console.log)
client.list({}, (err, notes) => {
  if (err) throw err
  console.log(notes)
})
```

Now we can no longer call it in two ways, because the stream is mandatory asynchronous. Furthermore, we won't have a callback, instead we'll make the call to the server which will return a read stream to us, and only after we create a _listener_ for this stream, will the call actually be made and the data returned.

This means we'll be working with the _event emitter_ and _event listener_ pattern, very common in Node and JavaScript. Our function will look like this:

```js
const noteStream = client.list({})
noteStream.on('data', console.log)
```

To be more explicit, we can do it this way:

```js
const noteStream = client.list({})
noteStream.on('data', (note) => console.log(note))
```

The stream also has another event called `end`, which is executed when the server stream calls the `call.end()` method. To listen to it, just create another listener;

```js
noteStream.on('end', () => {})
```

## Clientside streaming

To complete the article and not leave anything behind. In the case of using a model like:

```protobuf
rpc Find (stream NoteFindRequest) returns (NoteFindResponse);
```

Where the client making the request uses streams, we'll have a similar implementation on the server. The main difference is that our `Find` method, on the server side, will receive, as the first parameter, the client stream and the second will continue to be the callback.

This is our old method, with the two unary calls:

```js
function Find ({ request: { id } }, callback) { }
```

It is still valid because the call has a `request` property. But we don't have the `on` method, so let's update to:

```js
function Find (call, callback) { }
```

And we can receive data from the client the same way we receive data from the server in serverside streaming:

```js
function Find (call, callback) {
    call.on('data', (data) => {
        // fazer algo
    })
    call.on('end', () => {
        // a chamada terminou
    })
}
```

And on the client, we'll have a call exactly like the server, but we have to account for the fact that the server, this time, does not return us a stream, so we have a callback:

```js
const call = client.find((err, response) => {
    if (err) throw err
    console.log(response)
})

call.write({ id: 1 })
call.end()
```

The internal function of `find` will only be executed after the `end()` method is called.

## Duplex streams

For duplex streams (or _bidirectional streams_), we just need to implement, on both the server and client side, the `call` parameter. This parameter is a bidirectional stream that contains both the `on` method and the `write` method.

On the server we would have something like:

```js
function duplex (call) {
    call.on('data', (data) => {
        // recebendo dados do cliente
    })
    call.write('devolvendo dados para o cliente')
    call.end() // servidor encerra a conexão
}
```

And on the client we would have a call like:

```js
const duplex = client.duplex()
duplex.on('data' (data) => {
	// recebe dados do servidor
})
duplex.write('envia dados ao servidor')
duplex.close() // client fecha conexão
```

[^n1]: The code for this demonstration is [on my GitHub](https://github.com/khaosdoctor/grpc-guide-part-4-sample)
