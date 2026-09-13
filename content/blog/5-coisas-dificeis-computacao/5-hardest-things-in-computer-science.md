---
title: "The 5 hardest things in computing"
pubDate: 2022-08-03T14:00:00.000Z
updatedDate: 2026-07-16T16:07:31.000Z
category: "opinion"
tags: ["opinion", "development", "architecture"]
lang: en
description: "After almost 11 years in this career, I decided to write a bit about the things I find most complex in programming, and it's not writing code!"
slug: "5-hardest-things-in-computer-science"
machineOwnedTranslation: true
draft: false
---

There's a super famous quote in the computing world that goes like this:

> There are only two hard things in computer science: cache invalidation and naming things

This was said by Phil Karlton quite a while ago, and it's still very real today.

After reading [this fantastic article](https://blog.frankel.ch/hard-things-computer-science/) by Nicolas Fränkel, an experienced software engineer, I decided to throw in my two cents on some of these topics and give my view on why I think they're hard in our field.

This is going to be an article with _personal opinions_, so it doesn't mean I'm completely right or completely wrong about anything, and much less that you should blindly follow my words here (and please, don't do that), but I'm simply putting down my experience in the field and everything I've been through so I can do something I really enjoy: writing about technology.

## Computing, in general, is complicated

Before I start talking directly about the techniques and things I find most complex in computing, I want to give an introduction about computing itself.

First of all, there are infinite people selling the idea that everything in computing is easy, that you can learn everything you need and be completely ready for the market in less than a year. While that may be true for _some people_, the vast majority of us don't have that gift, and it's not because we have some kind of intelligence problem, but because **computing is in fact hard**.

Concepts that, for devs, are basic and simple like list manipulation, memory allocation, loops, messages, asynchronicity and so on. They're actually extremely complicated by nature, which is why, if you're learning, never give up because "everybody knows this and I don't". There will always be something you won't know, and computing requires constant study.

On top of that, I personally believe that the vast majority of the technical concepts everybody claims are hard end up being a passing issue, meaning you learn how that concept works and you'll never forget it again. In the case of the points I'm going to bring up here, both the technical and the non-technical ones, they're problems you simply can't learn completely because they're not "teachable".

I say this because you can know a lot about them, but precisely because these concepts are very broad and very basic, there's no way you can simply know everything that exists, because they will always change according to something we're doing at the moment, according to the time we're living in and the applications we're building, so there's no single answer or silver bullet, just like anything in computing, everything **depends**.

### Naming things

Since I started programming I haven't met a _single person_ who says naming something in development is easy. This happens mainly because everyone has a different notion of what's "right" when it comes to naming some kind of variable or concept.

If you haven't been through this yet, I'm going to present two incredible quotes I've read over the years that coincidentally (or not) showed up in the article I mentioned. The first one was said by **Donald Knuth**, one of the creators of UML and a prominent software engineer who dedicated his whole life to, basically, naming things:

> Programs are meant to be read by humans and only incidentally for computers to execute – Donald Knuth

That's one of the truest phrases I've ever seen, and I disagreed with it a lot in my first 2 years as a dev because I thought my code should be as close as possible to the code the machine was going to read since that would make me _A BeTtEr DeV_ and, clearly, the world doesn't work that way.

For example, I can show you this:

```js
function f (t) {
  if (t <= 1) return 1
  return f(t-1) + f(t-2)
}
```

Very pretty, very techy, but completely unreadable. Most people who have been coding for a while will figure out this is a function to calculate the Nth fibonnacci term, but only because, at some point in their dev life, they had to write that function. Now someone who has never seen it will be completely lost about what's going on, even more so because it's a recursive function, which is another one of those concepts every dev takes for granted, but that isn't all that simple.

And what if it were written like this:

```js
function fibonnacci (termo) {
  if (termo <= 1) return 1
  return fibonnacci(termo - 1) + fibonnacci(termo - 2)
}
```

Much easier, but less _HaCkEr_. When you work in software development, infrastructure or **absolutely any team work**, we need to understand that our code won't be read only by the machine, but by the people who are part of our team. And the easier it is for those people to understand what we did, the easier it will be for them to maintain it and suggest new ideas. Another super interesting quote I've heard and read in several variations is from our ever-present Martin Fowler:

> Any fool can write code that a computer can understand. Good programmers write code that humans can understand. – Martin Fowler

Another point, one where I completely agree with the article I cited in the first paragraph, mainly because I've been through the same situation countless times (and still go through it today), is that naming failures usually happen in one of two ways:

1.  Using different expressions to describe the same concept
2.  Using the same expression to describe different concepts

Both are equally horrible to work with, the first because the concept you're trying to convey ends up getting lost and nobody knows what the other person is talking about anymore, this is particularly more common in bigger companies where different areas have to deal with the same idea but each one within their own space.

An example of this that I go through daily while working at a fintech is the concept of "Authorization" in credit cards. That's because for end customers, the idea of authorizing a charge isn't widely publicized, only the charge itself, so when we have to talk to support areas that deal directly with the customer, we have all sorts of problems because we talk about authorization and they talk about "hold" without knowing they're the same thing. And that, besides making communication harder, makes any situation take at least twice as long to be resolved, because you first need to settle a contract between the two sides to only then start working on the problem itself.

The second case is much more serious, because the contract is established, except each side imagines it's talking about something different and when it's time to put it into practice, nothing goes as planned.

![We always think the solution is to create something new our own way](./standards-2x-56de64.png)

This is one of the most interesting things [gRPC](/guia-grpc-1/) tries to solve in part, mainly with the use of indexes to describe the position of fields instead of using the field name to identify the data (besides the fact that we get a big saving in space).

Finally, the eternal problem of _variable casing_, which will never be solved because some people prefer to use `camelCase`, while others prefer `snake_case`. In some cases, the problem runs deeper with legacy systems that don't accept different casings, in other cases we have an internal communication problem, anyway, it's the same case as tabs vs spaces (but this one at least has some kind of benefit).

The final idea is that you need to convey the message you want, in a simple and concise way, but at the same time being descriptive enough.

### Dates, times and timezones

I'm a big fan of the topic "how humans measure time", both in computing and physically. That's because the concept of time is the same idea as the concept of money, it doesn't exist precisely, it's an agreement that (almost) all of humanity created to say that a day is one rotation, a year is one orbit and a month is a set of 28, 29, 30 or 31 days.

Especially when we're talking about time, we have to understand that the "time" dimension is precise and immutable, but the measurement we make of that dimension is completely chaotic and confusing.

For us to have a meaningful measurement, meaning one that means something to someone, we need:

-   A date with day, month and year
-   A time with hours, minutes and the timezone

Without any of the pieces of information that make up part of these measurements, the information is incomplete. For example, a day without a month raises the question "of which month?", a time without the timezone when we're dealing with multiple countries raises the question "but that time where?".

This is such a big problem, at least for me, that I'm going to split it into two parts.

#### Calendars

The biggest problem with measuring time is that it's so fundamental that several important systems depend on it, but at the same time it's so confusing that you can't create an exact rule, because there are always exceptions to what you're doing, and the biggest example of that is, without a doubt, the calendar.

Some months have 30 days, others 31 and only one of them has 28 days, but it can have 29 every 4 years. The logic behind the counting is solid, it makes sense, but we could have been more efficient and split the months into 28 days and created an extra month.[^n1]

Calendars can also be different depending on the country we're in, for example, we use the Gregorian calendar, implemented by pope Gregory, but that implementation happened at different moments in history, other countries, like China, use their own calendar that isn't based on the Julian model or the Gregorian model.

Other countries use the Hebrew calendar, which is more or less similar, but with a very different time counting, and then comes the hardest question of all:

How do you build a global system that's going to work in different parts of the world and accept and/or convert different time countings?

This has a big influence on every kind of system we build, mainly on the time estimates to finish those systems.

#### Times

Timezones are probably the most complicated thing any human takes for granted in their life.

Whenever I think about timezones, this incredible image comes to my mind:

![](./syw7q6gc77f01-87473f.jpg)

Timezones are even more complicated than calendars because measuring days, months and years is more precise, the Earth spins and that defines a day, period. Now, dividing that day into hours is much more complicated because **times aren't as constant as dates**.

The same point in time can have different hours depending on where you are on the globe, 10 in the morning in Brazil isn't 10 in the morning here in Sweden, quite the opposite, here morning is long gone.

But we also can't define the day only from when the Sun rises until it sets, because in places with higher latitudes, like Sweden itself, days (moments with sunlight) really are longer in the summer and much shorter in the winter, with periods where the [Sun never sets](https://en.wikipedia.org/wiki/Midnight_sun).

So how do we make everyone happy? By creating a split into timezones. The math is simple, the Earth is a globe, it has 360º of circumference, if we divide 360 by the 24 hours in a day, we get 15º, now it's simple, we just add one hour for every 15º we move across the globe, right?

Well, it doesn't quite work like that. We realized it would be a much bigger problem for certain places if the timezone line were exactly a straight line, as it should be, some countries would have dozens of timezones, other countries would have half of them on one day and the other half on the next day and all sorts of things, so we **bent the lines**.

That means most countries aren't in a geographical position that matches their timezone, some implement daylight saving time, others don't, so countries in the same timezone can have an hour of difference because of that, and in the worst case, like Brazil, the country used to have daylight saving time and now it doesn't anymore.

![](https://memegenerator.net/img/instances/85332300.jpg)

Besides that, something more unusual, but that happens with a certain frequency, are countries that change their own timezones (since it's all made up anyway, why not complicate it even further) and the cherry on top are timezones that don't follow the rule, for example, India has a UTC+5:30 timezone but every timezone is a whole hour long.

What I wanted to say here is that the way we count time is chaotic as it is, and we still add exceptions to that counting.

### Estimates

Estimates are a complex and controversial subject in the software development world, mainly because everybody is always trying to hit the best date with 100% precision, meaning saying something is going to be ready on a certain date and it actually being ready on that date.

Reality isn't that simple. Estimating something is trying to guess when things are going to happen, every estimate is a guess, no matter how much infinite data you have, it's still a guess unless you can predict the future and all the problems a project not only **can** have but **will** have.

![](./1omm02-25b856.jpg)

One of the coolest things about the article I cited is that it compares estimates with things that aren't software. Most people are tempted to compare the development of a complex system to building a house or a building, we have a very good idea of how and when things are going to be ready in construction, but even so there's a huge amount of buildings delivered late, even though humans have been putting up buildings for the last few thousand years. But why is it different?

The big problem with development is that it's very easy to customize something, the cost of customizing an entire system for a single purpose is very low if we compare it with the cost of building something that serves a single purpose.

Interestingly, I think the civil construction comparison is much closer to hardware infrastructure than to software, because in both cases you have something physical that can't be easily changed.

Something all estimates fail bizarrely to predict are the problems we have throughout the development of the project. We know about things that can happen, but we don't know whether they will, in fact, happen, but even so we can prepare for them, now what about the things we don't know can happen? There's no way we can prepare for something we don't know about.

And that's why estimates fail. Estimates would be a fantastic tool if we could tell a customer that the estimate isn't a final deadline, but unfortunately we're so conditioned to hearing a _deadline_ that we treat every estimate as if it were one, even knowing they aren't.

### Tests and guarantees

Following the idea of estimates come tests and the famous guarantees that things work. Nobody (or, at least, very few people) is deliberately trying to include bugs in the code, everybody wants to see their code working, wants to see the system running without errors and without headaches.

Which is exactly why, in the same way we can't estimate a delivery date, you can't guarantee that any piece of software works the way it was built to work, because we don't know which bugs are going to happen with it.

Unless the system is very simple, it's impossible to say with 100% certainty that nothing will go wrong during the entire life of that product.

> "But I write automated tests: integration, unit, end-to-end and mutation"

Congratulations! You're one step closer to being able to guarantee more clearly that your system works, but even so, even in big companies, the number of errors per line of code written is still absurdly high, **even with automated tests**, and we forget that the ones introducing bugs in the code are us, the same people who write the tests.

### Distributed computing

This is such a complex subject that there are [entire courses](https://youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB) just about how to distribute computational tasks across several processors.

Distributed computing, to level the knowledge, is when we reach the limit of what we can do with a single computer, and we can do a lot. When we reach that point, the only solution is to distribute the load across several computers, we call that _load balancing_ and it's one of the many concepts in **distributed computing**.

Citing the article itself (which cites [a wikipedia source](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing)), we get distributed computing very confused because there are a number of things we assume when we work with it:

1.  Every network is reliable
2.  Latency is zero
3.  Bandwidth is infinite
4.  The network is always secure
5.  Networks never change
6.  There's only one administrator
7.  The cost of transporting messages is zero
8.  The whole network is homogeneous

While some of these fallacies are more trivial for smaller systems, all of them make a lot of sense when we're talking about any system that needs to communicate over a slightly longer distance.

In the article I cited, the author shows two big problems: **dual writes** and **leader election**. I'm going to extend that with one more: **event-driven communication**.

#### Dual Writes

The dual write problem is more and more common these days because of the distributed nature of most systems. It consists of the problem that comes up when we have two distinct databases and we have to keep the same state between both.

This is very common in queue systems and distributed databases like Elastic Search, which depend on multiple parts being consistent to have a satisfactory result. Many of these systems implement models like [Two-phase commit](https://en.m.wikipedia.org/wiki/Two-phase_commit_protocol) to be able to guarantee the general consistency of the parts.

By the [CAP Theorem](https://en.wikipedia.org/wiki/CAP_theorem) we can only have two out of three characteristics of a distributed system: Consistency, Availability or Partition tolerance.

As the article I cited shows well, this isn't much of a choice when we move it into the world of distributed computing, since the whole system is distributed, we need to choose tolerance because we can't have a system that's distributed without having tolerance to working in partitions.

That leaves us with two more choices, either our system is _available_ or _consistent_. And it's ok to choose consistency in cases where availability isn't the biggest concern, but in 99% of cases that's not what happens, because other systems depend on a given system always being available, so we have to sacrifice consistency.

The way we deal with the lack of availability is, usually, by implementing a queue system that receives the requests and stores the data that couldn't be processed by the main system.

In the case of consistency, the idea is to accept that we're not going to have a consistent state **all the time**, but **at some point in the future**, in English the term used is **Eventual Consistency**. And there are infinite ways to implement it, none of them trivial and risk-free.

#### Leader Election

I'm not going to go too deep into this subject since I don't have in-depth knowledge of it right now, but let's just say this is a complex problem both in computing and outside of it.

Distributed systems usually work based on a leader, who is the one dictating the rules of the game and saying who is going to do what. But, since the leader is also a copy of the system, it's subject to failures. And when a leader is down, another needs to be chosen, and then all the partitions of a system need to reach **consensus**.

Both in computing and in public policy, consensus is very hard, just look at elections in any country. In software it's a bit easier, but even so we have super complex algorithms like [Paxos](https://en.wikipedia.org/wiki/Paxos_\(computer_science\)) and [Raft](https://en.wikipedia.org/wiki/Raft_\(algorithm\)) that try to solve the problem.

Another type of network that solves the problem well is Blockchain, so much so that there are completely different consensus systems in networks like Bitcoin and Ethereum, for example.

#### Event-driven communication

The cherry on top of distributed computing is emitting and receiving events, while the concept itself is quite straightforward, the idea of asynchronicity isn't natural to our brains.

That's so true that I [have a whole article series just about Promises](https://dev.to/_staticvoid/series/199311). For some reason, our brains seem to have a huge difficulty understanding the concept of asynchronicity, and distributed computing is basically all event-driven.

Events can happen at the same time, at different times, they can have an order or not, meaning they're complex systems mainly because one shouldn't depend on the other and each event should be indifferent to what happened before or after, so far it all seems easy, but the big problem is creating an **orchestrator** for these events. That's going to be the system that needs to understand which event should produce what and what order they should be executed in, on top of that, the orchestrator should be the one responsible for implementing a dead letter queue system (Dead Letter Queue or DLQ) for the events that weren't successful, and also a retry system to re-queue messages that, for some reason, can't be processed at the current moment.

We understand events super well, the problem is that understanding that everything I just described happens _at the same time_ seems to escape our reality and enter a paradox in our brains. That's the main reason distributed systems in general aren't well implemented, or why [microservices](https://medium.com/@khaosdoctor/microservi%C3%A7os-dos-grandes-mon%C3%B3litos-%C3%A0s-pequenas-rotas-fbfd4ee99f36) fail so spectacularly in some implementations.

What makes this topic even harder is that, since everything is asynchronous, we'll only notice when something went wrong much later, mainly because of the buildup of messages or even the amount of errors showing up in the system states.

This topic also brings another quite complex subject in computing which is **race conditions**. When an action depends on a certain chronology to happen in such a way that, if that chronology is broken, the result is going to be different. For example, if we have a counter that gets a call to read and another to increment, if the increment call is executed before the read we'll have a different output from what would happen if the read were done before the increment.

### Conclusion

These topics are some of the ones I consider complex subjects in computing, some have solutions, others don't. And, for sure, some are more complex than others, but they're all hard in their own way, the important thing is that we keep going deeper and studying each one of these topics.

[^n1]: As [has already been thought of and discussed](https://pt.wikipedia.org/wiki/Calend%C3%A1rio_Fixo_Internacional).
