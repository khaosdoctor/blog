# SEO

Everything below is generated from `content/blog/` frontmatter and Astro's own build output. There is no per-post SEO
checklist: writing the post is the SEO work. This doc exists so a future change to the pipeline doesn't accidentally
turn an automatic artifact into a manual one.

## What's automatic, and where

| Artifact | Automatic? | Where |
|---|---|---|
| Title / description | Yes | `post.data.seoTitle`/`seoDescription`, falling back to `title`/`description`, passed to `BaseLayout` from `src/pages/[...slug].astro` |
| Canonical | Yes | `src/layouts/BaseLayout.astro` builds it from `Astro.url.pathname` + `Astro.site`; three Medium-first posts deliberately get none, see the comment in `src/components/SEO.astro` |
| Hreflang alternates | Yes | `src/pages/[...slug].astro` groups every file in a post's folder by `lang`, so a translation gets picked up with no field to keep in sync |
| Robots meta (`noindex`) | Yes, for posts | `noindex: true` in frontmatter flows through `BaseLayout` to `SEO.astro`'s `<meta name="robots">`; **not** wired for `/search/` and `/en/search/`, see below |
| Section page description | Yes | `content/categories.json` via `categoryDescription()` in `src/lib/categories.ts`, per language, on both `/<category>/` and `/en/<category>/`. A section with no entry gets a generated line |
| OpenGraph | Yes | `src/components/SEO.astro`; falls back to a per-section card (`sectionOgImage` in `src/lib/seo.ts`) when a post has no hero image |
| Twitter card | Yes | Same component, `summary_large_image` always |
| JSON-LD (Article/WebSite) | Yes | `buildPrimaryJsonLd` in `src/lib/seo.ts`, driven entirely by the props already passed to `SEO.astro` |
| JSON-LD BreadcrumbList | Yes | `buildBreadcrumbJsonLd` in `SEO.astro`, built from `section` prop + canonical |
| JSON-LD Person | Yes | `buildPersonJsonLd` in `src/lib/seo.ts`, static author profile, same on every page |
| Sitemap | Yes | `astro.config.mjs` sitemap integration, filters out `/search/`, `/offline/`, and anything in `noindexPaths` |
| Sitemap `lastmod` | Yes | `astro.config.mjs` `serialize`, reads `lastModified` from `src/lib/post-dates.mjs` (frontmatter `updatedDate` or `pubDate`) |
| `robots.txt` | Yes | `src/pages/robots.txt.ts`, now derives `Disallow` from `noindexPaths` + a short chrome list instead of a hand-maintained one (this change) |
| RSS | Yes | `src/pages/rss.xml.ts` and `src/pages/en/rss.xml.ts`, built from `getPublishedPosts()` |
| 404 | Yes | `src/pages/404.astro`; the page itself carries no `noindex`, but a static host serves it with an actual HTTP 404 status, which is what stops indexing regardless of the meta tag |
| `llms.txt` | Yes | `src/pages/llms.txt.ts`, one entry per published post pointing at its markdown twin |

## Fixed as part of this pass

`src/pages/robots.txt.ts` used to hardcode its `Disallow` list. A post marked `noindex: true` was already excluded
from the sitemap (`src/lib/post-dates.mjs` collects it into `noindexPaths`) but stayed crawlable, so `robots.txt` and
the sitemap disagreed. The route now builds `Disallow` from `noindexPaths` plus a fixed three-line list of chrome
paths (`/search/`, `/en/search/`, `/offline/`) that will never carry `noindex` frontmatter because they aren't posts.
A new noindex post needs no edit here.

## Left for the owner to decide

**`/search/` and `/en/search/` are disallowed in `robots.txt` but render `<meta name="robots" content="index,follow">`.**
Nothing sets `noindex` on those two pages (`src/pages/search.astro`, `src/pages/en/search.astro`), so the two signals
contradict each other: a crawler that respects `robots.txt` never sees the meta tag, and if the URL is ever linked
from elsewhere, Google can index the bare URL with no snippet ("no information is available for this page") instead
of just skipping it. The cleaner fix is usually the opposite of what's here now: allow crawling and let `noindex, follow`
actually deindex the page, rather than block crawling and hope nothing links to it. That's a call for whoever owns
`search.astro`, not something this pass changes, since it touches a file outside this task's scope and a `noindex`
prop is already there for exactly this on every other page (`BaseLayout` → `SEO.astro`).

## CI audit

A non-blocking `seo-audit` job runs after `build` on every push, PR, and scheduled publish. See `docs/ci.md` for the
job and why it can never fail the workflow. Config lives in `lighthouserc.json` at the repo root.
