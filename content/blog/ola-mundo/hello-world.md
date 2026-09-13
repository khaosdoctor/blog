---
title: "Hello, World!"
pubDate: 2020-07-23T00:23:11.000Z
updatedDate: 2026-07-16T16:28:42.000Z
category: "meta"
tags: ["blog", "news", "info"]
lang: en
description: "After months of researching and working toward a new phase of content production, this blog has finally come to life!"
slug: "hello-world"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Hey everyone! This is the **first article on this blog!**

If you know me and follow my work, you know I'm a big fan of writing content and I've been writing about technology for a while. For the last 4 years I've been writing a lot for publications like [Medium](https://medium.com/@khaosdoctor) and [Dev.to](https://dev.to/khaosdoctor), but it's time to move into a **new phase of my career as a content creator**.

In this post I'll describe everything that motivated me to create this blog, as well as the technologies I used and what's new! Let's go!

## A new phase

![The most powerful word in the world pops up everywhere. Ironically, this is on Sandown Pier on the Isle of Wight (UK) — a place that has not changed for 30 years.](./photo-1499244571948-7ccddb3583f1-f649ba.jpg 'Neon sign written "change" by Ross Findon / Unsplash')

For years I've thought about creating my own space to share my content. It's not that I don't think other platforms are good enough, quite the opposite—they're excellent places to publish content overall. What made me change were two simple factors: **control and presence**

### Control

**Control** because I like having control over my publications so I can create integrations, modify or migrate content, make secure backups, and keep content freely accessible. Beyond content control itself, it's important for me to have control over the **medium** where I'm publishing.

Platforms like Medium or Dev.to, as amazing as they are, are still limited in some cases. As an author, you don't control what you can do with the system or what integrations you can create. Beyond that, all your content is in the hands of the people who control those networks, and if they ever want to, they can simply disappear the same way they appeared.

Having my own space to publish my content means I can not only find new ways to present that content, but also evolve the site to have cool new features and apply my personal brand. And that's where we get into **presence**.

### Presence

One thing that bothered me the most was having to show people a list of social networks when I wanted them to find my content. This dilutes your presence and impact because it's much harder for people to find you on the network.

Another reason I created this blog was so I could make it a place that's "truly me". Apply the brand that was lovingly created by [several people](https://twitter.com/_StaticVoid/status/1285626274225041409) who helped me turn everything you're seeing into reality. Having control over the front-end and being able to add new tools, I can create a different experience for certain types of posts or even transform the blog into a hub or aggregator. In short, I can do whatever I want!

That's why I decided creating a blog would be the best option, so I could centralize my content so all my articles would come from this one place and I could ask people to find me only here as well.

## So what now? How will it work?

From now on, all **new** content will be published first on this blog. It will also be automatically replicated on [my Dev.to](https://dev.to/khaosdoctor) through [RSS feed](/rss.xml).

All **old content will continue to exist where it always has**. The only thing that changes is that from now on, all **new content** will be posted only here on my [blog](/?utm_source=hello_world_post&utm_medium=in_post_link&utm_campaign=hello_world).

Creating my own blog also let me create an exclusive page for anyone who wants to support my work and help me with this through donations or contributions.

### Just articles?

In summary: **NO** 😌

As I said earlier, this is a new phase of content production, which means beyond the blog I'll also be investing in other content formats. Right now the blog is the first step, but I'm already working on a [YouTube channel](https://www.youtube.com/channel/UCki-WnBzwzpvbBDk4swJniQ?sub_confirmation=1) and also thinking about other ways to share quality content with even more people.

All videos will be published on the channel and have a dedicated post on the blog! That way it's easy to know everything that happened! But it's not just that. The idea is for the blog to become an archive of all my content, both written and not written.

So all my future talks—which can already be found on my [SpeakerDeck](https://speakerdeck.com/khaosdoctor)—will also be available here with a brief description of how they went and details about that event itself. In other words, all the content I've participated in or will participate in will be kept safe here so everyone can find it!

## Always alert!

One of the big reasons that influenced me to create a blog was the possibility of having a _newsletter!_

One thing I feel is missing from written content is that we don't have the possibility of reaching the same people all the time, of staying in constant contact even after someone has left the blog.

My goal with this newsletter is to send monthly (or weekly, I haven't decided yet) a summary of all the posts that were made, highlight important posts, notify followers about events, discount codes, and other cool things that will happen here!

So if you're reading this, consider signing up for the mailing list and stay on top of all the news. You'll also get discount codes and exclusive content. I promise I won't spam your inbox!

window.onload = () => document.querySelector('iframe').contentWindow.document.querySelectorAll('header, .line-wrapper').forEach(e => e.style.display = 'none')

## Under the hood

I know you're probably a developer and want to know what technologies I used to build this site, right? Let's go then!

### The CMS saga

Since I started working with technology, WordPress is one of the most widely used tools for creating blogs. The problem is it's very heavy and I personally don't like using it because I've had many problems with it in the past.

My first choice would have been to create a simple blog using a static generator called [Hugo](https://gohugo.io\(). It's written in Golang. The idea was simple: create the blog, write content in markdown, and publish everything through GitHub Pages. I even set up a repository with a small proof of concept, but unfortunately I ended up not using it precisely because I had bigger plans for this blog than just a blog. And Hugo isn't so simple for creating something more complex.

I moved to [Gatsby](https://gatsbyjs.com), which is essentially the same thing but written in JavaScript using React. The idea came when I saw a project called [Ghost](https://ghost.org), that would solve all my problems!

Ghost is a Headless CMS, which means you can plug any kind of front-end into it and use only its API to manage and create content. In short, it's like having a WordPress without the front-end, just with the API open and the admin panel. So I'd have a post management panel, login and password, access control, the possibility of having more than one person writing the same article, and many other features that any CMS has out of the box.

But what sold me was Ghost's native ability to integrate with a newsletter sending system, which was something I'd wanted to do for a while. I started development using Gatsby, but after I analyzed and studied the subject I realized that what Gatsby did was nothing more than pulling Ghost posts remotely.

Ghost already had a theme that came pre-installed called [Casper](https://github.com/TryGhost/Casper) and another theme with the newsletter already implemented called [Lyra](https://github.com/TryGhost/lyra), so there was no need to have another layer just to serve the front-end. I ended up dropping Gatsby and using only Ghost completely.

### The infrastructure

Ghost is the classic open source project with paid support. You can download and install it on your own machine at no cost, which is what I did, or pay to use their pre-installed cloud.

My goal was to spend no money maintaining the blog itself, so I used the [Azure](https://azure.microsoft.com/?WT.mc_id=personal-blog-ludossan) credits I have from being a [Microsoft MVP](https://mvp.microsoft.com/?WT.mc_id=personal-blog-ludossan) to create the resources I needed in the cloud and install Ghost locally.

So this blog is running exclusively on [Azure](https://mvp.microsoft.com/?WT.mc_id=personal-blog-ludossan).

### The front-end

I'm not a front-end developer. Actually, it's one of the areas where I perform the least in the world of development. So I don't have vast knowledge of frameworks like Vue, React, Angular, or any other. So the idea was to keep it simple.

I took the default theme, Lyra, as a starting point. I forked it to [a new repository](https://github.com/khaosdoctor/blog-theme) to store only the blog theme and all the changes I made to it.

Ghost works with server-side rendered themes using Handlebars as the template engine. From there it was simple, I just had to change the HTML, CSS, and JavaScript of the pages to build my layout on top of the blog's default layout. And this is the result.

## The future

While this is the first of many articles that will appear here, this is not all this blog can be!

For the future, I have the idea of opening this space for other people to also write their content here! Creating a hub of teaching and collaboration! But that's for next time!

## Conclusion

![](./photo-1549032305-e816fabf0dd2-93d1d1.jpg 'Letter written "thanks" by Kelly Sikkema / Unsplash')

Thank you for visiting and reading my content. If you have any feedback about the content or the site itself, please contact me on any of my social networks (which can be found in the menu and footer) or through [my website](https://lsantos.dev/?utm_source=blog&utm_medium=hello_world_post&utm_campaign=hello_world). I'm always available to reply!

If something broke for you while you were browsing around here, go to the [blog's issues page](https://github.com/khaosdoctor/blog-theme/issues/new?title=[BUG]:%20&labels=bug&assignees=khaosdoctor) and describe your problem and I'll try to fix it as quickly as possible.

Thank you so much for reading and believing in my content! 😍
