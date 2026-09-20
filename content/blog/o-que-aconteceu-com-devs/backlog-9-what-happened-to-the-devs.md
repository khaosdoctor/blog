---
title: "Backlog #9 - What happened to devs?"
pubDate: 2025-03-06T11:00:40.000Z
updatedDate: 2026-07-16T17:48:05.000Z
category: opinion
tags:
  - backlog-newsletter
  - career
  - ai
lang: en
description: What happened to a profession that once prided itself on being super smart and focused on what it does? Did devs stop caring about their work?
slug: backlog-9-what-happened-to-the-devs
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Over the past few years, especially after the pandemic and the explosion of AI, I've witnessed a quiet decline in a profession that prided itself on pragmatism and attention to detail: software development.

I'm not predicting the end of this career, quite the opposite. But something shifted in what defined us. Once, we were recognized not just for writing code that works, but for writing code that tells a story. How many hours did we lose in passionate debates about languages, technologies, architectures? We were people who built technology because we loved the process of creation, the art behind the code.

And that passion was always most evident in one fundamental detail: documentation.

![CDN media](./why-read-the-docs-when-i-can-struggle-se-fd9e52.webp)

Documenting the code you just wrote was like writing a book about your work of art, people enjoyed explaining how things worked, they enjoyed talking about the programs they built and the products made with such care.

EA recently [released the source code for Command & Conquer](https://github.com/electronicarts/CnC_Red_Alert) and I posted this tweet:

> The source code for Command & Conquer just came out on GitHub and I was reading through it a bit, I don't know who Joe is, but that code is probably one of the most well-documented I've ever seen in my life. I miss when we had code like that... [pic.twitter.com/4KiWVROfZ1](https://t.co/4KiWVROfZ1) — Lucas Santos 🇧🇷🇸🇪 • formacaots.com.br 💎 (@\_StaticVoid) [March 3, 2025](https://twitter.com/_StaticVoid/status/1896350049963307313?ref_src=twsrc%5Etfw)
>
> — ![via Twitter](https://twitter.com/_StaticVoid/status/1896350049963307313?ref_src=twsrc%5Etfw)

That code was written in 1995 and is undoubtedly one of the most well-documented pieces I've seen in my entire career. But then I stopped to think: it's been years since I've seen documentation like that. _Where did all these good documentations go?_

In the comments on that tweet, a lot of people said the code was ugly, that things are different now, that they would never consider it well documented, and so on. What happened? How did we go from detailed documentation like that to rushed notes in poorly written READMEs?

> I left that question in [another tweet](https://x.com/_StaticVoid/status/1896350281564295320), if you want to give your opinion there it would be super cool! 😄

## What happened to us?

It's always been clear that code is a tool, I never doubted that, and I don't now. But what happened to us? We stopped caring whether people could use or even understand our systems. Today, it seems far more "efficient" and "productive" to just copy some code, paste it without reading anything, and see what happens.

I have some theories...

### The slow decline of critical thinking

To promote [Formação TypeScript](https://formacaots.com.br), I run ads on various platforms from time to time. You may have seen one (or not). It's no secret that I do this, I always have, just like anyone with a digital product.

I've been doing this for years without problems, but recently I published an ad that was a bit more "controversial" and apparently I didn't communicate the message the way I wanted. Several people repeated the exact same comment, even after I had already answered the same question multiple times.

> This happened so many times that I was forced to block comments on all the ads.

It's not the haters or the comments that bother me. I've been online long enough to deal with the inevitable hatred people spill from the comfort of their keyboards. What bothers me is the **complete lack of effort to understand the context**, in other words, to **read**.

And the same happens in development. **Devs are becoming increasingly lazy and complacent**, losing the curiosity that was once a prerequisite for this field.

From a profession that prided itself on being meticulous and focused, we've moved to a generation that outsources its thinking to another machine, only to repeat exactly what it says. Again:

> what happened to us?

Since ChatGPT and other tools came out, the number of people who simply copy and paste a prompt without even reading what it says is absurd.

And it's not just me saying this from a marble throne. There are several reports on the subject:

https://refactoring.fm/p/code-quality-in-the-age-of-ai

https://devclass.com/2025/02/20/ai-is-eroding-code-quality-states-new-in-depth-report/

https://www.gitclear.com/coding_on_copilot_data_shows_ais_downward_pressure_on_code_quality

https://leaddev.com/software-quality/how-ai-generated-code-accelerates-technical-debt

https://www.gitclear.com/ai_assistant_code_quality_2025_research

Almost all of them point to the same thing: code quality is declining year after year because **people are simply copying code instead of thinking**.

![Prevalence of cloned code blocks by year](./duplicate-by-year-wide-3396f6f6bd745a987-97705c.png "Percentage of commits containing duplicated code")

> I have much more to say about this and will address it in another Backlog.

The point here is that few people now care about documenting or giving a bit more attention to the code they write, because quite simply:

- It's easier to ask AI to generate code on the spot, without considering the rest of the codebase.
- Copy all the code and ask AI to explain it in two lines.
- Let AI write the documentation.

And there's a curious problem with all this: AI-generated code tends to be very well commented. The result? A stereotype was created that any well-commented code must have been written by AI, not that it's simply well-written and easy to read.

### A good dev knows how to read and understand

Many people come saying:

> "Ah! But Clean Code is against comments blablabla"

And this is yet another example of how people stopped thinking. _Clean Code_ is an old book, from another time, but that doesn't mean it condemns comments in code, it condemns useless comments. For example:

```js
// Sum a+b
function sum (a, b) { return a+b }
```

It's a useless comment, it describes _what_ is happening, but not _why_. And that's where the nuance is.

Documentation (whether in comments or not) should explain the _why_ of things, not _what_ the code does. That should be clear just from reading the code.

> "If you can't understand what the code does just by reading it, then you're a bad dev"

That phrase bothers me so much, and for a simple reason. Look at this code:

```c
float Q_rsqrt( float number )
{
	long i;
	float x2, y;
	const float threehalfs = 1.5F;

	x2 = number * 0.5F;
	y  = number;
	i  = * ( long * ) &y;                       
	i  = 0x5f3759df - ( i >> 1 );               
	y  = * ( float * ) &i;
	y  = y * ( threehalfs - ( x2 * y * y ) );   
	return y;
}
```

Now try to read this code without any context. Did you understand it?

If yes, there are only two possibilities: either you're extremely smart and out of the ordinary, or you already know the story behind this block.

Understanding code is hard, mainly because it **always comes with context**. That's why comments are so important. A loose snippet, without explanation, is like opening a book to a random page and trying to follow the story from there.

> If you're curious, the code is [here](https://en.wikipedia.org/wiki/Fast_inverse_square_root)

But I think the blame is not just on devs, but also on a mindset I really hate. The "[hustle bro](https://www.admdnewsletter.com/hustle-bro-culture-is-making-our/)" mindset or "[indie hacker](https://adlega.com/blog/indie-hackers-a-new-path-in-tech-entrepreneurship/)" mindset. That's my other theory.

## Ship it! Ship it! Ship it!

Two words define the IT market from 2019 to today (2025): **money** and **speed**.

Enter any library, tool, or framework site and you'll always see some variation of _"blazing fast"_, _"weeks, not months"_, and the like. Speed and profit at any cost have become the main objectives of practically everything.

The _hustle bro_ culture, with its mantra of "YOU CAN DO IT! BELIEVE IN YOURSELF" and "work while they sleep", gained strength and ended up transforming a mindset I admired, the _indie hacker_ mindset. An indie hacker is a solo entrepreneur who creates a product with total control, without investors, being independent. I always loved that idea of working on what you want and making it succeed. But that changed when everything became about being more efficient and productive, as if money were the only goal.

> People are transitioning from a state of "plan, learn, and execute" to "execute and see what happens".

In the same scenario as the creators of "why test? Testing doesn't add value to the product", comes the idea that "documentation is a waste of time" for the same reason. So documentation is neglected because, once again, "good devs know what's happening in the code just by looking". Documentation, housekeeping, and best practices are seen as wasteful, and the focus becomes only on **ship ship ship**.

To illustrate, I'll mention two emblematic figures of the new "indie hacking", [Pieter Levels](https://x.com/levelsio) and [Marc Lou](https://x.com/marc_louvion?lang=en), but far from being the only ones, they're just the ones making the most noise.

> Note that the details are strikingly similar. Bios with websites and monthly revenues, dollar signs everywhere, the words "ship" and "fast" are quite prevalent.

To prove my point, one of them is currently developing a game with no prior knowledge of game development, without reading documentation, just copy-pasting code from Claude Sonnet and this tweet sums up a lot of what's happening.

> This is like the vibe coding version of the TV show "Alone".[@levelsio](https://twitter.com/levelsio?ref_src=twsrc%5Etfw) is stranded in the wilderness, trying to build a multiplayer videogame with nothing but a Cursor subscription. As time goes on, the challenge gets harder: the game gets more complicated, the bugs get… [https://t.co/t0YOJsljWl](https://t.co/t0YOJsljWl) — George Arrowsmith (@ThatArrowsmith) [March 2, 2025](https://twitter.com/ThatArrowsmith/status/1896186694614802432?ref_src=twsrc%5Etfw)
>
> — ![via Twitter](https://twitter.com/ThatArrowsmith/status/1896186694614802432?ref_src=twsrc%5Etfw)

As the bugs get harder, the solution isn't to learn how to do it right, but to fix the bugs and create more "to see if it works". People are trading the cycle of "plan, learn, and execute" for "execute and see what happens", which is terrible because nobody wants to study anything, just test and see what happens.

The problem is not what they "know they don't know", but what "they don't know they don't know", and yet they believe it's all solved. The biggest example of this was the [recent drama with Marc](https://dev.to/lucaschitolina/the-marc-lou-drama-and-securitiy-lessons-1j02), where one of his products had serious problems because he didn't implement the necessary security in his "MVP". Things that could have been solved with 15 minutes of reading documentation about the use cases. This reminds me again of the meme:

![r/ProgrammerHumor - CLONING BOAT N 5 hours of debugging can sometimes help you save 5 minutes of reading documentation](./vvmy92frv8cd1-03f15a.webp)

## Documentation that matters

To finish, I want to share some tips on how I see good documentation. Companies like [Stripe](https://docs.stripe.com/), [Vercel](https://vercel.com/docs), [Twillio](https://www.twilio.com/docs/), and [Resend](https://resend.com/docs/introduction) in my view are the ones who have best mastered the "art of documenting" what they have. Their docs are extremely well done and easy to read, and they're kept up to date.

And what makes documentation good?

1. Make the homepage a guide, [Stripe does this very well](https://docs.stripe.com/), guiding you through the products
2. Teach the fundamentals of your technology, not just that it exists there, Vercel has a [very good page for that](https://vercel.com/docs/fundamentals)
3. Code should always be present in the form of a tutorial, a step-by-step guide or simple guide, like in [Resend](https://resend.com/docs/send-with-nodejs)
4. Cover common use cases among users with specific documentation for them, like [this page](https://www.twilio.com/docs/sendgrid#send-your-first-email) from SendGrid

But how do you keep documentation up to date? The code changes, but it's not linked to the documentation... But what if it was?

### Documentation === Code

Try to write code that generates documentation, not the other way around. Instead of creating and maintaining documentation separately, make the code the source of truth. Tools like [protobuf](https://protobuf.dev/) or the OpenAPI spec are excellent for keeping contracts documented. Why not generate the documentation **directly from** them?

If you think maintaining documentation is too complicated, stop maintaining it manually. Keep just the code and have it generate documentation automatically. Don't allow updating one without the other. There are several tools that allow this both with comments (JS/TSDoc) and in the code itself. I, for example, have already [created one](https://github.com/expresso/router) that transforms routes directly into OpenAPI specs.

What I mean is that you don't need to maintain documentation separately; you can delegate that task to your code. That way, you'll always know what's in the code and have up-to-date documentation with no extra effort.

### Write comments that matter

Comments should tell a story. If the function is obvious, there's no need to comment. The application probably won't even notice one more comment or its absence, but useless comments do the opposite of what we need.

When a bad comment is added, you can't tell a good one from a bad one, and you end up spending time reading unnecessary things. Nobody likes reading more than they need to.

However, when you provide all the context about why a function or even a line of code exists, you save hours of debugging, both yours and others' in the future.

Contrary to what many say, documentation, if done correctly, can bring many benefits, such as a shorter learning curve and greater ease in maintaining a project in the long term. It's thanks to documentation like that I was able to maintain [this project](https://github.lsantos.dev/gotql) for so long, for example.

And you? What's your opinion on documentation?
