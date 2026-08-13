# blog.lsantos.dev

Astro 7, static output, MDX files that contain plain markdown. Replaces the Ghost install that ran on a VM for six
years, with every URL Ghost ever published still resolving.

This file is the operating manual, and it is deliberately short. The rest lives where it belongs:

| Document | What is in it |
|---|---|
| `content/WRITING.md` | everything a post can use, from an author's seat. The reference while writing |
| `docs/architecture.md` | how the pieces fit and why, with diagrams. Read before changing any of them |
| `docs/ci.md` | the workflows, the scheduler, the credentials |
| `docs/design.md` | the visual direction, font and icon shortlists, open questions |
| `docs/decisions.md` | what was decided, what was rejected, and the reasoning |
| `AGENTS.md` | the rules an agent has to know before touching this repo |

## Running it

```sh
npm install     # npm 11 blocks install scripts; package.json allowlists the one Astro needs
npm run dev     # http://localhost:4321
npm run build   # astro build, then pagefind indexes dist/
```

Node 22.12 or newer. `npm run build` runs `prebuild` first, which downloads any remote image a post still references
into the post's folder and rewrites the reference. That is the only network call in the build, it never fails the
build, and it is a no-op once the files are committed. Everything else renders from data already in the repo.

## Writing a post

One post is one folder. The folder name is the slug and the URL:

```
content/blog/deno-3/
  index.mdx
  screenshot.png
```

Images live next to the post and are written as `./screenshot.png`. `index.mdx` is the post; any other markdown file
in that folder is a translation of it, identified by its own `lang`, so `deno-3/lets-talk-about-deno-3.mdx` is the
English version and shares those same images. See "Another language" in `content/WRITING.md`.

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
`epigraph` / `epigraphCite`, `noindex`, `seoTitle`, `seoDescription`, `visibility`, `slug`, `machineTranslated`. The full schema,
with comments, is `src/content.config.ts`.

`category` is the section and becomes `/<category>/`. In use today: `javascript`, `infra`, `typescript`, `opinion`,
`career`, `meta`, `security`. Any new value creates a new section page. `tags` are many and free-form, each one gets
`/tags/<tag>/`.

Publishing is `draft: false` and a push. A `pubDate` in the future means scheduled, and the post appears on its own.

### Markdown conventions

Posts are plain markdown despite the `.mdx` extension, so Obsidian renders them natively and the build upgrades them.
An image, an embed URL or a tweet quote has to be alone in its paragraph; with prose around it, it stays inline text.

**The full table of what you can write, and what each thing renders as, is in `content/WRITING.md`.** It sits inside
the vault, next to the posts, which is where it gets read. Keeping a second copy here only produced two versions that
disagreed.

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
| `node scripts/translate.ts` | translate changed posts in place, needs `ANTHROPIC_API_KEY`. CI uses the workflow instead |
| `node scripts/clean-translations.ts` | strip agent artefacts from translated files |

## Layout

| Path | What it is |
|---|---|
| `content/blog/` | the posts, in the language they were written in |
| `content/blog/<folder>/<slug>.mdx` | a translation of that post, identified by its `lang` |
| `content/bookmarks.json`, `content/dead-images.json` | metadata captured at migration time so the build stays offline |
| `src/pages/` | routes: `/<slug>/`, `/<category>/`, `/tags/`, `/series/`, `/en/` |
| `src/components/` | the component set posts can use |
| `src/plugins/` | the remark plugins that turn markdown into figures and embeds |
| `worker/` | Cloudflare Worker that rebuilds the site the minute a scheduled post is due |
| `.migration/` | migration reports and review lists (untracked) |

## Two things that are load-bearing

**Slugs never change.** Post URLs are flat, `/<slug>/`, exactly as Ghost served them, and every one of them has to keep
working. Route paths are English; slugs and titles are whatever was written.

**The build fetches only its own media.** Bookmark cards, tweets and embeds render from data in the repo. The one
exception is the vendoring step, which pulls a remote image into the repo so it stops being remote. A post that has
been built once depends on nobody else's server.
