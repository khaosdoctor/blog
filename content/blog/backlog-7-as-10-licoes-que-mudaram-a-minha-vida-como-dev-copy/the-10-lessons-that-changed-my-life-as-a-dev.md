---
title: "Backlog #7 - The 10 Lessons That Changed My Life as a Dev"
pubDate: 2025-02-15T14:56:35.000Z
updatedDate: 2026-07-16T17:48:28.000Z
category: career
tags: ["backlog-newsletter", "opinion"]
lang: en
description: Over 13 years I built a dev career I'm proud of. But I didn't do it alone. These were the 10 most important lessons I learned along the way.
seoTitle: The lessons that changed my life as a dev
slug: the-10-lessons-that-changed-my-life-as-a-dev
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Another day, another backlog! Today I'm bringing something different: the 10 most important lessons I learned in 13 years as a dev.

Plenty of people have asked me about tips and essential lessons from my career. I admit I put this idea aside for a while, until I ran into a [post](https://www.linkedin.com/posts/jhonathansoares_10-anos-de-conselhos-sobre-programa%C3%A7%C3%A3o-em-activity-7275651115512135680-RIcm/?utm_source=share&utm_medium=member_desktop) at the end of the year that reminded me of those questions.

So today I want to talk about the 10 most important lessons I learned in 13 years of my career as a dev. Keep in mind these lessons are only within the scope of development, so everything I say here is strictly related to that.

> [!NOTE] 😍
> Remember that, if you liked (or didn't like) the content, leave [feedback here in this form](https://forms.gle/jTMhTyjq389xpDGVA)! It's really important to me to know what you're thinking and what you want to see around here!

---

## 1 - Your code isn't yours: nothing will be the way you want it

The first (and maybe most important) lesson is that code will never be exactly the way you want it. The only way to do everything your way is working alone on a personal project. But in team work, you'll always need to give in and adapt.

In the beginning, I wanted everything to be my way. When someone criticized my code, I thought it was a personal attack. Over time, I realized I was wrong.

The code isn't only yours. It needs to be easy to understand so other people can work on it in the future. What matters most isn't writing it the way you like, but making sure the whole team can work well with it. Learning to accept feedback, discuss solutions and set your pride aside are essential skills for a good programmer.

## 2 - Elegance is for fashion, you need to be pragmatic

How many times have you run into code that's impossible to understand? Or code so abstract it seems to be trying to predict every use case in the world? Or that "elegant" code only the author understands?

The reality is that the code we write isn't for the machine, we solved that problem a long time ago with compilers. They optimize your code so the machine reads it as efficiently as possible. Your job is to write code other people will read and maintain. One sentence that stuck with me was:

> Most systems aren't good enough to become legacy.

That's a brutal truth. Only well designed and robust systems survive for years or decades. I talk about this a lot, but a good system, to me, is made of three pillars:

-   Well written documentation and code that's readable and commented
-   That follows the team's current practices
-   Doesn't have complex abstractions and is simple enough within its scope

I've been crucified plenty of times for talking about commenting code, or when I say emphatically that I don't like functional programming because I think that, besides being hard to read and understand, it demands a lot of prior knowledge. But those statements are grounded in one simple sentence:

> Never assume everyone is like you

Not everyone will immediately understand the code you wrote. Not everyone knows functional programming. And, honestly, you yourself might not understand your own code a few months from now if you don't make it clear.

Always prioritize ease of maintenance and alignment with the team's practices instead of creating "elegant" solutions that are hard to understand.

## 3 - There's no such thing as planning

How many times have I heard the line: "We need to deliver this tomorrow, it's urgent!" But when everything is urgent, nothing is urgent, right? This was one of the most important lessons I learned working at startups:

> What matters is what's happening right now

You can plan your project and your system as much as you want, but if something more important shows up along the way, without a doubt the entire plan gets thrown aside to chase that new goal. Startups are basically founded on this idea of being small, fast boats, easy to turn and catch the strongest wind at that moment. That's why a solid plan rarely survives for long.

At big companies the problem is the opposite: too much planning. Everything takes months to happen, but at the same time everything is treated as top priority. The result? Often nobody knows exactly why something needs to be done and, once it's delivered, nobody knows who asked for it or what it's for.

In the end, I always found it more efficient to focus on goals instead of rigid planning. Instead of trying to predict every step, the ideal is to clearly define "what needs to be done" and keep a long term view. That produces more consistent results and avoids wasting time on plans that soon become obsolete.

## 4 - Sometimes less is more

How many times have we gotten excited about an idea or a new framework or a new concept that we wanted to apply so badly we ended up building a [FizzBuzz Enterprise](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition)?

The big lesson here is that, very often, our project isn't big or critical enough to justify all the technologies and patterns we want to apply. Good architecture matters, but do you really need [K-anonymity](https://en.wikipedia.org/wiki/K-anonymity) and every design pattern that exists for a simple to-do list system? Does that little system with 10 customers really need to protect itself against every CVE ever registered, even when applying those fixes can be more work than benefit?

Sometimes less is more, taking things out of the project so it can move forward is the fastest way to find out whether or not you need to improve your system's architecture.

## 5 - Technology is a trade-off

The classic joke about the senior developer who answers everything with "it depends" has some truth to it. There's no silver bullet in technology that solves every problem. A professor of mine in college used to say:

> Every decision that improves something in one place makes something worse in another

He compared programming to a pact: you always sacrifice something to get a solution, because any choice has side effects.

The important thing to remember is that you'll never make good decisions, you'll always make decisions that are good for something and bad for something else. A classic example of this is security: the better and more resistant the encryption algorithm, the slower it will be. Or like I mentioned in my [article about RSA](/criptografia-assimetrica-com-rsa/), keys can be arbitrarily large, but there's a point where they're **enough**.

Swedes have a word called [**lagom**](https://en.wikipedia.org/wiki/Lagom#:~:text=Lagom%20\(pronounced%20%5Bˈlɑ̂ːɡɔm%5D%2C,\(in%20matter%20of%20amounts\).), which is a way of saying "just enough" or "neither more nor less". That concept sums up this lesson well: the best choice is the one that balances needs without excess.

## 6 - Technology comes and goes, fundamentals stay

This is something every developer learns sooner or later. It's one of those foundational career lessons.

There comes a moment when you get tired of learning something new every day, of always chasing the framework of the month, the latest innovation in AI or the newest architecture pattern. If you base your knowledge only on tools, you're like a bricklayer who believes he can only hammer with a hammer, without realizing anything heavy can do the same job.

Technology works the same way. Tools come and go. I started with Delphi and Visual Basic, which barely exist today. If my learning had been focused only on them, my career would already be over. What really matters is understanding the fundamentals, because they stay relevant regardless of the technology being used.

Pay attention in the classes about algorithms, cyclomatic complexity and even pseudocode. Maybe writing code on paper, the way the Mayans and Aztecs did, will already help you a lot to remember.

Because when the hype around the current language passes, you'll know how to move on to the next one. But remember:

> The market will always be hyped about something, that doesn't mean you have to surf every wave

## 7 - Is done better than perfect?

There was a line one of my CTOs used to say that made me really annoyed: "Done is better than perfect". And that happened for two reasons:

1.  I thought everything should be perfect (see item 1)
2.  I couldn't stand the idea of shipping things unfinished

After a long time I understand what that line really means. It's not that you have to ship things badly done and any old way just so the system moves forward. If someone is asking you to do that, then you're completely right to refuse, but it's about knowing how to measure how much is **"GOOD ENOUGH"** (LAGOM).

There's a really nice manifesto that describes everything I'm talking about here. It's called [_The cult of done_](https://medium.com/@bre/the-cult-of-done-manifesto-724ca1c2ff13) _(_[_video_](https://www.youtube.com/watch?v=bJQj1uKtnus)_):_

![](https://www.youtube.com/watch?v=bJQj1uKtnus)

## 8 - Be your own opponent

For a long time, I saw other people talking about the awards they won and the achievements they reached. I looked at all of that with admiration, wanting to be in that same place. My big dream was always to create something useful, something people would actually use and like. I wanted to be Ken Thompson, Dennis Ritchie or, who knows, the Bill Joy of the modern era.

Over time, I realized I compared myself too much to others, always feeling less important for not having something big to show. That was bad for me. But when I stopped to think, I noticed that the people who did incredible things had only one real adversary: themselves.

You only need to compare yourself with who you were yesterday and try to be better than that version. Nobody else matters in that equation.

Do something that makes sense to you. Everything else is a consequence.

## 9 - Do what you love

It sounds like a cliché until you're forced to do something you don't like. And that happened to me during a job I had. It was a company I really wanted to work at, but when I joined I realized I was doing something further and further from what I liked doing, from my reality, from what made me happy. And that affected not only my output, but also the way I saw my own work.

The truth is you need to steer your career toward something you genuinely like. There's no point insisting on front-end if your passion is back-end, or venturing into infrastructure when what really excites you is databases. Chasing what you like is essential, but it doesn't happen overnight. Often you'll have to go through a period doing something that doesn't satisfy you in order to take the next step. It's the famous "one step back to take two forward".

But don't get too comfortable in what you're doing either, and don't focus only on doing the things you like all the time, because nothing good happens inside your comfort zone.

## 10 - Talk is cheap

Through all these years, I ended up noticing that the saying "those who talk a lot do little" became more and more true (we even have [an issue just about this](/backlog-5-o-show-da-bolha/)). In today's world, that gets even more intense with the explosion of influencers and the flood of information dumped on us. **Don't believe influencers**, be your own influence.

The point is that you shouldn't only believe what people tell you, plenty of people talk too much, sell too much but never actually get their hands dirty. The proof is that most of the people who created incredible things don't even have social media or, if they do, keep a very low key profile.

Reach your own conclusions. It's valid to be inspired by other people, after all nothing is born from zero. But never let anyone guide your entire thinking. This lesson applies to everything in life, not just development.

---

I want to know which lessons you learned throughout your career! Comment over on [my socials](https://lsantos.dev)!
