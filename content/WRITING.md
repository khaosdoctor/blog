# What you can use in a post

Everything below works in `.mdx`. Almost all of it is plain markdown that Obsidian renders natively, so what you see while writing is close to what ships.

Snippets for the component-shaped ones are in `internal/templates/snippets/`. Run them from the command palette (Templater: Insert template) or bind the ones you use to a hotkey.

## Frontmatter

```yaml
---
title: "The title"          # required
pubDate: 2026-08-12         # required. A FUTURE date means scheduled
description: "One or two sentences."   # required, used for SEO and link previews
category: typescript        # required, exactly one
tags: [nodejs, testing]
draft: true                 # defaults to true, so you cannot publish by accident
---
```

Sections in use: `javascript`, `infra`, `typescript`, `career`, `opinion`, `meta`, `security`. A new value creates a new section page.

Optional: `updatedDate`, `heroImage`, `heroImageAlt`, `epigraph`, `epigraphCite`, `seoTitle`, `seoDescription`, `noindex`, `lang`, `slug`.

For a series: `series` is a short slug that becomes the URL (`grpc`), `seriesOrder` is the position, and `seriesName` goes on the first part only. The table of contents generates itself, including parts you have not written yet.

## Another language

A translation is a second file in the same folder, named after its own slug.

```
blog/error-cause/
  index.mdx                                  <- source, lang defaults to pt, URL /error-cause/
  what-is-error-cause.mdx                    <- lang: en, URL /en/what-is-error-cause/
  image.png                                  <- shared by both
```

- `lang: "en"` is what makes it English. Nothing else.
- `slug: "what-is-error-cause"` sets the URL. Without it the filename is the slug.
- `machineTranslated: true` shows the banner offering the original. Set it to `false` once you have edited the text yourself and the banner goes away.
- Images stay `./image.png`, because the translation sits next to them.
- Being in the same folder is what pairs the two, so search engines get the `hreflang` links for free. There is no field to keep in sync.
- Copy `category`, `tags`, `series` and `seriesOrder` verbatim: they are URL segments, not prose.

## Images

Drop the file in the post's own folder. Paste a screenshot in Obsidian and it lands there.

```markdown
![alt text](./screenshot.png)
![alt text](./screenshot.png "This becomes the caption")
```

An image alone in a paragraph becomes a `<figure>`, and the title becomes the `<figcaption>`. Local images get resized and served as webp automatically.

Alt text describes the image for someone who cannot see it. When there is already a caption saying the same thing, leave alt empty rather than repeating it: a screen reader reads the caption anyway.

## Video and embeds

A YouTube or Vimeo URL alone on a line. Obsidian shows the player while you write:

```markdown
![](https://www.youtube.com/watch?v=IACHfKmZMr8)
![](https://vimeo.com/476516779)
```

A tweet is a blockquote with the status link as its last line, so the quote survives if the embed does not:

```markdown
> The tweet text, pasted.
>
> — ![via Twitter](https://twitter.com/user/status/123)
```

Slides and podcast episodes work the same way:

```markdown
![](https://speakerdeck.com/player/e21b68c7db134ade9b2dad81246a3e53)
![](https://open.spotify.com/episode/1kXjNnp8qKpHRipeAriVDw)
```

Spotify also takes a `track`, `album`, `playlist` or `show` URL. For a Speaker Deck the URL has to be the
`/player/<id>` one, which is what the "embed" button on the deck gives you.

Any other URL alone on a line becomes a bookmark card if `bookmarks.json` has metadata for it, otherwise it stays a plain link.

**A new embed host needs one line**, in `src/lib/embed-hosts.ts`. The CSP and the build guard are both generated from
that file, so they cannot disagree. Embed something from a host that is not listed and the build fails, naming the
host and that file.

An `.mp4` you host yourself needs the component, because it takes a poster frame:

```mdx
<Video src="/videos/my-post/clip.mp4" caption="Optional caption" />
```

## Callouts

Obsidian's own syntax:

```markdown
> [!NOTE]
> Something worth knowing.

> [!WARNING]
> Something that will bite you.
```

`NOTE`, `TIP`, `WARNING`, `CAUTION`, `IMPORTANT`.

## Code

Fenced blocks with a language. The title and highlight options come from expressive-code:

````markdown
```ts title="src/index.ts" {2-3}
const x = 1
const y = 2
const z = 3
```
````

Use a language the highlighter knows. `Dockerfile`, `output` and `ssh` are not in the bundle and render unhighlighted; use `dockerfile`, `text` and `bash`.

## Diagrams and maths

````markdown
```mermaid
graph TD
  A[Start] --> B[End]
```
````

Inline maths with `$E = mc^2$`, a block with `$$ ... $$`. Both render in Obsidian too.

## Notes in the margin

```mdx
Some claim in the text.<Sidenote>A numbered note that sits in the margin.</Sidenote>

Another sentence.<MarginNote>Same, but with no number.</MarginNote>
```

Inline content only: text, `**bold**`, `_italic_`, links, `code`. No headings, no lists, no blockquotes, they render inside a `<span>`.

On a narrow screen both collapse to a tap-to-reveal popover. No JavaScript either way.

## An epigraph

Either in frontmatter, which renders above the title:

```yaml
epigraph: "The quote."
epigraphCite: "Who said it"
```

Or inline anywhere in the body:

```mdx
<Epigraph cite="Who said it">The quote.</Epigraph>
```

## Images from somewhere else

Paste the remote URL and forget about it. `npm run build` runs `scripts/vendor-media.ts` first, which downloads any
remote image, video or audio a post references into the post's own folder and rewrites the reference to `./thefile.png`.
It applies to `heroImage` too.

That means a post depends on nobody else's server once it has been built once. Commit the downloaded file along with
the post.

If a download fails the build carries on, the post keeps the remote URL, and the file is listed in
`.migration/unreachable-media.md` with a link to the post, so it can be chased by hand later. Nothing breaks because a
host is down.

## Linking to another post

Write a wikilink. Obsidian autocompletes it and the graph view picks it up, and the site turns it into an
ordinary link.

```markdown
[[error-cause]]
[[error-cause|read the one about error.cause]]
[[error-cause#Conclusão]]
```

The target is the post's folder name. Without a label the link takes the target post's own title. An anchor
matches the heading text, accents included.

- **A wikilink to a post that does not exist fails the build**, naming the file and the missing folder. That is
  deliberate: a typo cannot reach the site.
- **A wikilink to a draft still links**, followed by a muted `(not written yet)`, the same treatment the series
  table of contents gives an unwritten part.
- **Code is never touched.** `[['a', 'b']]` in a snippet or inline code stays exactly that.
- **Wikilinks work between posts only.** They cannot point at a note elsewhere in a vault, because that note has
  no URL here.

## Footnotes

```markdown
A claim that needs a source.[^1]

[^1]: The source.
```

## Things to know

- **Every heading level counts.** Do not jump from `##` to `####`. The post title is already the page's `h1`, so start at `##`.
- **A post is a folder.** `blog/<slug>/index.mdx` plus its images. The folder name is the URL, so never rename it after publishing.
- **`draft: true` builds nothing.** Set it to `false` and push to publish.
- **A future `pubDate` schedules the post.** It appears on its own at that minute, once the scheduler is deployed.
- **The build never fetches anything.** A bookmark card only renders if its metadata was captured. New links stay plain links until someone adds them.
