# blog.lsantos.dev

Astro 7, static output, MDX. Replaces the Ghost install that ran on a VM for six years.

## Writing

Posts live in `content/blog/`, one `.mdx` file per post, with that post's images in a folder of the same name next to
it. That folder is the whole content directory: point Obsidian at it and you see your posts and nothing else.

Publishing is `draft: false` and a push. A `pubDate` in the future means scheduled, and the post appears on its own.

```yaml
---
title: "Título do post"
pubDate: 2026-08-11
lang: pt              # the language you WROTE it in; the other one is generated
category: typescript  # the section, exactly one
tags: ["deno", "cli"]
description: "One sentence. Also the meta description and the hover-preview excerpt."
draft: false
---
```

Components available in any post without importing them: `<Figure>`, `<Video>`, `<Sidenote>`, `<MarginNote>`,
`<Epigraph>`, `<Bookmark>`, `<CourseCTA>`, `<RawEmbed>`, `<YouTube>`, `<Vimeo>`. Callouts are plain markdown
(`> [!NOTE]`), so Obsidian renders them too. Math is `$inline$` and `$$block$$`. Mermaid is a ```mermaid fence.

## Running it

```sh
npm install          # npm 11 blocks install scripts; the allowlist in package.json covers esbuild
npm run dev
npm run build        # astro build + pagefind index
node scripts/check-output.ts   # fails on anything broken in dist/
```

## Layout

| Path | What it is |
|---|---|
| `content/blog/` | The posts, in the language they were written in |
| `content/translated/` | Machine translations, written by CI, never edited by hand unless you mean it |
| `src/pages/` | Routes: flat `/{slug}/` posts, `/{category}/` sections, `/tags/`, `/series/`, `/en/` |
| `src/components/` | The component set posts can use |
| `scripts/migrate/` | Ghost export to MDX. Idempotent, safe to re-run |
| `scripts/translate.ts` | Translates changed posts, needs `ANTHROPIC_API_KEY` |
| `worker/` | Cloudflare Worker that rebuilds the site the minute a scheduled post is due |
| `.migration/` | Migration reports and review lists (gitignored) |

## Two things that are load-bearing

**Slugs are preserved exactly.** Every URL Ghost ever published still resolves. Only the taxonomy paths moved, and
`.migration/redirects.csv` covers those.

**The build never touches the network.** Bookmarks, tweets and embeds all render from data captured at migration time,
so a build produces the same output whether or not some third-party site is up.
