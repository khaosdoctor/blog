---
title: "29 years of JavaScript!"
pubDate: 2024-12-12T11:00:40.000Z
updatedDate: 2026-07-16T17:49:51.000Z
category: technology
tags: ["backlog-newsletter", "javascript", "computing", "history"]
series: backlog
seriesOrder: 4
lang: en
description: December 4th, 1995 was a special day because it was the release of the language everyone loves to hate! Let's get into the history of JavaScript!
slug: backlog-3-29-years-of-javascript
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

December 4th, 1995 is a very special day. Not only because it's the year I was born, but also because it was the release of the language that, today, everyone loves to hate! **JavaScript**.

As everyone who follows me knows, I'm a big fan of JavaScript and TypeScript, and I like even more telling the story of this language, not only because the language evolved a lot and has one of the most incredible comeback arcs in computing, but also because the history of this language is very interesting. So for this edition of the backlog I want to bring you, celebrating 29 years of JavaScript:

> The story of the language that took over the world.

> This edition is based on [this 189-page paper](https://doi.org/10.1145/3386327), written by Brendan Eich himself about the first 20 years of JavaScript.

## From a "hack" to a global ecosystem

The short version of JavaScript's history is what a lot of people see out there. In 1995, around May 10th, Brendan Eich, a young programmer at Netscape Corporation, was past the halfway point of his 10-day sprint to create a language that would serve as a companion to Netscape Navigator, adding more interaction to the page and making a (still very new) Web more lively

> IIRC, 25 years ago, Wednesday, 10-May-1995, I'd just passed the midpoint of the "ten days in May" sprint to create JavaScript (codenamed "Mocha"). I was on the hook for a demo the following Monday, in order to show JS deep browser integration upside to Netscape (vs Java applets). — BrendanEich (@BrendanEich) [May 10, 2020](https://twitter.com/BrendanEich/status/1259403604626038784?ref_src=twsrc%5Etfw)
>
> — ![via Twitter](https://twitter.com/BrendanEich/status/1259403604626038784?ref_src=twsrc%5Etfw)

In the tweet above, Brendan Eich says that at that time (in 2020, in this case) he was already past the halfway point of his "10-day sprint" to create JavaScript, which back then was called _Mocha_. He had a demo the following Monday to show the browser integration versus the dominant technology at the time, which was Java Applets.

And today, 29 years later, JavaScript is the language that marked the foundation of modern Web development, a language that, these days, is present in 98% of the Internet. Today we celebrate JavaScript not only as a language, but also as a movement that shaped the Internet as we know it.

## A mosaic of possibilities

The history of JS starts with the history of the Web. Developed between 1989-1991 by Tim Berners-Lee at CERN, the World Wide Web was first adopted mostly by the physicist and scientist community, since it was made for sharing papers. But it wasn't seen much outside that community.

One of the biggest reasons the Web was so confined to that community was that using it was pretty complicated, based on text protocols and not very intuitive. That changed when **Marc Andreessen** and **Eric Bina** created **Mosaic** in 1992 while working at the **NCSA**.

![Mosaic | A história do navegador que revolucionou a internet - Canaltech](./i329497-6304b0.jpg "Mosaic, o primeiro browser do mundo")

Mosaic was the first Web Browser in the world, essentially what created the "Browsers" category we have today. It was the one that popularized the concept of the Web outside the CERN scientist community. Clearly, after Mosaic gained fame and notoriety, a lot of people wondered whether it was possible to turn that into something commercial, mostly trying to license Mosaic itself or else creating variations of it. Until a guy named Jim Clark, who founded Silicon Graphics (an extremely important hardware company), got an investment and recruited the two students, Marc and Eric, to found a company called **Netscape Communications Corporation (NCC)** in 1994.

![On The 20th Anniversary – An Oral History of Netscape's Founding | Internet History Podcast](./marc-andreessen-and-jim-clark-the-founde-35e86d.jpg "Eric e Marc (da esquerda pra direita)")

The idea behind NCC was to replace Mosaic with Netscape, a more robust and easier to use version. By late 1994 and early 1995, _Netscape Navigator_ was already the most used browser of all. And what does that have to do with JavaScript? Everything!

## A dead Web

Originally, the Web was centered on plain text through a markup language, HTML, which was declarative and static and represented the structure and content of a Web page. The problem was that these pages were static, and to create dynamic content you had to request another page, so what would be the use for, say, serving databases? Searches? Reports?

There was considerable interest in the industry in creating a scripting language to pair with HTML, giving it more "life", and letting pages be more dynamic. The same way Excel's VBA and AppleScript did with Windows and Mac. These languages weren't focused on building complex systems, but rather on "gluing" parts of various systems together to create better integration and new opportunities.

In 1995, Brendan Eich was recruited to be one of NCC's programmers. Having already worked at big companies like Silicon Graphics itself and MicroUnity, in both implementing specific languages to support defined functions, he already had the knowledge needed to create another language that would be the "glue" between HTML and the rest of the systems.

![Brendan Eich by Peter Adams.](./brendaneich25607-web-f7a620.jpg "Brendan Eich")

Originally, he was hired to "implement Scheme in the browser". (Scheme was a functional language, a LISP dialect, used mostly in academia) but when he got there, he ran into a product far more complicated than he expected, plus there was another danger in the air, and it was called **Microsoft.**

## **The browser wars**

When _Netscape_ launched, Microsoft, still pretty young, had a project called "Project Blackbird", which was a set of information management and data exchange programs for companies, Microsoft's version of the Web, called **Microsoft Network** (MSN, sound familiar?).

The idea was to have an application that would serve dynamic content, audio and video without needing other plugins. It would be built using technologies like Object Linking and Embedding (OLE) and others being developed at the time.

But with the rapid popularization of the Web, Microsoft watched that project get forgotten and shifted focus to technologies aimed at this new "Web" everyone was talking about. In 1994, it tried to buy NCC, but was turned down because the offer was too low. With that, NCC's founders were already expecting retaliation in the form of the famous [Embrace Extend Extinguish](https://en.wikipedia.org/wiki/Embrace,_extend,_and_extinguish), where Microsoft would adopt the standard, extend it with its own technologies and then kill the standard in favor of its own. With that, Microsoft started development of what would be called **Internet Explorer**.

![WinWorld: Internet Explorer 1](./fa7f6d40d7bc337984906b36ee146d47cc0f8f71-c58afe.png "Internet Explorer na primeira versão")

So Netscape had to hurry with the implementation of a scripting language, because Microsoft was coming in hot. The candidates on the table were: Perl, Python, TCL and even Microsoft's Visual Basic, besides Scheme. But everything changed when Java showed up.

## Java (no script)

In early 1995, Sun Microsystems started a heavy marketing campaign to promote its then unreleased language called Java. Netscape quickly saw a business opportunity, since Java also wanted to bring down Microsoft's monopoly over Windows, which was already the most used OS on every machine, with the JVM and its promise of running _anywhere._[^n1]

Soon Netscape and Sun struck a deal where the chosen language wouldn't be any of the previous ones, but Java! And that went public on May 23rd, 1995 (I was 1 month old 👶).

Now with everything decided, all the other languages were discarded for commercial interests, or else because of how hard it would be to integrate a full language into the browser. There wouldn't be enough time to finish the implementation and ship it before Microsoft shipped its browser. And whatever language Microsoft picked to pair with Internet Explorer would be what defined the whole standard from there on.

Microsoft had everything going for it, they had VBA which was already a scripting language used in Excel, they had the knowledge of how to build a browser and how to build a language, they already had the market, all that was missing was the product. So Bill Joy (look at him showing up again), Sun's founder, suggested that the way out would be to implement a "little language" that would pair with Java and complement its functionality.

![James Gosling | Dries Buytaert](./james-gosling-767418.jpg "James Gosling, o criador do Java")

The main doubts coming up at Netscape were whether Java itself wasn't already a language that could be integrated, something that clearly wasn't possible since, to create a program in Java, you needed to

1.  Put the body of the program in a static method called `main`
2.  Inside a class declaration
3.  Inside a package
4.  Declare types for every variable and return

That wasn't the experience Netscape was after for the crowd that would be the "scripters". The language had to be much simpler, it couldn't be class-based, nor have types. That's how Marc Andreessen proposed the codename **Mocha** for the future language, hoping it would be called "_JavaScript"_ later on. It would have to "look like Java", be easy to use and "object-based" rather than class-based.

## Mocha

Java was about to launch, so time mattered in this context. That's why **mocha was implemented in 10 straight days in May 1995.** The most famous fact about JavaScript which is, actually, distorted, because Mocha was a language quite different from what JavaScript became. The 10-day implementation was the beginning of what would become JS, but the implementation at the end of those days was a raw, basic and simple version of what that integration could be.

Technically, Mocha had a hand-written lexer and a recursive parser. That parser emitted [bytecodes](https://dev.to/_staticvoid/node-js-por-baixo-dos-panos-8-entendendo-bytecodes-jib), something that was needed so that Netscape's server (called LiveWire) could understand the instructions. The end result was a simple and very slow language, but a workable one.

![Environment and the programming language Self (part two; language)](./dict6-490d3c.png "O ambiente da linguagem Self")

This is where most of the choices that [everyone loves to hate](https://x.com/_StaticVoid/status/1510709606569414663) were made. Since the language had to look like Java, everything that looked more like VB was removed, but at the same time "looking like Java" made it "look like it worked like Java", which wasn't true.

The other explicit definition was that the language had to be so easy to use that it could be written directly in HTML. And from there, Eich started working on the other points that would make JS what it is today, for example:

-   [Prototypal inheritance](https://medium.com/trainingcenter/heran%C3%A7a-e-prot%C3%B3tipos-no-javascript-2c1e60e005a2) came from a language called Self
-   The idea of High Order Functions and functions as first-class types came from Lisp
-   `this` came straight from Java (which took it from C++)
-   The idea of dynamic property creation
-   The global `Object` that every other type inherits from
-   `eval`
-   `var`
-   Control flow borrowed from C

The Mocha presentation was a success and everyone was optimistic about the release of a more complete and integrated version of Mocha in Netscape 2, scheduled to ship in September of that year.

> Mocha's source code is available on [GitHub](https://github.com/m1t0s1s/netscape-communicator-3-0-2-source/tree/main/mocha/src) with special attention to the ["JavaScript" naming](https://github.com/m1t0s1s/netscape-communicator-3-0-2-source/blob/ec144cc852e4cec98ba0114663b5f270c13c4ad7/mocha/src/mo_java.c#L59-L61) that Netscape hoped would be adopted

## Java (with script)

JavaScript was released on December 4th (after roughly 7 months of development) at a press conference as an "object scripting language" that would be used to write scripts that would "dynamically modify Java properties and objects" and would serve as a complement to Java on the Web.

![](./image.png "Figura 2 do paper demonstrando um console para o Mocha")

Before JavaScript was called JavaScript, it was opened to the public in an open beta of Netscape 2 under the name LiveScript (because of LiveWire) in September of 95, and 1 month later turned into JavaScript to create a strong brand between Java and Netscape.

JavaScript was never meant to be any kind of big language, nor to ship many features, so much so that the language's features were severely cut and JavaScript 1.0 shipped with everything that was "practically done", including a lot of bugs that were fixed during development.

When he was interviewed in 1996, Brendan Eich said he wanted the language to stay small and stay ubiquitous on the Web as the best way to "glue" HTML elements and actions to each other and also connect those components with Java Applets, which would be the rest of the ecosystem. So much so that he used to say one of the examples of JS usage was "creating a link that changed according to the time of day".

JavaScript had a rival called JScript, Microsoft's version of JavaScript, which started with Robert Welland on the IE team, but who before that worked at Apple on support for the Apple Newton (a kind of PalmTop) with NewtonScript, which was also an object-based language also influenced by Self. And Microsoft had an interesting insight, which was to create a _debugger_ for JavaScript built into IE, something Netscape itself didn't have. Plus they realized IE would be nothing if it didn't have full compatibility with the sites Netscape rendered. And that led JScript and IE to reverse engineer Netscape to try to make both more or less alike.

## ECMAScript and today

JavaScript was clearly winning the browser race, and having two different languages wasn't a nice thing. The lack of a specification, of a standard, was a big problem. On top of that, when the Mocha project started in 1995 it was already clear that a specification would have to be written to make interoperability across the whole Web possible.

That's why both Sun and Netscape planned to propose a specification to the W3C and the IETF. But neither one was a good fit for having a brand-independent specification, the IETF focused on protocols, the W3C didn't want to have a language of its own because that went against the organization's purposes. But the need wasn't only about having a standard, it was also because Microsoft was pushing to have VB as the standard language, so having a formal specification would help JavaScript establish itself as a serious language.

That's when Carl Cargill, a specifications expert working for Netscape, put the company in touch with ECMA International and proposed that ECMA take control of the specification. So, on November 4th, 1996, ECMA set up a meeting to define technical committee (Technical Committee, or TC) number 39, TC39. If there was enough interest, that committee would be made official. Which happened, and the first TC39 meeting took place on November 21st of the same year.

I have a video explaining how TC39 works if you're interested!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

The rest of this story is pretty well known, but there are many interesting details that, unfortunately, will be left out of this text. But from there, JavaScript went through several evolutions since the first specification, and what made JS the best known language was the arrival of Node in 2009, which transformed the Web ecosystem and gave JavaScript an astronomical adoption, including new specifications and evolutions of the language that turned JavaScript into what we know today.

But that's a story for another Backlog!

Thank you so much for making it this far, and see you in the next edition!

[^n1]: To give you an idea of how important Microsoft was back then, it wasn't just the owner of the biggest (and almost only) OS used on more than 90% of computers, but also the owner of almost every language that created programs for those computers.
