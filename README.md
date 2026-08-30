# blog.lsantos.dev

A whimsical rewrite of my Ghost blog which I have been maintaining since 2017.
Now it's a static page with Astro and some cool aesthetics.

> This blog will probably only work for me, the docs are mostly because I tend
> to forget a lot of stuff over time, so if you want to replicate, be my guest
> but most of the things here will have to be changed.

## Running

```sh
npm install
npm run dev     # http://localhost:4321
npm run build   # astro build, then pagefind indexes dist/
```

Node 26 or newer.

## Writing

Most of the writing actually happens in Obsidian. So nothing is really happening
here other than the build. The directory title is the slug, the index is the post.

```
content/blog/deno-3/
  index.mdx
  screenshot.png
```

Images live next to the post and are written as `./screenshot.png`. `index.mdx` is the post; any other markdown file
beside it is a translation of it, identified by its own `lang`, and shares those same images.

**The build fetches only its own media.** Bookmark cards, tweets and embeds render from data in the repo. `prebuild`
downloads any remote image a post still references into the post's own directory and rewrites the reference.

### Frontmatter

The first four are required. The schema is `src/content.config.ts`.

| Field | What it does |
|---|---|
| `title` | the post title |
| `pubDate` | the publication date. A future one schedules the post |
| `category` | the section, exactly one. Becomes `/<category>/`, and a new value creates a new section |
| `description` | one sentence, used as the meta description and the hover-preview excerpt |
| `draft` | keeps the post out of the build. Defaults to `true` |
| `lang` | the language it was written in. Defaults to `pt` |
| `tags` | many and free-form, written in English. Each one gets `/tags/<tag>/`, and `src/i18n/tags.ts` holds the Portuguese label |
| `updatedDate` | shown beside the publication date |
| `heroImage`, `heroImageAlt` | the cover image and its alt text |
| `series`, `seriesName`, `seriesOrder` | the series slug, its display title, and this part's position |
| `authors` | git's own format, `Name <https://site>`, the site part optional. |
| `slug` | overrides the directory name in the URL |
| `noindex` | keeps it out of every listing, both feeds, `llms.txt` and the search index. The page still builds, so the URL answers for anyone holding the link |
| `machineTranslated` | shows the banner pointing at the source post |
| `seoTitle`, `seoDescription` | override the title and description in the meta tags alone |


## Scripts

| Command | What it does |
|---|---|
| `npm run check` | `astro check`, `tsc -p worker`, and the i18n, component-css, content and credits guards. |
| `npm run preview` | serve `dist/` |
| `node scripts/check-output.ts` | post-build checks, the same as the CI |
| `npm run test:e2e` | Playwright tests on the built `dist/`. Build first |
| `node scripts/build-redirects.ts` | regenerate `src/data/redirects.ts` after content moves to some other URL |
| `node scripts/build-icons.ts` | regenerate the PWA icons from `public/favicon.svg` |
| `node scripts/build-og.ts` | regenerate the social cards in `public/og/`, both languages. Renders in Chromium, so the card carries real text |
| `node scripts/translate.ts` | translate changed posts in place, through the `claude` CLI and its logged-in session. `TRANSLATE_PROVIDER` switches to an API key or a local model |
| `node scripts/clean-translations.ts` | strip agent artifacts from translated files |


## Layout

| Path | What it is |
|---|---|
| `content/blog/` | the posts, in the language they were written in |
| `content/blog/<post>/<slug>.mdx` | a translation of that post, identified by its `lang` |
| `content/bookmarks.json`, `content/dead-images.json` | metadata captured at migration time so the build step doesn't need to be online |
| `content/categories.json` | what each section is about, per language. Shown on the section page |
| `src/pages/` | routes: `/<slug>/`, `/<category>/`, `/tags/`, `/series/`, and the same set again under `/en/` |
| `src/components/` | the component set posts can use |
| `src/plugins/` | the remark and rehype plugins that turn markdown into figures, embeds and margin notes |
| `src/i18n/` | the UI strings per language, and the Portuguese labels for the English tag vocabulary |
| `public/og/` | the social cards, Portuguese at the root and English under `og/en/` |
| `tests/e2e/` | the browser suite |
| `worker/` | Cloudflare Worker that rebuilds the site when a scheduled post is due |


## Licence

The **code** is MIT (`LICENSE`): the Astro site, the components, the plugins, the build scripts, the Worker, so you can use it freely.

The **writing** is CC BY-NC-SA 4.0 (`LICENSE-CONTENT`): everything under `content/`, the articles in both languages and
their images. Quote it, credit it, link back. Do not republish it.
