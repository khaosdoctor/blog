---
title: Let's talk about Deno
pubDate: 2022-12-21T12:00:14.000Z
updatedDate: 2026-07-16T16:04:43.000Z
category: technology
tags: ["deno", "javascript", "typescript", "npm", "security", "open source"]
lang: en
description: Is Node.js finally dying? Is this the time to migrate to Deno? Let's understand everything about it in this article!
seoDescription: Is Node finally dying? Is this the time to migrate to Deno? Let's understand everything about it in this article!
slug: lets-talk-about-deno
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

-   [What is Deno](#what-is-deno)
    -   [Why it was created](#why-it-was-created)
    -   [How it works](#how-it-works)
    -   [Installation](#installation)
-   [What's different about it](#whats-different-about-it)
    -   [Security](#security)
    -   [Web Standards](#web-standards)
    -   [The Deno namespace](#the-deno-namespace)
    -   [Standard Library](#standard-library)
    -   [Development tools](#development-tools)
        -   [Configuration file](#configuration-file)
    -   [Decentralized packages](#decentralized-packages)
        -   [Community packages](#community-packages)
        -   [Deno compile](#deno-compile)
    -   [Import maps](#import-maps)
-   [NPM](#npm)
-   [Should I switch Node for Deno?](#should-i-switch-node-for-deno)
-   [Conclusion](#conclusion)

Whenever I'm on some social network, I see someone commenting about Deno or asking if it's a good alternative to Node (this thread actually inspired me to write this), or even "Is Deno going to kill Node? 😱". Since I'm a big Deno enthusiast, I decided to write an article about it to explain what it is, how it works, and what makes it different from Node.

The idea here is to show you a bit about Deno's history, what the main differences are compared to Node, and why it was created. I'll also show some code examples so you can see how easy it is to start using Deno and teach you how to install it so you can start playing with this alternative that's gaining more and more traction.

## What is Deno

To start, what is this Deno thing? I participated in a Hipsters.tech episode back in 2020 talking about my impressions and also a bit more about Deno's history, so if you want to know more about that, I recommend you check out the episode.

![](https://open.spotify.com/episode/1kXjNnp8qKpHRipeAriVDw)

But to sum it up, Deno (pronounced "Dino", hence the dinosaur mascot) is a runtime for JavaScript and TypeScript created by Ryan Dahl, the same creator of Node.js (Deno is the opposite of Node, get the joke?). Deno is a tool that aims not to replace, but to be an alternative to Node.js, with some differences that I'll discuss later.

### Why it was created

Instead of trying to explain everything part by part, there's a very interesting video by Ryan Dahl himself at JSConf EU in 2018 talking about the main things he regrets about Node.js and what he learned from them, then introduced the solution to these problems in the form of a new runtime called Deno. I recommend you watch the video, but I'll try to summarize some of the main things he said here.

![](https://www.youtube.com/watch?v=M3BM9TB-8yA)

To keep this section focused and not too long, I'll break these down into bullet points:

-   **Not starting with Promises**: as many people know (and I have heated discussions about this), Node.js started as a callback paradise, most of the initial library functions were callback-based and this became a major headache for developers dealing with the infamous "callback hell". What few know is that Promise support was added in 2009 but removed in 2010 because Ryan Dahl thought Promises weren't a good idea at the time because they added more complexity. He thought Promises were a solution to a problem that didn't exist and that callbacks were a better solution. He ended up regretting that decision.
-   **Security**: By default, Node.js allows all scripts you execute to have access to everything your system has access to. This is a problem because if you have a script you downloaded from somewhere and it has a bug that allows it to execute commands on your system, it could end up deleting everything on your computer. Although V8 itself is very good with security, scripts still had access to the network, file systems, and other things that were outside the scope of V8's sandbox. The regret is that these permissions weren't granular, for example, linters don't need network access.
-   **GYP**: Node's build system is GYP, a system that isn't inherently bad, but it has a strange UX and is the cause of many compatibility problems due to lack of documentation in the project.
-   **package.json and NPM**: The creation of NPM and `package.json` turned Node's package ecosystem into a closed, single location (we'll talk more about this in the next sections), but including NPM as a default Node binary made this tool the "official" package manager even though it didn't have to be.
-   **node_modules**: Using what's called "Vendoring by default", that is, downloading dependencies internally in a default directory, makes the module resolution algorithm more complicated than it needs to be.
-   **Omitting `.js` in require**: When we require a module, we can just write its name without specifying the extension, assuming all files would be `.js` which isn't always true, and this complicates the module search algorithm quite a bit, plus it's not a web standard.
-   **index.js**: Node.js assumes that if you import a directory, it will look for a file called `index.js` inside it, which is not a web standard and also complicates the module search algorithm.

With that said, he presented Deno as a solution to these problems and also as an opportunity to learn from past mistakes and do things differently. The big difference here is that Deno is not a fork of Node.js, it's a completely new project based on V8 and Rust, and aims to be a secure platform for running scripts and also a command line tool for development. We'll get into more details about the differences between the two later, but for now let's focus on how Deno works.

### How it works

Deno is built using the same V8, but this time integrated with a runtime written in Rust. This allows Deno to have a much safer and more performant runtime than Node.js, plus it allows Deno to be distributed as a single binary, which makes installation and use much easier. Libuv, which is the library Node.js uses to handle IO events, was also replaced with Tokio, a Rust library that serves the same purpose.

> **Note:** If you don't understand how Node.js works under the hood, I have a series of articles on the topic here that's worth reading.

Additionally, Deno supports not just JavaScript but also TypeScript by default, which makes it extremely attractive for devs who like greater control over their codebase without needing all the TypeScript configuration overhead on top of Node.js.

### Installation

Installing Deno is quite simple, just go to the project's releases page and download the binary for your operating system. Deno is distributed as a single binary, so you don't need to install anything other than the binary itself, and it comes in several formats. The recommended way is to install via a package manager like `apm`, `choco`, or `brew`. However, you can also use version managers like `asdf` to install a Deno plugin and manage the package internally.

To install using a package manager, just run the command below on Linux or MacOS:

```bash
curl -fsSL https://deno.land/x/install/install.sh | sh
```

You can also use Brew on MacOS:

```bash
brew install deno
```

And Choco on Windows:

```bash
choco install deno
```

If you're using `asdf`, you can install the Deno plugin using the command below:

```bash
asdf plugin add deno
```

And then install the version you want using the command below:

```bash
asdf install deno latest
```

And set it globally using the command below:

```bash
asdf global deno latest
```

You'll get a binary and a command called `deno` in your command line that you can use to run scripts. Want to do a quick test? Create a file called `hello.ts` with the following content:

```typescript
console.log('Hello World')
```

And execute the command below:

```bash
deno run hello.ts
```

If everything goes right, you'll see the message `Hello World` on your screen.

## What's different about it

Now that we've covered Deno's history, let's talk about the differences between it and Node.js. Deno is a completely new project, so it doesn't have the same codebase as Node.js, but it has some differences worth mentioning. Keep in mind that a direct comparison isn't even fair or valid, since Deno is a newer project that benefits from new coding techniques and also uses a different runtime than Node.js.

### Security

As we saw earlier, Deno has a more granular permission system than Node.js, which means you can control which scripts have access to what types of permissions on your system. For example, we can write a script that has no extra permissions and it will be denied from making any system modifications. Let's do a quick example with network permissions. Create a new file anywhere called `net.ts` and put the following content:

```typescript
const response = await fetch('https://jsonplaceholder.typicode.com/users')
const users = await response.json()
console.log(users[1])
```

When you run the script using `deno run ./net.ts`, Deno will ask if you want to grant permission for the script to access the network. If you answer `y` it will run the script and show the result. If you answer `n` it will deny access and show an error:

```bash
$ deno run ./net.ts
⚠️  ┌ Deno requests net access to "jsonplaceholder.typicode.com".
   ├ Requested by `fetch()` API
   ├ Run again with --allow-net to bypass this prompt.
   └ Allow? [y/n] (y = yes, allow; n = no, deny) >
```

You can also run the command using the `--allow-net` parameter to grant permission for the script to access the network:

```bash
$ deno run --allow-net ./net.ts
```

This will give full network permission to the script, but since we're only accessing one site, we can grant permission only for the domain we're accessing:

```bash
$ deno run --allow-net=jsonplaceholder.typicode.com ./net.ts
```

### Web Standards

Another thing you should have noticed is that we can use `fetch` natively from within Deno without importing anything, plus we can use top-level awaits the same way we use them in a script that follows the ESModules standard. This happens because Deno follows web standards quite closely, so you can use fetch, websockets, web workers, etc. without importing anything.

For example, let's create an echo server script, that is, a websocket that echoes back everything you send to it. Create a file called `echo-server.ts` and put the following content:

```typescript
const port = 8080
const conn = Deno.listen({ port })
const httpConn = Deno.serveHttp(await conn.accept())
const requestEvent = await httpConn.nextRequest()

if (requestEvent) {
  const { socket, response } = Deno.upgradeWebSocket(requestEvent.request)
  socket.onopen = () => {
    console.log('Client connected')
    socket.send('Hello from Deno!')
  }

  socket.onmessage = (e) => {
    socket.send('You said: ' + e.data)
  }
  socket.onclose = () => console.log('WebSocket has been closed.')
  socket.onerror = (e) => console.error('WebSocket error:', e)
  requestEvent.respondWith(response)
}
```

This server will listen for a single connection on port 8080 and will respond with a websocket upgrade, then will wait for a message from the client. Once the message arrives, it will echo back the same message to the client. Now let's code the client to connect to the server in an `echo-client.ts` file:

```typescript
const ws = new WebSocket('ws://localhost:8080')

ws.onmessage = (e) => {
  console.log('Message from server:', e.data)
  ws.close()
  Deno.exit(0)
}

ws.onopen = () => {
  let input
  do {
    input = prompt('Enter a message to send to the server: ')
  } while (!input)
  ws.send(input)
}
```

When you run the server with `deno run --allow-net ./echo-server.ts` in one terminal, and then run the client with `deno run --allow-net ./echo-client.ts` in another terminal, you'll see the client connect to the server and it will ask you what message you want to send. If you type a message and press enter, the server will echo back the same message and close the connection.

Notice that we're not just using `fetch` or `webSocket`, but also `prompt`, which is another web API. We can even use the famous `alert`:

```typescript
alert('Hello from Deno!')
```

Run this code and you'll see the message in your command line and it will wait for enter to continue.

### The Deno namespace

By default, Deno already has complete TypeScript typing, which means we have all the interfaces that Deno can offer us natively, without installing anything. For example, if you open the `net.ts` file we created earlier, you'll see that Deno already has complete typing for `fetch` and `Response`.

You saw that in the previous examples we also used `Deno.listen` and `Deno.serveHttp`, but we didn't see what they do. `Deno` is a namespace that has various functions and interfaces that can be used to do things like read and write files, listen for and send HTTP requests, etc. You can see the complete list of functions and interfaces that Deno offers here.

One of these interfaces is file reading and, to see how it works, let's read a file using Deno and print its content to the screen. Create a file called `read-file.ts` and put the following content:

```typescript
const fileContent = await Deno.readFile('./net.ts')
console.log(new TextDecoder().decode(fileContent))
```

We can run the file with `deno run --allow-read=./net.ts ./read-file.ts` and see the content of the `net.ts` file we created earlier on the screen.

Notice that we're using another web standard, TextDecoder, which is a class that decodes an array of bytes into a string.

### Standard Library

Unlike Node which has all basic and advanced functionality already in the runtime, Deno chose to externalize these functionalities in a standard library, the famous Standard Library. This library is extremely important because it has no external dependencies and is maintained by the Deno team itself, guaranteeing that it will always work on any version of Deno at any time.

One of the functionalities is a native HTTP server. Let's create an HTTP server using the Standard Library. Create a file called `http-server.ts` and put the following content:

```typescript
import { serve } from 'https://deno.land/std/http/server.ts'

serve(
  (_req) => {
    return new Response('Hello World')
  },
  { port: 3000 }
)
```

Now run the file with `deno run --allow-net ./http-server.ts` and access `http://localhost:3000` in your browser, you'll see the message `Hello World` on the screen.

But if you're used to the Node workflow, no problem. The Standard Library up to version `0.177.0` also has a module with ports of Node.js functionality, so you can use `http` and `https` from Node.js in Deno. Create a file called `http-server-node.ts` and put the following content:

```typescript
import { createServer } from 'https://deno.land/std@0.177.0/node/http.ts'

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello World')
})

server.listen(3000, () => console.log('Server running on port 3000'))
```

Here you'll need to run with an older version of Deno for it to execute. But as of more recent versions, we can import Node modules natively using `node:` in the import!

```typescript
import { createServer } from 'node:http'

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello World')
})

server.listen(3000, () => console.log('Server running on port 3000'))
```

The result will be the same as before, but now we're using Node.js's `http` module.

Another cool tool that's already in the Standard Library is `dotenv`, a library that reads environment variables from a `.env` file and places them in `Deno.env`. Let's create a file called `.env` and put the following content:

```bash
PORT=3000
```

Now let's create a file called `env.ts`:

```typescript
import { config } from 'https://deno.land/std/dotenv/mod.ts'

const configData = await config()
const password = configData['PORT']

console.log(port) // 3000
```

You'll need to run the file with `deno run --allow-env --allow-read ./env.ts` so it can read the `.env` file.

### Development tools

Beyond being a runtime for execution, Deno also gives you a series of tools to help with development. These tools are present as CLI commands.

It's important to note that these tools are included in Deno from the moment of installation, so you don't need to install anything else to have the entire suite that Deno offers.

Something interesting to note is that Deno's idea was to follow a bit more of the Go and Ruby standard where we have a convention followed instead of a series of configurations for each person. So there are various commands that are "opinionated" in a sense.

These are some of them:

-   `deno lint`: Performs static analysis of the code and points out possible code practice errors. You can, for example, run it on our `http-node.ts` file and see the result with `deno lint ./http-node.ts`
-   `deno check`: Like `lint`, `check` does static type checking in your code, the equivalent of running a `tsc`, for example
-   `deno fmt`: Formats code according to Deno's standard, you can run it on our `http-node.ts` file and see the result with `deno fmt ./http-node.ts`.
-   `deno doc`: Shows the documentation of a given module. If this module has documentation on the Internet, it will fetch from the original location, if not, it's possible to extract documentation from types directly from the code as well as include JSDoc and other information.
-   `deno test`: Runs code tests using Deno's own test runner
-   `deno bundle`: Generates a single file with all the code needed to run that program. For example, if we run it on our `http.ts` file it will fetch all the code from Deno's runtime and put it all in the same file, which is very useful for distributing a program to other people without needing to install dependencies, but it is necessary to have the Deno runtime installed. It's a smaller version of `deno compile`.
-   `deno vendor`: This is one of the coolest commands. What it does is download dependencies locally and place them in the project's `vendor` directory. This is very useful for ensuring that the project will work anywhere, without depending on an internet connection or a CDN. Additionally, it also creates an "import map", which is another web standard that we'll see in the next topic.
-   `deno compile`: Generates a single compiled binary with the entire runtime and your code. It's a bit large, but it's amazing for being able to share and run programs on computers without needing to install anything extra (another idea that came from Go). We'll talk more about this command later because it's quite useful.

#### Configuration file

Deno has a default configuration file called `Deno.json` or `Deno.jsonc` (JSON with comments). This file is used to configure some things in Deno, such as `tasks`, which are the scripts from `package.json`. Let's create a script to run our `net.ts` file.

Create a file called `Deno.jsonc` and put the following content:

```json
{
  "tasks": {
    "net": "deno run --allow-net ./net.ts"
  }
}
```

Now run `deno task net` and you'll see the result of our HTTP call.

This file isn't just for Deno configuration itself, but you can also adjust small options, for example, in the `fmt` command to define your preferences, or small adjustments in the TypeScript compilation similarly to `tsconfig.json`. For example, if we want to allow the use of decorators in our code, we can add the following configuration:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

See the complete reference of the configuration file here.

### Decentralized packages

This is quite an important point and deserves some space and attention because it's by far the biggest difference between Deno and Node.js. As you may have seen in Ryan's presentation at the beginning of the article, one of Node's problems is having a centralized package manager. If you're wondering what the problem with that is, I recommend watching another sensational video called The Economics of Open Source:

![](https://www.youtube.com/watch?v=MO8hZlgK5zc)

In short, having centralized package management puts power in the hands of a single company. If that company decides something that goes against your principles or your community, you can't do much about it. On the other hand, having a private company manage packages ensures better quality and security. You can ensure that the system won't go down and that packages will always be there to use, since the integrity guarantee is made by the company.

Deno solves this problem in a very clever way. Using ESModules, it doesn't have a centralized package manager, but rather a module import system based on URLs. This means you can import any module from anywhere that serves a valid TS or JS file. This was very inspired by how Go imports packages, which is also URL-based. The difference is that this is possible because of the ESM specification in JavaScript.

Additionally, Deno doesn't have a `node_modules` folder where all modules are stored in each project. What it does is more like what Yarn 2 does. It downloads modules and places them in a global cache, so you don't need to download modules again if you've already downloaded them in another project. This global cache is the directory defined in `$DENO_DIR`. You can also change it for each project to specify where you want the cache to be stored. Just set the `DENO_DIR` environment variable to the directory you want and run the `deno cache <file>` command.

#### Community packages

We've already imported packages in the previous examples, but they were all from the standard library. But what if we have modules from other people? For that, as we said before, we can import directly from a URL (for example a CDN), or use `deno.land/x` which is a kind of mirror for community packages. Instead of storing packages, it caches packages that are sent from another URL. You can see the details in the module addition section of the website.

Let's import a famous package, Oak, which is Deno's Express in a new file called `oak.ts`:

```ts
import { Application, Router } from 'https://deno.land/x/oak@v11.1.0/mod.ts'

const router = new Router()

router.get('/hello/:name', (ctx) => {
  ctx.response.body = `Hello ${ctx.params.name}!`
})

const app = new Application()
app.use(router.routes())

await app.listen({ port: 8000 })
```

When we run the file with `deno run --allow-net ./oak.ts` and access `http://localhost:8000/hello/World`, we'll see the message `Hello World!` in the browser. Notice that we're using the specific version of the package we want to download, which is super cool when we don't want our modules to break when the package author updates and breaks the API.

Additionally, we can use the deno cache command if we want to download the entire dependency tree of a file without running it. If we're going to distribute this file to other people, we can make all the dependencies of the program available in the same place with `deno bundle ./oak-ts` and only send that file to be executed.

#### Deno compile

Deno has a super interesting command which is `deno compile`. This command will take all the dependencies not just from the program itself but also from the Deno runtime and put it all together in a single executable binary with the permissions already predefined. This is a great way to distribute programs that use Deno to other people without needing to install Deno on each machine.

We can do `deno compile --allow-net ./oak.ts` to generate a file called `oak` that we can run with just `./oak` and get the same result we had before.

### Import maps

Deno has a feature called import maps which is a way to define aliases for URLs. This is very useful when you want to import a package that's not on `deno.land/x` or when you want to import a package that's in a private repository. For example, instead of having to type `https://deno.land/x/oak/mod.ts` every time we want to import Oak, we can define an alias for it in the `import_map.json` file:

```json
{
  "imports": {
    "oak": "https://deno.land/x/oak/mod.ts"
  }
}
```

Now we can go back to our `oak.ts` file and change the Oak import to `import { Application, Router } from 'oak'` and run the program with `deno run --allow-net --import-map=import_map.json ./oak.ts` and we'll get the same result.

If we want to be more concise and put the import map directly in the `deno.jsonc` config file we can do:

```json
{
  "importMap": "import_map.json"
}
```

And then we can run the program with `deno run --allow-net ./oak.ts` and we'll get the same result.

But we can be even more generic and set the import map with the alias for the Deno `x/`, so we can import any community package without having to type the full URL. Just change the `import_map.json`:

```json
{
  "imports": {
    "x/": "https://deno.land/x/"
  }
}
```

Then we can import Oak with `import { Application, Router } from 'x/oak/mod.ts'` and run the program with `deno run --allow-net --import-map=import_map.json ./oak.ts` and we'll get the same result.

## NPM

Starting in version 1.28 of Deno, it's now possible to import packages directly from NPM natively without needing them to be on an external CDN like they were before. The details of these implementations were announced in a post on the deno blog and more details are in the documentation. Essentially the idea is to put the `npm:` prefix before the package name and the version we want to import. For example, to import the `express` package in version `4.17.1` we can do: `import express from 'npm:express@4.17.1`.

Let's try this in a new file called `express.ts`:

```ts
import express from 'npm:express'
const app = express()

app.get('/', (_: any, res: any) => {
  res.send('Hello World!')
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
```

Here we'll have some TypeScript problems because Deno doesn't have types for the `express` package and the `express` package doesn't have types for Deno. This will give us some errors. For that we can import Express's separate typing with `@types/express`:

```ts
import express from 'npm:express'
import { Request, Response } from 'npm:@types/express'
const app = express()

app.get('/', (_: Request, res: Response) => {
  res.send('Hello World!')
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
```

Unfortunately Deno is still in an experimental state with this type of functionality, which means the permission system isn't 100% and it's requesting more permissions than it should. So we'll run with `deno run -A ./express.ts`, where `-A` is a shortcut for `--allow-all` which gives all permissions to Deno.

## Should I switch Node for Deno?

That's the million-dollar question alongside "Is Node going to end!?". Unfortunately I can't answer the first one, but Node definitely isn't going away anytime soon.

Deno is a new tool that's still in development, so it's not a tool to replace Node, but rather a tool to complement Node, or even an alternative to consider.

Node's package community is still much larger, although most modules can be used in Deno as well. So if you want to use a package that's not on `deno.land/x` you can use NPM to import it into Deno, as we just saw. But still, Node is a much older project and much more stable than Deno is today, even though it's improving more each day that passes.

Two things that are definitely worth mentioning are that it's possible to generate packages that work perfectly on Node.js from Deno using DNT, a tool created specifically for this by the Deno team, or D2N which does the same thing.

GrammY is an example of a package that was created using Deno and works perfectly on Node.js through migration with D2N.

Additionally, Deno is part of a company that's moving toward being something like Vercel for backend applications. Deno Deploy is a deployment platform for backend applications that uses Deno as a runtime, and it has a free plan for small applications and is extremely simple to use, so it's worth taking a look.

## Conclusion

Should you switch Node for Deno today? Probably not, but it's definitely worth keeping more than one eye on it as it develops and becomes more stable.

Is Node going to die? No, it's not going to die. Node will continue around for a long time, but it's important that the community knows that Deno exists and that it's a tool that can be useful for many cases. Plus, since it's much newer, it doesn't have as many applications and dependencies as Node does, which means the evolution of the project can be faster than Node's.

I plan to put more articles about Deno here on the blog, so stay tuned!
