---
title: "The first programming language"
pubDate: 2024-12-25T11:00:16.000Z
updatedDate: 2026-07-16T17:49:37.000Z
category: technology
tags: ["backlog-newsletter", "computing", "history"]
series: backlog
seriesOrder: 5
lang: en
description: What if I told you the first programming language came out of a loom? Let's understand what sewing has to do with code!
slug: backlog-4-first-programming-language
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

> This edition of _Backlog_ is special because it's the first (and probably the only one for years) to be published on Christmas. Consider this email my gift to you, who follows this project that means so much to me. Thank you so much for the support 💙

To start with, there would be no devs without something we could write to turn our thoughts into something useful a computer can run. We need a way, a language, to tell the computer what we want to do, and that's how we got the idea of creating **programming languages**.

But how did these languages come about? What's the story behind them? And, more importantly, who created the first genuinely useful programming language?

Before answering that, we need to look at the context of how programming languages evolved. This didn't happen overnight – it took over 200 years to get where we are today.

## Where it all started

Before any computer or calculating machine, and more than 100 years before Alan Turing, a French weaver named Joseph Marie Jacquard changed the way looms worked. In 1804, he created and patented the famous [Jacquard loom](https://en.wikipedia.org/wiki/Jacquard_machine), designed to create complex patterns automatically.[^n1]

![The punched-card control mechanism of a Jacquard loom in use in 2009, Varanasi, Uttar Pradesh, India.](./loom-795692.jpg "Ironically, the cards were sewn together")

The Jacquard loom was fully programmable through punched paper cards. Each card represented one row of the design, and the machine could be attached to any existing loom. That made producing fabrics with more complex patterns simpler and cheaper, changing the textile industry of the time.

![Manual loom with double width and Jacquard loom, Colegio del Arte Mayor de la Seda of Valencia.](./1280px-telar-manual-y-maquina-de-jacquar-39d93d.jpg 'A loom with the Jacquard "plugin"')

Even though the Jacquard loom was a simple application of a DSL (_Domain Specific Language_, a language designed for one specific purpose), his work inspired the development of more complex languages, ones that could be interpreted by different kinds of machines.

## Ada Lovelace and note G

Thirty-six years after Jacquard patented his loom,[^n2] in 1840, professor [Charles Babbage](https://en.wikipedia.org/wiki/Charles_Babbage) was invited to give a seminar in Turin, Italy, about the progress of his most ambitious project: the analytical engine (a topic for a future _Backlog_). That seminar was the only public presentation Babbage ever gave about the revolutionary machine he was building.

![](./image-3.png "Charles Babbage")

During the talk, an engineer named [Luigi Menabrea](https://en.wikipedia.org/wiki/Luigi_Menabrea) – who would later become prime minister of Italy – took detailed notes to understand how the complex model worked, a model that would later be known as the world's first mechanical computer (even though it was never built).

![](./image-4.png "A rendering of what the analytical engine would be")

Babbage had an important friend and mentee: [Ada Lovelace](https://en.wikipedia.org/wiki/Ada_Lovelace). Since 1833, he and Ada, a brilliant mathematician and daughter of the poet Lord Byron, had exchanged letters and notes about their research and mathematical progress. After a conversation with Charles Wheatstone, Ada was given the suggestion of translating Luigi Menabrea's notes into English as a way to contribute to the work. When she finished the translation, Babbage suggested she add her own thoughts as appendices, which Ada simply called "notes".

![Augusta Ada King, Countess of Lovelace, daguerrotype portrait circa 1843](./ada-byron-daguerreotype-by-antoine-claud-cd18fc.png 'Ada Lovelace in her only "photograph", taken in 1843')

Ada put together seven notes, named A through G, detailing how the analytical engine worked. In the last one, note G, she described an algorithm to calculate the [Bernoulli numbers](https://en.wikipedia.org/wiki/Bernoulli_numbers), designed to run exclusively on Babbage's machine. That algorithm – and that note – is widely recognized as **the first computer program ever written**, making Ada Lovelace **the first programmer in history**.

![](./1280px-diagram-for-the-computation-of-be-486f33.jpg "Note G")

Ada's [notes](https://en.wikipedia.org/wiki/Note_G) were three times longer than Luigi Menabrea's original article. Beyond describing the algorithm (only in the last note, G), Ada detailed how the whole analytical engine worked, explaining how it differed from the earlier machine, the difference engine. In note C, she introduced revolutionary concepts such as loops, control flow (_if_, _else_) and functions – the first time these ideas ever appeared in history.[^n3]

And she did all that without ever having even seen the machine itself (which was never fully built) or used any part of it. And here we are today complaining when we can't use an API without documentation...

## Plankalkül, almost there...

The world of computing stayed pretty much the same for about 100 years. But between 1943 and 1948, a German scientist named [Konrad Zuse](https://en.wikipedia.org/wiki/Konrad_Zuse) (pronounced "Zuza") started noticing a big problem: no existing computing language was [Turing-complete](https://en.wikipedia.org/wiki/Turing-complete), which made them unsuitable for his Z1 to Z3 computers.[^n4]

Zuse's computers started out as mechanical calculating machines, similar to Babbage's ideas. But by the third version (the Z3), he built something revolutionary: a fully digital and programmable computer. Now all that was missing was a language his computer could understand...

![](./image-13.png "The Zuse Z3, the world's first digital computer")

Why not build your own language? That's exactly what Zuse did. He drew on mathematical concepts, including propositional calculus – a complex field of mathematics – to develop a programming model.

However, since implementing propositional calculus directly on a computer would be extremely hard (and it wasn't Turing-complete), Zuse decided to design his own language, called Plankalkül.

[Plankalkül](https://en.wikipedia.org/wiki/Plankalk%C3%BCl) is widely recognized as **the first high-level programming language**, because it abstracted away much of the computer's internal workings. With it, engineers didn't have to deal directly with repetitive tasks like writing loops by hand.

Even though it was a fully established language in theory, Plankalkül was never implemented on Zuse's computers, like the Z3, despite being developed afterwards. The Z3 itself was programmed using punched tape made of movie film, read by electromechanical relays into a 1408-bit memory (64 words of 22 bits each).[^n5]

![](https://www.youtube.com/watch?v=aUXnhVrT4CI)

Instead, his main motivation was to offer a more efficient and structured way to program, allowing for more sophisticated and "easy to understand" programs.[^n6]

![Primer lenguaje de programación: Plankalkül - Blog de Linube](./primer-lenguaje-programacion-1280x720-f53d9d.jpg "A program in plankalkül")

I'd like to explain how this "simpler" language works, but honestly, I couldn't understand a thing (Zuse was much smarter than me). So I'll leave you with the basics:

-   The language has only one primitive type, called `S0`, which represents a bit, that is, a boolean value. A bit can be `0` or… `L` (yes, that's right, why use `1`?). So the number 2 (10 in binary) would be written as `L0`.
-   Every other type is composite, built from arrays or tuples of bits. For example, a sequence of 8 bits would be written as `8 x S0`.
-   Variables are always local, there's no global scope.
-   There's no support for recursion, goto statements or references – only direct values.
-   It supports control structures like if, else, for and while.
-   Composite types are always arrays or tuples, no more complex variations.
-   Uppercase letters, like V, Z, C and R, identify variables, outputs, registers and constants.

I imagine all of this made perfect sense in Zuse's head (because it makes none in mine), but unfortunately the war and the collapse of Nazi Germany interrupted his work.

Under Allied occupation, he was forbidden from continuing to build computers, and focused his efforts on creating languages, but the language was never implemented at the time. The first working implementation of Plankalkül only happened in 1975, when Joachin Hohmann used it in his academic dissertation.

> Despite never being implemented originally, Zuse's publication had significant impact on the development of later languages, like ALGOL and APL, which we already talked about in edition #2.

## Now yes, the mother of ALL languages

Up to this point, most languages were built in a fairly artisanal way: their creators basically structured everything they knew about computing into a working system. Some of those languages, like the APT used on the M70 we saw in the other edition, were so specific that they even required special keyboards, full of unique symbols – very different from what we use today.

But that started to change in 1954 with the arrival of [FORTRAN](https://en.wikipedia.org/wiki/Fortran) (short for _**FOR**mula **TRAN**slation_), the first commercially successful programming language. Developed by a team led by John Backus at IBM, FORTRAN brought a practical and efficient approach that changed the way people programmed.

![](./image-6.png "Programming language tree (https://www.levenez.com/lang/lang.pdf)")

Behind these revolutionary languages was a huge technical challenge: getting computers to understand them.

### Compilers

Between Zuse's invention in 1943 and 1954, any code written for a computer had to be translated directly into machine instructions specific to that hardware. It was like writing an exclusive program for each processor, using a language only that processor understood – often made up of mathematical symbols.

In 1950, a revolutionary invention appeared: the **compiler**. It made possible a group of languages called [_Autocode_](https://en.wikipedia.org/wiki/Autocode), which at the time were described as "code systems". The term _autocoders_ referred to a family of compiled languages, where the same set of instructions could be translated into machine code for different computers. In other words, you could write the code once and compile it for several machines, something unheard of until then.

The first of these languages, believe it or not, was also called _Autocode_. It was created in 1952 by Alick Glennie, along with its own compiler. That language is considered **the first compiled language in history**, even though it saw little use outside the [Manchester Mark I](https://en.wikipedia.org/wiki/Harvard_Mark_I) computers.

![](./image-1.png "An autocode program to calculate a cubic function")

This evolution brought a radical change: now you could write code using a single system, where only the compiler had to be adjusted for each machine. That hugely simplified the development of new programming languages and opened the way for even bigger progress in the field.

### The story of FORTRAN

At the end of 1953, John Backus presented a bold proposal to his bosses at IBM: create a more practical and efficient alternative to [Assembly](https://en.wikipedia.org/wiki/Assembly_language) for programming the IBM 704 mainframe. The idea was to make everyone's life easier, letting them focus more on the problem and less on the machine instructions.

![](./john-backus-2-512787.jpg "John Backus in 1977")

The main thing the new language had to solve was making it simpler to put mathematical equations into computers, building on studies from 1952 that proved it was possible to convert equations directly into code.

FORTRAN had a clear goal: translate math into code. Hence its name, short for _FORmula TRANslator_.

The first specification of the language was completed in 1954, under the title "_The IBM Mathematical Formula Translating System_". In 1957, the first FORTRAN compiler was built, and it produced machine code fast enough to convince most programmers that a high-level language could be a viable alternative – even with the various early bugs.[^n7]

After 1958, FORTRAN got a reliable compiler and quickly became widely used on most IBM mainframes, establishing itself as the main programming language of the era. Its success was so big that by 1963 there were already more than 40 FORTRAN compilers.

FORTRAN was especially popular among scientists who needed to do heavy, precise calculations with long numbers. Because of that, the language kept being improved and, to this day, it's recognized as one of the fastest languages in the world for numerical processing.

The initial version of FORTRAN had 32 keywords (Golang, for example, has 25) and supported:

-   Switch
-   Go to
-   Tape or block I/O
-   Arithmetic

When it was created, there were no disks or screens, most programs were still done on punched cards, so developers had a "form" where they could write, erase and test the code before transferring it to a final card.

![](./image-5.png "A form for coding FORTRAN")

And on those punched cards, there were specific columns reserved for control use, for example:

-   A C in the first column turned the whole card into a comment
-   Columns 1 to 5 were labels, used to jump back in constructs like `GO` and `IF`
-   Column 6 was for saying whether the card was a continuation of the previous one
-   7 to 72 was where we wrote the programs
-   73 to 80 were ignored because the IBM 704 only read 72 columns, so they were often used for annotations or identification, like the order of the cards and so on.[^n8]

![](./image-9.png "A FORTRAN card with a statement")

### Evolutions

After the initial version, FORTRAN kept evolving – and still does. It's the oldest programming language still in active use, with its most recent version released in 2023. The first major update, **FORTRAN II**, brought a significant step forward: support for procedural programming, allowing subroutines and modularizing code more efficiently.

![](./image-2.png "A FORTRAN II program")

The initial version of FORTRAN had no functions or routines, all the code had to be replicated and copied, but in version II you could use the keywords `SUBROUTINE`, `FUNCTION` and `END` to create a routine, plus `CALL` and `RETURN`. But the early versions still didn't support recursion.

Then came **FORTRAN III**, which introduced the ability to write _assembly_ directly alongside FORTRAN code. That version, though, was never released as a commercial product. Instead, IBM released **FORTRAN IV** in 1961, bringing significant changes. The main one was removing dependencies specific to IBM machines, like the `READ INPUT TAPE` instruction, allowing FORTRAN to be used on computers other than IBM's.

But maybe the most important step was **FORTRAN 66**. That version was the first to go through an official standardization process, very much like what later happened with JavaScript. The specification was written by the _American National Standards Institute (ANSI)_ and a committee called _BEMA_. Based largely on FORTRAN IV, it brought several important features:

-   Subroutines and functions
-   New primitive types `INTEGER`, `REAL`, `DOUBLE PRECISION`, `COMPLEX` and `LOGICAL`
-   The `DATA` keyword for specifying initial values
-   `GO TO` , `IF`, `DO` and many others

![](./image-7.png "The same FORTRAN II program in FORTRAN 66")

11 years later, FORTRAN 77 is what we have as the beginning of what we use today as a programming language, including changes like:

-   The use of structured `IF` with `END IF` instead of `GO TO` and `CONTINUE`
-   The first use of quotes for text, since it was now possible to write on terminals
-   Adding `PROGRAM` to name programs

![](./image-8.png "The same FORTRAN 66 program in FORTRAN 77")

An interesting bit of trivia about FORTRAN is how it handled comments and empty lines. Any line starting with the letter C was read as a comment. However, the FORTRAN compiler read every line of the program in sequence – including empty lines, which often caused errors. To avoid trouble, it was common to use an empty comment to separate one line from another.

FORTRAN kept evolving, but it was only 13 years later that a major revision appeared: **FORTRAN 90**. That version is one of the most commonly used to this day, because it brought significant changes you probably didn't even notice right away, but that made programmers' lives much easier:

-   Text didn't have to be indented 6 characters in before any statement[^cartoes]

[^cartoes]: Remember the 6 columns on the punched cards? Now look at the indentation of the earlier code and compare.
-   Keywords could be lowercase
-   Variable names up to 31 letters (before it was only 6)
-   Inline comments instead of taking up the whole line
-   Now you could operate on arrays as a whole
-   Recursion
-   Modules to group procedures and data together and make them available for importing into other programs, the first concept of a "package"
    -   Here we also get encapsulation, with private functions and parts of a module
-   Overloads
-   `SELECT CASE`, which is the first version of a `switch`
-   ....

Now FORTRAN programs look a lot like what we write today, check out a hello world:

```f90
program helloworld
     print *, "Hello, World!"
end program helloworld
```

After these versions, we still have FORTRAN 95 through 2023, which implemented many changes right up to today, making FORTRAN extremely useful even now.

## FORTRAN today

FORTRAN is still widely used in critical and legacy systems, like aviation, mainframes and applications that demand extremely fast computation. Its relevance is especially in scenarios that require high performance when processing large volumes of data.

The language is a common choice in areas like fluid mechanics simulations, space and terrestrial modeling, and calculating ocean temperatures. Thanks to its efficiency in heavy numerical calculations, FORTRAN is still heavily used in fields that depend on scientific simulations and high-precision engineering.

![](./image-10.png "Computing ocean velocity and temperature using NEMO (in FORTRAN)")

FORTRAN code itself went through several changes until it ended up looking a lot like what we understand as programming code, for example, below we have a program to calculate the average of the numbers read:

```fortran
program average

    ! Read in some numbers and take the average
    ! As written, if there are no data points, an average of zero is returned
    ! While this may not be desired behavior, it keeps this example simple

    implicit none

    real, allocatable :: points(:)
    integer           :: number_of_points
    real              :: average_points, positive_average, negative_average
    average_points   = 0.
    positive_average = 0.
    negative_average = 0.
    write (*,*) "Input number of points to average:"
    read  (*,*) number_of_points

    allocate (points(number_of_points))

    write (*,*) "Enter the points to average:"
    read  (*,*) points

    ! Take the average by summing points and dividing by number_of_points
    if (number_of_points > 0) average_points = sum(points) / number_of_points

    ! Now form average over positive and negative points only
    if (count(points > 0.) > 0) positive_average = sum(points, points > 0.) / count(points > 0.)
    if (count(points < 0.) > 0) negative_average = sum(points, points < 0.) / count(points < 0.)

    ! Print result to terminal stdout unit 6
    write (*,'(a,g12.4)') 'Average = ', average_points
    write (*,'(a,g12.4)') 'Average of positive points = ', positive_average
    write (*,'(a,g12.4)') 'Average of negative points = ', negative_average
    deallocate (points) ! free memory

end program average
```

There are still repositories today containing FORTRAN code, like in games, and the language is still widely used.

https://github.com/fortran-gaming?utm_source=chatgpt.com

## Legacy

FORTRAN was the first high-level language to be widely distributed and everything we use today is either identical to or based on some kind of implementation FORTRAN brought. Foundational languages like COBOL, BASIC and ALGOL were heavily influenced by FORTRAN and, in turn, influenced other languages like B, C and everything that came after.

I was recently at the [**National Museum of Computing**](https://www.tnmoc.org/software) in Bletchley Park (see it on my [instagram](https://instagram.lsantos.dev)) and there they have a really cool wall of every programming language that ever existed on an interactive map. You can get to that map here and, who knows, print it out to decorate your house:

https://www.levenez.com/lang/

That's the end of this edition of Backlog! I hope you enjoyed learning more about what the very first language was and how it worked as much as I did!

A hug and merry Christmas!

See you in the next edition!

[^n1]: You thought I was going to talk about Ada Lovelace, right? Wrong.

[^n2]: She finally shows up!

[^n3]: A funny fact is that not even Babbage himself had thought of this for the machine. Ada's ideas were much bigger than the ambitions of the machine's own creator.

[^n4]: Spoiler: Konrad Zuse is getting a whole edition of _Backlog_. He's widely recognized as the inventor of the world's first programmable digital computer, the Z3.

[^n5]: I'm leaving a video about how the Z3 worked, it's in German but YouTube has auto-translated subtitles.

[^n6]: Zuse thought this was something "easy to understand", I feel sorry for whoever had to use it.

[^n7]: Funnily enough, John Backus created FORTRAN because he hated programming. While writing programs to calculate missile trajectories on the IBM 701, he thought: "There must be an easier way to do this."

[^n8]: Each punched card represented only ONE statement, that is, each card was a keyword or a line, the card above could have been an `IF`.
