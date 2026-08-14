// @ts-check
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import expressiveCode from 'astro-expressive-code'
import mermaid from 'astro-mermaid'
import rehypeCallouts from 'rehype-callouts'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { redirectStubs } from './src/integrations/redirect-stubs.mjs'
import { lastModified, noindexPaths } from './src/lib/post-dates.mjs'
import { remarkEmbeds } from './src/plugins/remark-embeds.mjs'
import { remarkFigures } from './src/plugins/remark-figures.mjs'
import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import { rehypeFootnoteSidenotes } from './src/plugins/rehype-footnote-sidenotes.mjs'
import { rehypeHeadingAnchors } from './src/plugins/rehype-heading-anchors.mjs'
import { rehypeMathCopy } from './src/plugins/rehype-math-copy.mjs'
import { remarkLabDemos } from './src/plugins/remark-lab-demos.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'
import { remarkWikilinks } from './src/plugins/remark-wikilinks.mjs'

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.lsantos.dev',
  trailingSlash: 'always',
  integrations: [
    // Mermaid and LaTeX are day-one requirements even though no post uses a
    // diagram yet: a review pass removed both as dead weight, which silently
    // broke the one post with 9 formulas and would have made the first future
    // diagram render as a plain code block. Mermaid's own script only loads on
    // pages that actually contain a diagram.
    mermaid({ theme: 'default', autoTheme: true }),
    // Vue is here for interactive demos inside a post, which is the only thing
    // on this site that needs a framework. A post that uses none ships no Vue:
    // an island only loads where it is actually placed.
    vue(),
    // expressiveCode must precede mdx: it replaces the default Shiki setup.
    expressiveCode({
      // github-light/github-dark keep the current look; the rest are the
      // picker's other options (see CodeTheme.astro), grouped by family:
      // Monokai (dark only, no light variant ships in the Shiki bundle),
      // Dracula (same, dark only), all four Catppuccin variants, all three
      // Kanagawa variants (two dark, one light), Ayu light/dark, and Snazzy
      // (the bundle only ships a light Snazzy, despite the name).
      themes: [
        'github-light',
        'github-dark',
        'monokai',
        'dracula',
        'catppuccin-latte',
        'catppuccin-frappe',
        'catppuccin-macchiato',
        'catppuccin-mocha',
        'kanagawa-wave',
        'kanagawa-dragon',
        'kanagawa-lotus',
        'ayu-light',
        'ayu-dark',
        'snazzy-light',
      ],
      // This default only turns on automatically for exactly one light and
      // one dark theme, so with fourteen it needs to stay explicit. A reader
      // who has not picked anything yet still needs the same light/dark
      // split as before, which only depends on the first two entries above:
      // github-light listed first and github-dark second keeps the generated
      // media query exactly the old light-follows-system, dark-follows-system
      // pair, regardless of how many themes follow.
      useDarkModeMediaQuery: true,
      // The default selector is `[data-theme='name']`; this site has no other
      // use of `data-theme`, but `data-code-theme` says what it is for and
      // keeps the attribute unambiguous if a site-wide theme switch is ever
      // added later. Set on <html> by CodeTheme.astro; unset, the media query
      // above decides, so a reader who never opens the picker sees no change.
      themeCssSelector: (theme) => `[data-code-theme='${theme.name}']`,
      styleOverrides: { borderRadius: '4px', codeFontSize: '0.85rem' },
      // Fence labels written years ago that Shiki has no grammar for, so those
      // blocks silently lost their highlighting. Aliases rather than edits across
      // eight posts, and a place to add the next one.
      shiki: {
        langAlias: {
          Dockerfile: 'dockerfile',
          output: 'plaintext',
          Bash: 'bash',
          JSON: 'json',
          YAML: 'yaml',
          ssh: 'bash',
          fortran: 'fortran-free-form',
          tys: 'ts',
        },
      },
    }),
    mdx(),
    // The search page and the offline fallback are chrome, not content. A post
    // with `noindex: true` is dropped too, otherwise the sitemap would advertise
    // a page whose own meta tag tells crawlers to stay away.
    //
    // lastmod is not emitted by default, so every URL looked equally fresh and a
    // 2019 post competed for crawl budget with one published today. serialize
    // fills it in from the post dates collected during the build.
    sitemap({
      filter: (page) =>
        !page.includes('/search/') &&
        !page.includes('/offline/') &&
        !noindexPaths.has(new URL(page).pathname),
      serialize: (item) => {
        const modified = lastModified.get(new URL(item.url).pathname)
        return modified === undefined ? item : { ...item, lastmod: modified }
      },
    }),
    // Runs after everything else: it inspects the finished output and only
    // writes a stub where no real page claimed the path.
    redirectStubs(),
  ],
  markdown: {
    // Posts are plain markdown even though the files are .mdx: these two plugins
    // are what turn that markdown into components, so nothing in content/ needs
    // an import or a tag and Obsidian renders every post natively.
    //
    // remarkEmbeds must run before remarkFigures: an image and a bare link are
    // both "the only thing in a paragraph", and once a figure is wrapped the
    // link check would have to look one level deeper for no benefit.
    //
    // remarkWikilinks runs last: it turns [[slug]] into an ordinary link, and
    // running after the embed check keeps a wikilink alone in a paragraph from
    // being mistaken for something to embed.
    remarkPlugins: [
      remarkReadingTime,
      remarkMath,
      remarkEmbeds,
      remarkFigures,
      remarkWikilinks,
      // Last: the only one that reads files off disk and injects synthesized
      // content (an import node, and the demo's source as a code block), so it
      // runs once everything else has settled the tree.
      remarkLabDemos,
    ],
    rehypePlugins: [
      // Obsidian's theme, not the plugin's github default: the vocabulary the
      // posts are written in is Obsidian's (quote, question, example and the
      // rest), and the github theme only knows five types, so anything else
      // rendered as a plain blockquote with a stray title line.
      [rehypeCallouts, { theme: 'obsidian' }],
      rehypeKatex,
      rehypeMathCopy,
      // Astro adds the heading ids itself, but only after this list runs, and the
      // anchor plugin refuses to invent an id that would be the only one of its
      // kind on the site. Running it explicitly here puts the ids in place first;
      // Astro's own pass then finds every heading already has one.
      rehypeHeadingIds,
      rehypeHeadingAnchors,
      rehypeFootnoteSidenotes,
    ],
  },
  image: {
    // The migration colocates images next to posts; they are all local files.
    responsiveStyles: true,
    // Real srcset/sizes for every <Image>. `constrained` fits this site's one
    // fixed reading column (Figure.astro clamps the request width to it).
    layout: 'constrained',
  },
})
