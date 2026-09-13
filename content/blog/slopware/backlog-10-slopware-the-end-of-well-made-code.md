---
title: "Backlog #10 - Slopware: The End of Well-Made Code"
pubDate: 2025-03-20T11:00:10.000Z
updatedDate: 2026-07-16T17:47:54.000Z
category: career
tags:
  - backlog-newsletter
lang: en
description: "Do you know what Slopware is? Well, let me introduce you to something that will probably leave you quite concerned."
seoTitle: "The End of Well-Made Code. Meet \"Slopware\""
slug: "backlog-10-slopware-the-end-of-well-made-code"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

In my [previous Backlog](/o-que-aconteceu-com-devs/), I addressed a topic that has been bothering me a lot over the last few months: the fact that developers today are becoming increasingly lazy and delegating more and more tasks to AI. Since then we've had the advent of this, which I'm now naming as **Slopware**:

> ✨ [https://t.co/6TyHKajGaJ](https://t.co/6TyHKajGaJ) has now gone from \$0 to \$1 million ARR in just 17 days! 💸 Revenue update: \$87,000 MRR (which is \$1M ARR) My first project ever to go up this fast 🤯 Only 3 ads left now: [https://t.co/uc1J8Ia7QZ](https://t.co/uc1J8Ia7QZ) 📊 Stats update: 320,000 people have now flown in the… [https://t.co/scrq1lSJOT](https://t.co/scrq1lSJOT) [pic.twitter.com/NCc50FOgJa](https://t.co/NCc50FOgJa) — @levelsio (@levelsio) [March 11, 2025](https://twitter.com/levelsio/status/1899596115210891751?ref_src=twsrc%5Etfw)
>
> — ![via Twitter](https://twitter.com/levelsio/status/1899596115210891751?ref_src=twsrc%5Etfw)

If you're out of the loop in the tech complaints bubble, this is _Fly Pieter_, a game created by the same Pieter Levels (who I mentioned in the previous Backlog) using only determination and a Cursor subscription. I tried to play, but apparently after 20 seconds of gameplay I couldn't connect to any server (I assume because my setup blocks trackers).

![](./image-2.png)

As you can see, the game isn't a work of art, but that's okay, graphics aren't the most important part of a game (I play _Tibia_ and _Dwarf Fortress_), it's gameplay, story, and so on. The problem is that this game has none of those qualities. It's just a bunch of people flying around and seeing ads. And yet it generates revenue of 1 million dollars annually (according to the creator). My only question is: why? Simple answer: audience.

## The effect of the audience

I have a very strong opinion about this whole situation: I don't agree with people who are putting this guy on a pedestal because he "created" a game and made millions from it. I think our idols are in the wrong places.

Recently Felipe Deschamps posted this tweet:

> A lot of people criticizing [@levelsio](https://twitter.com/levelsio?ref_src=twsrc%5Etfw) saying his game only succeeded because he has a huge audience. What frustrates me is that nobody is accounting for the amount of \*years\* it took him to \*consistently build\* that audience. What am I missing? — Filipe Deschamps (@FilipeDeschamps) [March 11, 2025](https://twitter.com/FilipeDeschamps/status/1899416165409038375?ref_src=twsrc%5Etfw)
>
> — ![via Twitter](https://twitter.com/FilipeDeschamps/status/1899416165409038375?ref_src=twsrc%5Etfw)

And he's right. Levels has been building this for I don't know how long, and I have no problem with that. But it's a fact: it only succeeded because he has a large audience, almost a cult of people who idolize him because somehow the number in his bank account is bigger.

As long as the masses idolize millionaires and billionaires, we'll have the same problem: they sell whatever they want, whenever they want, simply because _they are who they are_.

The biggest example of this is precisely this game, which is basically an ad exhibition. There's nothing you can actually do while playing, just fly, shoot at others, and see ads. That's it. Which, by the way, is reflected in the login page:

![](./image.png)

When you want to promote your startup, you're taken to a Stripe payment page and, for a mere 5,000 USD per month, you can put whatever you want on the balloons.

![](./image-1.png)

Now tell me: if a big game company, say _Blizzard_, did the same thing, would you be happy or pissed off? So why this different treatment? I think you understand where I'm going with this.

> In this [video](https://youtu.be/VQFvugpxNJE?si=5liiW0fqSqzZOBkq&t=400) (which I'll show later), Max discusses the same point. This isn't something most of us could do. It's something only he can do, precisely because of this cult around money.

And if companies have so much money, why not sponsor a game from a small indie producer or a small company working hard to get their game published? Simple: these people don't want to ruin the game with _ads_. Only those who don't care about the product, just the money at the end, do that.

And not everything has to be about money. As long as that's the mentality, the only thing we'll have are poorly made products, full of empty promises.

## Vibe coding

This game was made in a model that apparently has existed for about a month: **vibe coding**. A term coined by Andrej Karpathy (one of the founders of OpenAI, so no bias here...) and shared in a tweet:

![](./image-3.png)

Basically, the idea is to accept absolutely anything that an AI spits out for you. You're no longer coding, you're talking to an AI agent. It suggests code, you accept it without reading. If it breaks, you just copy the message and paste it back into the AI, and keep going until you get the app working.

> This model reminds me a lot of an algorithm called [Bogosort](https://en.wikipedia.org/wiki/Bogosort), where you shuffle a list until it "sorts itself" by luck.

I can't even begin to describe how against this type of thing I am. Simply accepting **anything** an AI suggests is equivalent to going to a barber and trying new haircuts until one works out.

And to top it off, we have this fantastic video from _Y Combinator_ explaining why _vibe coding_ is the future:

![](https://www.youtube.com/watch?v=IACHfKmZMr8)

What's most interesting is that this video is so strange in so many ways. The comments sum it up much better than anything I could say here:

![](./image-5.png '"100x faster? What are you building? To-do lists?"')

![](./image-6.png "\"Vibe coding is the future until you need to do 'vibe debugging'\"")

Garry Tan himself says that one of the things that became clear from the research is: _"Vibe coding is very hard to debug"_. I wonder why. Maybe because you don't understand absolutely anything that's written there? Or maybe because _debugging_ is 90% of being a programmer?

Beyond that, I thought the initial research was a bit odd. The proposed hypothesis is that _vibe coding_ is the future, but the research done was about _"how founders use AI day-to-day"_. This is a classic example of the [**Straw Man Fallacy**](https://en.wikipedia.org/wiki/Straw_man), when you try to prove a completely different point from what's being debated, creating a nonexistent relationship between them. It's like testing the hypothesis that _"people prefer motorcycles to cars"_ by asking if they used to ride bicycles as children.

However, at minute 17, Diana Hu says something that makes sense and which I genuinely agree with: to produce a product _very_ quickly, there's no problem using something like this to accelerate development. The problem is thinking we can build entire companies this way.

> Always remember, if AI makes you a 10x engineer, then you'll probably be replaced by AI in the near future.

While the Y Combinator video is strange but shows a perspective from the side that wants to make more money with less work, another interesting perspective was given by Maximilian Schwartzmüller on his channel:

![](https://www.youtube.com/watch?v=VQFvugpxNJE)

And this one I want to cover in more detail.

### Something to start with

_Vibe coding_ is a cool idea for rapid prototyping, testing concepts, and validating hypotheses without spending much time. But when we're talking about something truly serious, a product that many people depend on that needs to be reliable and sustainable in the long term, you can't treat code like a disposable experiment. You definitely don't want something to _"work more or less"_ when it goes to production, because "more or less" in technology means unpredictable bugs, security vulnerabilities, and in the worst case, an entire system breaking at the most critical moment.

Andrej himself mentions this in the original tweet. So no, _vibe coding_ is not the future of software engineering, it's just a way to test ideas quickly, without much strategic thinking, to see if something works. And even when it does, there comes a time when that code needs to be rewritten the right way.

### The dangers of vibe coding

Going back to the flight simulator case, [in that same video](https://youtu.be/VQFvugpxNJE?si=0vfYqCuB_7R7G2Dn&t=335), he shows the game running in production with thousands of people accessing it. Five minutes in, he also reveals that the code was vulnerable to **XSS (Cross-Site Scripting)**.

![](./image-8.png "\"It's all beautiful until someone 'vibe codes' your bank app\"")

The problem isn't stopping coding or pretending to code. The problem is asking an AI to write code, not understanding what's happening, publishing the code without questioning it, and still ignoring basic security. This puts not just your company but thousands of other people at risk, all because you consider yourself a "10x engineer".

In this specific case, attackers started inserting elements into the game. It was "super cool" for Pieter, but if it had been malware, I bet it wouldn't have been so fun.

![](./image-9.png)

### There's always a bias

Ideally, both AI companies and VCs want this to become reality for two reasons:

1.  **AI companies** want to maintain their value, and it's obvious that "vibe coding" is good for them. The more people depend on AI to generate code without understanding what's happening, the more they consume and buy these companies' services.
2.  **VCs**, like Y Combinator, are focused on one thing: money. If you can reduce the cost of hiring developers, that means more money in your pocket. And many of these VCs also invest in AI companies, which brings us back to point 1.

My point is this: everybody who says that "vibe coding", or AI generating code and solving everything, is "amazing", "the next step", or "the future", generally has some personal interest in making it true.

My unofficial theory is that, deep down (or not), many of these people are trying to reduce the value of developers, because they're essential in a tech economy, and good developers are expensive. It's an attempt to say: _"Hey! AI can do this too, so maybe you're not worth that much after all."_ The goal, in the end, is to pay less and still get the same result. Again, it all comes down to how to make more money faster.

But to be fair, I tested "vibe coding" myself.

### My experience

I posted [this tweet](https://x.com/_StaticVoid/status/1899831757995733333) talking to the frontend crew to do [this challenge](https://t.co/PGA6oJd3xB). The idea was just to generate a search input exactly like this:

![](./public-ab166f.avif)

Igor then gave me the idea of trying to generate it with AI, and that hadn't occurred to me, maybe it could work. But I was completely wrong. I tested four different generators: [Lovable](https://lovable.dev), [V0](https://v0.dev) (which has a screenshot copy feature), [Bolt](https://bolt.new), and [Cerebras](https://cerebrascoder.com). This is what I got:

![](./vibe-lovable.png "Lovable")

![](./vibe-bolt.png "Bolt")

![](./vibe-v0.png "V0")

![](./vibe-cerebras.png "Cerebras")

It's not exactly what I wanted when I made a prompt like: "Copy this component exactly". Even after 35 minutes of back and forth with the AI. So I think I won't be "vibe coding" any time soon.

### The problem with Vibe Coding

For me, the problem with "Vibe Coding" isn't exactly in the code being generated, we already had something similar with assistants like Copilot for a while now. When I say I "like to write code", what I mean is that this is the goal of a project for me. I want to be involved in the coding process, but of course I don't do everything myself. I don't type every line or every letter, which is why I can use assistants to help me.

The real problem, in my view, is not being in control. It's unacceptable for me to "create" a product that I have no control over and have no idea how it works, let alone put it in production for other people to use. When I use assistants, I'm in control. I guide what I want to be done.

More than that, if you don't like writing code, maybe it's time to reconsider whether programming is the right profession for you. As developers, we **need** to like programming itself. I'm not a fan of bugs, of course, but I can't deny that I feel much calmer and more at peace when I'm writing code.

Beyond all that, constantly bouncing back and forth with the AI trying to make it understand what I want is much less productive than simply writing the code myself.

> I really don't understand why some people want to stop writing code.

For people who know absolutely nothing about programming, "vibe coding" might be a good path, but it's a one-way street: either you use it for everything or nothing. If you want to create something very quickly, simple and straightforward, and don't care much about the details, go ahead. But please, don't put other people at risk by not knowing what you should have done yourself.

### You're a hypocrite!

People can call me a hypocrite because I also use AI for other things. It's not a lie, I really do use artificial intelligence. However, something I **don't do** is let it generate something that goes to production, whether it's code, text, or anything else.

I see AI positively when applied to something useful. Examples of this are right here in this newsletter! I always do a review to make the text more concise, fix punctuation, but all the original content is mine, written by me, letter by letter (without autocompletion). When AI is used with purpose, it can be very effective. The problem arises when "using AI" is seen as an end in itself, not as a solution to a specific problem. "Something with AI" is not a purpose. It's just a solution looking for a problem.

## Slopware

I follow a newsletter called "The Honest Broker". In it, the author Ted Gioia [published a very interesting post](https://www.honest-broker.com/p/the-new-aesthetics-of-slop) about the new "art movement" called _slop_. Which is the idea that those absurd AI-generated images can become a real movement. For example:

![](./https-substack-post-media-s3-amazonaws-c-8eec14.jpg "This is considered slop")

The worse, the better; the more absurd, the better; the stranger it is, the more people will buy it. And if you remember the beginning of this newsletter, that describes exactly what our game is: something absurd, poorly made, but that people love for an even more absurd reason, the desire to **not be left out**. It's like a kind of social phenomenon where the status of "being in" becomes more important than the actual quality of the product. And that's what leads us to the concept I'm introducing in this edition: **Slopware**.

> **Slopware** is the type of software that is made any way at all

**Slopware** is the type of software that is made any way at all, without a clear vision or defined objective. It's probably generated largely by AI, and passes itself off as a serious product. The problem is that, most of the time, the creators of these products have no idea how this software was actually created or how it works. It's as if it were a simulation of something "sophisticated", but in reality it's just a heap of solutions that somehow become a usable product, or at least consumable in some way. This becomes even more ironic when we see this type of software being sold as innovation, even though the creation process itself is disorganized and senseless.

In the same newsletter, Ted puts 4 images that look like slop but aren't:

![](./https-substack-post-media-s3-amazonaws-c-b7c38c.webp)

These images show something deeper: they illustrate how, in the real world, people are struggling to achieve the same mediocre result that AI already delivers automatically. The purpose behind this seems to be to normalize the idea that poorly made is the new good. This happens because, in a scenario where everything around us is of questionable quality, anything that stands out even slightly, even if bad, becomes relatively incredible. When the standard is low, even the minimum effort becomes a great achievement.

And that's where my biggest fear lives: that this concept of **slopware** extends to software in a generalized way. Imagine a future where our applications, tools, and systems are made without much care, with AI simply creating something that works in a superficial way, but is nothing more than a quick fix without substance. Instead of aspiring to create robust, well-architected, secure software, we would accept as normal a product that just "does the job" in a mediocre way.

This would represent a major paradigm shift, where instead of having software that is designed with quality and purpose, they would all become examples of **slopware**, and anything that strayed even slightly from this mediocrity would be considered a true revolution. The problem is that, ultimately, this would lead to a decline in overall quality, putting at risk the trust we place in tools that are essential in our day-to-day lives.

That's it. Happy vibe coding.
