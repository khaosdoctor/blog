---
title: "Backlog #6 - Are you a good dev?"
pubDate: 2025-01-23T11:00:04.000Z
updatedDate: 2026-07-16T17:48:55.000Z
category: career
tags:
  - backlog-newsletter
  - career
lang: en
description: What makes a good dev a good dev? What is a strong engineer and a weak engineer? Are you one of the good ones?
seoTitle: Can you measure efficiency in tech?
slug: backlog-6-are-you-a-good-dev
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Another day, another backlog out the door! Today I want to bring something different: it's not about history, and not directly about development either, but about devs in general. Let's talk about the **act of doing engineering** and the _software engineering profession as a whole_.

I recently got sent an [interesting post](https://www.seangoedecke.com/what-makes-strong-engineers-strong/?=&aid=recomink1dKTOjct0) by Sean Goedecke titled _"What makes strong engineers strong"_. Here, strength has nothing to do with physical vigor, but with execution, ownership, and the ability to deliver any kind of work.

At first the idea was just to comment on that article, but I found an [earlier article](https://www.seangoedecke.com/weak-engineers/) where the author also discusses the concept of "strong engineers" and "weak engineers". That left me a bit dismayed...

So let's start at the beginning.

## How did we get here?

Before defining what a strong or weak engineer is, I have to explain how we got here.

The [first article](https://www.seangoedecke.com/weak-engineers/?__readwiseLocation=) mentions a [famous Stanford study](https://arxiv.org/pdf/2409.15152) that measured the productivity of a bunch of devs across more than 100 companies and found that roughly [9.5% of any given software engineer](https://x.com/yegordb/status/1859290734257635439) population at a company is essentially doing nothing. The so-called _0.1x engineer_, a nod to the fantastic term _"10x engineer"_, coined by an investor named Shekhar Kirani in a [Twitter thread back in 2019](https://x.com/skirani/status/1149302828420067328). In theory, 10x engineers are mythical beings who deliver all sorts of things, while 0.1x engineers are the opposite.

I did read the study, but I found it strange that it never mentions a split between remote and in-office workers, so I don't know where the data behind the efficiency percentages came from. Likewise, the study doesn't mention any kind of financial outcome, so I also don't know where the data came from to calculate that _these engineers cause $500B in losses_:[^n1]

![Tabela mostrando o custo de "engenheiros fantasma"](./DraggedImage.png 'Tabela mostrando o custo de "engenheiros fantasma"')

According to the study, 108 companies contributed 1.73 million commits from 50,935 engineers. Those commits were combined with public repositories at a ratio of 1 public commit for every 5 private ones. After normalization, 70 commits were selected as the sample, and every claim was based on them.

One of the metrics used was the number of commits in a month, something that [the author himself](https://x.com/yegordb/status/1859291435339743361/photo/1) considers unreliable. And it has already been proven it isn't a good metric:

![Em média, os engenheiros fracos entregam 2 a 3 commits por mês](./DraggedImage-1.png "Em média, os engenheiros fracos entregam 2 a 3 commits por mês")

But apparently the goal of the study wasn't to measure the participants' efficiency, it was to build a model for evaluating programmer efficiency, something practically _everyone_ in the industry has been trying to do forever.

Anyway, that's the study that kicked all of this off. But how do we actually define what a "strong" or "weak" engineer is?

## The legend of efficiency in tech

The first article defines strong and weak engineers as:

> Strong engineers can do tasks that weak engineers simply cannot do. Not even if they were given all the time in the world.

But what are these tasks? According to the article:

-   Very complicated bugs like _race conditions_;
-   Delivering significant improvements to legacy code, whatever "significant" means;
-   Making changes that require a large architectural refactor.

They're valid points, but in my opinion insufficient. For example, are these tasks something both strong and weak engineers have already had experience with? Or are both dealing with them for the first time?

If someone is considered weak for trying and failing to solve a completely new problem, that would make all of us terrible devs when the subject is something as complex as fueling a space rocket.

The point is this isn't black and white, and the author himself acknowledges that. Still, I disagree with the way he categorizes people. He classifies engineers as strong, regular, and weak. According to him, you can be a "regular engineer" who is excellent at solving complex bugs, or a "weak engineer" who is very good at keeping things running.

In my view, things aren't that simple.

Things come in shades of grey (many more than 50). I'm already not a big fan of the junior, mid, senior split, but I understand the purpose when you have to hire. What I don't agree with at all is dividing people even further by who "can solve complicated problems". We're all great at something and terrible at something else.

I want to believe I'm an excellent programmer, it's probably the best thing I do, but I'm a terrible football player.

You can't, and won't, be good at everything, that's called: _being a normal person_.

## What makes a good dev

In the first article he says emphatically:

> ... The real measure of talent isn't speed or delivery volume, but the ability to do tasks that others can't.

However, in the second article, the author lays out the 4 pillars of strong engineers:

-   _Speed_;
-   _Pragmatism_;
-   _Self-confidence_;
-   _Technical skill_.

That seems a bit contradictory to me. Right off the bat, _speed_ shows up as one of the elements, and although delivery volume isn't listed directly, it's a metric clearly tied to speed. After all, the faster you work, the more things get delivered.

I agree with three of the pillars, but _speed_ deserves a separate discussion. As for _technical skill_, I think that one is implicit, you need a certain level of skill to be a good dev, so I won't focus on it now.

### Speed

Speed should never be considered the main metric for judging good or bad engineers. While hitting deadlines matters, delivering something fast and without quality is practically the same as delivering nothing.

I recently commented on this in this thread:

https://bsky.app/profile/lsantos.dev/post/3lfpr5zw6cc2h

Shipping code fast and "for right now" is one of the easiest things in software engineering. If you believe that creating a template on Bolt using ChatGPT prompts to automate everything and deliver "quick value" is an ideal practice, then we have very different opinions.

The problem is that, in that scenario, you probably haven't looked at any of the code produced. Which means that, most of the time, it will be extremely hard to maintain long term, if it's possible at all. And that's the hardest part of software development: delivering something now that will still be working and sustainable 10 years from now.

A funny story was my first big project as a freelancer, about 8 or 9 years ago. It was a pretty simple system, and I wrote the code as fast as I could to deliver the MVP. The client loved it, the product worked for 2 years and nobody ever had to touch it. Nailed it, right? Nope.

Two years later, they needed to do something super simple: add more options to the page. And then came the problem... I couldn't maintain the code. Everything was so coupled that it was easier to redo it from scratch than to try to change what was already there.

All because I thought about the now and gave zero value to what I would need to do to keep it alive in the future. I was very fast, but at what cost?

![](./DraggedImage-2.png)

Of course we have to weigh what we need at the moment, we can't always be perfect and deliver the best possible thing, often _done is better than perfect_, and that's fine.

### Quality vs Efficiency

I always like to remind people that being a _"good engineer"_ is quite different from being an _"efficient engineer"_. Usually good engineers end up being efficient, but not every efficient engineer is necessarily good.

The line between efficiency and pure trial and error is very thin. Purely efficient engineers tend to fail a lot and fast, iterating over each failure until they reach something more solid and reliable. You know who else does that? Machine learning.

![](./DraggedImage-3.png)

That doesn't mean good devs don't iterate, quite the opposite. Good devs do iterate to improve solutions, but the difference is in how. The iteration isn't done on top of a pile of "half applications", it's done on an idea implemented the best way possible for that moment. Each new iteration is an improvement on the previous one, not a complete change.

And the author himself drops a pretty interesting line:

> Genius is usually the opposite of efficient

That's exactly in line with what I just said. Failing fast and fixing even faster, to me, isn't synonymous with quality. It's just a sign that you exhausted every option that doesn't work and settled on the first one that does, without worrying about whether it's the best solution or not.

### Pragmatism and Confidence

These two qualities deserve to be highlighted together because, in my opinion, they're the most important ones for any dev (or technical person in general).

Being pragmatic is essential, especially when you need to deliver something. It's that ability to read the moment and focus on what actually matters. I've even talked about this in a video:

![](https://www.youtube.com/watch?v=eppWQKUixmI)

Thinking pragmatically means knowing when to let go. It's recognizing when your solution isn't the best one, when what you built needs to be redone, or when giving in is the best choice.

I used to get **very** angry when someone said I was wrong and needed to change my implementation. But after a lot of banging my head against the wall, I realized the code I'm writing isn't "mine". I don't write it for me, I write it for whoever comes next and has to maintain all of it.

> Coding is teamwork, you'll rarely manage to do something alone forever.

On the other hand, it's important to know how to stand your ground and trust your own skills when you need to defend a point of view. Being pragmatic and trusting what you know are, to me, two of the main qualities of a good dev.

Of course, anything in excess is bad. Being too pragmatic and dropping everything in favor of data can be as harmful as being too confident and thinking you're always right.

## The learning paradox

There's an interesting paradox that explains a lot about how the market works as you gain more experience. Sean says something here that I completely agree with: why is it easier to find "weak engineers" in senior positions than in junior ones?

The answer is simple. When hiring a senior, we evaluate more than just technical ability. We also consider:

-   Technical ability;
-   Leadership ability;
-   Communication ability;
-   Problem-solving ability.

For juniors, though, the main metric is almost always technical skill. That makes it easier for people who aren't so good technically to get through on smooth talk alone. I've seen it happen several times in the places I've worked, and if you haven't seen it yet, sooner or later you will, especially at big companies.

Another reason is that it's fine for a junior to make mistakes, that's expected. But socially, a mistake coming from a senior isn't as well accepted. Someone with 30 years of career and an enviable résumé is expected to be some kind of mythological figure who never fails. That forces many seniors to learn quietly and on their own, which is a lot harder.

Personally, I have no fear or hesitation about saying I don't know something. It's actually something I preach a lot to everyone I know and/or mentor:

> Not knowing isn't a problem. Not wanting to learn is.

So as long as a person makes mistakes and wants to learn, showing they're open to it, I'm fine with it. The problem happens when a person makes a mistake and refuses to keep learning, maybe as a way to hide some possible embarrassment.

Never be afraid of making mistakes, everyone here is learning.

## What I think about all this

Overall, both articles are very interesting and very well written. They're solid points to keep in mind and to discuss.

For you, what is a good/strong dev or a bad/weak dev? Send it to me on my socials:

-   [Twitter](https://twitter.lsantos.dev)
-   [Bluesky](https://bsky.lsantos.dev)
-   [Linkedin](https://linkedin.lsantos.dev)

Or send me [an email](mailto:hello@lsantos.dev) if you want me to comment on it in the next edition of the backlog!

See you around! And don't forget to [give me your feedback](https://forms.gle/2kVANfh5SJUnBerg8)!

[^n1]: This might be another study based on the same source. Still, I couldn't confirm where those numbers came from beyond what's in the images. If anyone knows, let me know.
