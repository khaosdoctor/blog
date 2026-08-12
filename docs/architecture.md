# How this blog works

## Content

One post is one folder: `content/blog/<slug>/index.mdx` plus its images. The slug is the folder name and the URL. Image paths are `./image.png`.

The files are `.mdx` but the content is plain markdown. That combination is deliberate: Obsidian opens `content/blog` as a vault and renders every post natively, while the extension keeps components available for the rare post that needs one. The collection only matches `index.*`, so a stray note does not become a post or break the build.

Frontmatter is validated by `src/content.config.ts`. `draft` defaults to `true`, so forgetting the field cannot publish anything. A `pubDate` in the future means scheduled.

### Writing

| You write | Obsidian shows | The site renders |
|---|---|---|
| `![alt](./img.png "caption")` | the image | `<figure>` + `<figcaption>`, with srcset |
| `![](https://youtube.com/watch?v=X)` | the player | a YouTube embed |
| `![](https://vimeo.com/123)` | the player | a Vimeo embed |
| `> quote`<br>`> — ![via Twitter](status-url)` | the live tweet | `<Tweet>`, upgraded by widgets.js |
| a bare URL on its own line | a link | a bookmark card, or a link |
| `> [!NOTE]` | a callout | a callout |

`src/plugins/remark-figures.mjs` and `src/plugins/remark-embeds.mjs` do the conversion. Both accept the bare-link spelling as well, so pasting a URL and forgetting the `![]()` degrades to a plain link rather than breaking.

Components that stay components: `Video`, `RawEmbed`, `MissingImage`. Six uses between them, and none has a markdown spelling worth inventing.

### Why the build never fetches anything

Bookmark cards and tweets render from metadata captured out of Ghost, in `content/bookmarks.json`. `astro-embed`'s LinkPreview refetches every bookmarked URL at build time and dies on sites without OG tags; Twitter's oEmbed needs a live call. A build that depends on somebody else's uptime is a build that fails for reasons you cannot fix. Anything needing the network happens in an explicit script instead.

`content/dead-images.json` lists remote images whose host stopped serving them. They stay in the markdown so the caption and the surrounding sentence survive, and render as a placeholder.

## Routes

Post URLs are flat, `/<slug>/`, exactly as Ghost served them. Sections are `/<category>/`, tags `/tags/<tag>/`, series `/series/<name>/`. English mirrors under `/en/`.

Route paths are English. Post slugs and titles are not: they are whatever was written, mostly Portuguese, and must never change. Every existing URL has to keep working.

The section route fails the build if a category name ever collides with a post slug.

### Redirects

Static hosting cannot issue a 301, so `src/integrations/redirect-stubs.mjs` writes a meta-refresh page with a canonical for every entry in `src/data/redirects.ts`. Google treats that as a redirect. Regenerate the list with `node scripts/build-redirects.ts`.

It is an integration rather than a route because these paths would fight `[...slug].astro`, and because a redirect should not be in the sitemap. The build fails if a redirect points at a page that does not exist.

Newsletter issue URLs currently point at `/`, not `/newsletter/`: that section has no published posts, so the page does not exist. Change `NEWSLETTER_TARGET` in `scripts/build-redirects.ts` once any roundup is published.

## Versioning

The footer shows `1.2.3-14`: the semver from the last release tag, plus the number of posts published since. Both halves are derived, the semver from `package.json` and the count from git history, so there is no counter to maintain. `src/lib/version.ts` does this, and it needs full history, which is why CI checks out with `fetch-depth: 0`.

Clicking it opens the repository at the commit the site was built from.

Releases are manual. Run the Release workflow when you want one, merge the PR it opens, and the tag follows. Publishing a post never triggers it. Commit types: `feat` minor, `fix` patch, `!` or `BREAKING CHANGE` major, `content:` for writing.

## Offline

`public/sw.js` is hand-written; `@vite-pwa/astro` caps its peer range at Astro 5. HTML is network-first so a reader online always gets the current version of a post, hashed assets are cache-first, everything else passes through.

Cache names are keyed on the commit, passed in via `/sw.js?v=<sha>`. A new deploy changes the script URL, which is what makes the browser install a new worker, and renames the caches so the previous deploy's entries are dropped.

## For agents

Every post is also served as markdown at `/<slug>/index.md`, advertised in the HTML with `<link rel="alternate" type="text/markdown">`. `/llms.txt` indexes all of them by section. Static hosting cannot negotiate on an `Accept` header, so a predictable URL is the alternative.

## Search

Pagefind, indexed in `postbuild`, rendered with our own markup, with a working no-JS form fallback.

## Checks

`node scripts/check-output.ts` runs in CI and fails on: a published post with no page, leftover Ghost markup, an unrendered component tag, a missing feed or manifest icon, an image that never reached the output, and any remote-script loader pattern. That last one exists because the Ghost site was serving an injected script for a month before anyone noticed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | local server |
| `npm run build` | build + pagefind index |
| `node scripts/check-output.ts` | post-build checks |
| `node scripts/build-redirects.ts` | regenerate the redirect list |
| `node scripts/build-icons.ts` | regenerate PWA icons from `public/favicon.svg` |

## Not wired yet

Deploy is commented out in `build.yml` and Pages is off. Translation needs `CLAUDE_CODE_OAUTH_TOKEN`. The scheduler Worker in `worker/` needs a Cloudflare account and a GitHub PAT. Analytics needs `PUBLIC_CF_ANALYTICS_TOKEN`.
