# blog.lsantos.dev

Astro 7, static output, MDX files that contain plain markdown. Replaces the Ghost install that ran on a VM for six
years, with every URL Ghost ever published still resolving.

This file is the operating manual. `docs/architecture.md` explains why the pieces are shaped the way they are, and is
the place to look before changing any of them.

## Running it

```sh
npm install     # npm 11 blocks install scripts; package.json allowlists the one Astro needs
npm run dev     # http://localhost:4321
npm run build   # astro build, then pagefind indexes dist/
```

Node 22.12 or newer. The build makes no network calls, so it produces the same output whether or not somebody else's
site is up.

## Writing a post

One post is one folder. The folder name is the slug and the URL:

```
content/blog/deno-3/
  index.mdx
  screenshot.png
```

Images live next to the post and are written as `./screenshot.png`. The collection only matches `index.md` and
`index.mdx`, so any other note in the folder stays a note.

Obsidian opens `content/` as a vault and its config is committed: new files go to `blog/`, pasted attachments save
beside the note. The Templater template in `content/internal/templates/new-post.md` asks for a title and a slug and
moves the file into place.

### Frontmatter

```yaml
---
title: "Título do post"
pubDate: 2026-08-12
lang: pt              # the language you WROTE it in; the other one is generated
category: typescript  # the section, exactly one
tags: ["deno", "cli"]
description: "One sentence. Also the meta description and the hover-preview excerpt."
draft: false
---
```

Those are the required ones (`lang` defaults to `pt` and `draft` defaults to `true`, so forgetting a field cannot
publish anything). Optional: `updatedDate`, `heroImage` with `heroImageAlt`, `series` / `seriesName` / `seriesOrder`,
`epigraph` / `epigraphCite`, `noindex`, `canonicalUrl`, `seoTitle`, `seoDescription`, `visibility`. The full schema,
with comments, is `src/content.config.ts`.

`category` is the section and becomes `/<category>/`. In use today: `javascript`, `infra`, `typescript`, `newsletter`,
`career`, `meta`, `security`. Any new value creates a new section page. `tags` are many and free-form, each one gets
`/tags/<tag>/`.

Publishing is `draft: false` and a push. A `pubDate` in the future means scheduled, and the post appears on its own.

### Markdown conventions

Posts are plain markdown despite the `.mdx` extension, so Obsidian renders them natively and the build upgrades them.
The rule for all of these is that the thing has to be alone in its paragraph; with prose around it, it stays inline
text.

| You write | The site renders |
|---|---|
| `![alt](./img.png "caption")` | `<figure>` with a caption, and a real srcset |
| `![](https://youtube.com/watch?v=X)` | a YouTube player |
| `![](https://vimeo.com/123)` | a Vimeo player |
| a bare URL on its own line | a bookmark card when we have metadata for it, otherwise a link |
| `> quote` followed by `> — ![via Twitter](status-url)` | a quoted tweet |
| `> [!NOTE]` | a callout (NOTE, TIP, WARNING, CAUTION, IMPORTANT) |
| a ` ```mermaid ` fence | a diagram |
| `$inline$` and `$$block$$` | KaTeX |

Components cover what markdown has no spelling for: `<Video>`, `<RawEmbed>`, `<MissingImage>`, `<Sidenote>`,
`<MarginNote>`, `<Epigraph>`, `<Bookmark>`, `<Tweet>`, `<Figure>`. They are injected into every post, so a post never
needs an import line.

### Series

Three fields, set on each part:

```yaml
series: grpc                          # short slug, also the URL at /series/grpc/
seriesName: "O Guia Completo do gRPC" # display title, on the first part only
seriesOrder: 2
```

That is what turns on the series page and the prev/next navigation at the bottom of every part. Existing series:
`container-images`, `cryptography-beginners`, `grpc`, `typescript-week`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | local server |
| `npm run build` | build plus the Pagefind index |
| `npm run preview` | serve `dist/` |
| `node scripts/check-output.ts` | post-build checks, the same ones CI runs |
| `node scripts/build-redirects.ts` | regenerate `src/data/redirects.ts` after content moves |
| `node scripts/build-icons.ts` | regenerate the PWA icons from `public/favicon.svg` |
| `node scripts/translate.ts` | translate changed posts into `content/translated/`, needs `ANTHROPIC_API_KEY` |

## Layout

| Path | What it is |
|---|---|
| `content/blog/` | the posts, in the language they were written in |
| `content/translated/` | machine translations, written by CI, edit one only if you mean to own it |
| `content/bookmarks.json`, `content/dead-images.json` | metadata captured at migration time so the build stays offline |
| `src/pages/` | routes: `/<slug>/`, `/<category>/`, `/tags/`, `/series/`, `/en/` |
| `src/components/` | the component set posts can use |
| `src/plugins/` | the remark plugins that turn markdown into figures and embeds |
| `worker/` | Cloudflare Worker that rebuilds the site the minute a scheduled post is due |
| `.migration/` | migration reports and review lists (untracked) |

## Two things that are load-bearing

**Slugs never change.** Post URLs are flat, `/<slug>/`, exactly as Ghost served them, and every one of them has to keep
working. Route paths are English; slugs and titles are whatever was written.

**The build fetches nothing.** Bookmark cards, tweets and embeds all render from captured data. Anything that needs the
network happens in a script you run on purpose.
