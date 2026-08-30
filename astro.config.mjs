// @ts-check
import { createHash } from 'node:crypto'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import expressiveCode from 'astro-expressive-code'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { pluginTokenStyles } from './src/plugins/expressive-code-token-styles.mjs'
import mermaid from 'astro-mermaid'
import rehypeCallouts from 'rehype-callouts'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { redirectStubs } from './src/integrations/redirect-stubs.mjs'
import { lastModified, noindexPaths } from './src/lib/post-dates.mjs'
import { remarkEmbeds } from './src/plugins/remark-embeds.mjs'
import { remarkEmphasis } from './src/plugins/remark-emphasis.mjs'
import { remarkFigures } from './src/plugins/remark-figures.mjs'
import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import { rehypeFootnoteSidenotes } from './src/plugins/rehype-footnote-sidenotes.mjs'
import { rehypeHeadingAnchors } from './src/plugins/rehype-heading-anchors.mjs'
import { rehypeMathCopy } from './src/plugins/rehype-math-copy.mjs'
import { remarkLabDemos } from './src/plugins/remark-lab-demos.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'
import { remarkWikilinks } from './src/plugins/remark-wikilinks.mjs'
import { mdxTransformCache } from './src/plugins/mdx-transform-cache.mjs'

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.lsantos.dev',
  trailingSlash: 'always',
  // Outside node_modules, which `npm ci` deletes wholesale along with anything in it.
  cacheDir: './.astro-cache',
  integrations: [
    // Mermaid and KaTeX stay even with no diagram post: removing them breaks the
    // formulas in the RSA post and renders the first future diagram as a code block.
    mermaid({ theme: 'default', autoTheme: true }),
    // For interactive demos inside a post. A post that places no island ships no Vue.
    vue(),
    // Before mdx: it replaces the default Shiki setup.
    expressiveCode({
      // pluginTokenStyles moves the per-theme token colours into the stylesheet.
      // Without it a code-heavy post reaches megabytes.
      plugins: [pluginLineNumbers(), pluginTokenStyles()],
      // Two pairs: Normal and High Contrast. Entry 0 is the base emitted at `:root`,
      // and the dark-mode media query overrides it with the first entry of the
      // opposite type, so these two have to stay first and in this order.
      themes: ['ayu-light', 'ayu-dark', 'github-light-high-contrast', 'github-dark-high-contrast'],
      // A <link> beside the first code block arrives after first paint and re-lays
      // out every post with code. Measured CLS 0.10 on phones.
      emitExternalStylesheet: false,
      // Automatic only for exactly one light and one dark theme, so it stays explicit.
      // The query asks the OS; `code-theme.ts` overrides it when a reader has picked
      // a site theme by hand.
      useDarkModeMediaQuery: true,
      // `data-theme` is the site's own attribute. Set by CodeTheme.astro; unset, the
      // media query above decides.
      themeCssSelector: (theme) => `[data-code-theme='${theme.name}']`,
      styleOverrides: { borderRadius: '4px', codeFontSize: '0.85rem' },
      // Fence labels used across old posts that Shiki has no grammar for. Add the
      // next one here rather than editing the posts.
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
    // Search and the offline fallback carry no content, and a `noindex` post would
    // be advertised here while its own meta tag tells crawlers away. `lastmod` is
    // not emitted by default, which leaves a 2019 post looking as fresh as today's.
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
    // Last, so it can inspect the finished output and only write a stub where no
    // real page claimed the path.
    redirectStubs(),
  ],
  markdown: {
    // `markdown.remarkPlugins`/`rehypePlugins` are deprecated in favour of this.
    // Not `satteri()`, whose `mdastPlugins`/`hastPlugins` are a different API.
    processor: unified({
      // These plugins are what let a post stay plain markdown Obsidian can render:
      // no imports, no tags in content/.
      //
      // remarkEmbeds before remarkFigures, since an image and a bare link are both
      // "the only thing in a paragraph" and a wrapped figure hides that.
      // remarkWikilinks after both, so a lone wikilink is not read as an embed.
      remarkPlugins: [
        remarkReadingTime,
        // Inline `$x$` has to stay on: the RSA post carries dozens of real
        // single-dollar expressions, and with braces in them the option off sends
        // `{` to MDX's expression parser and fails the build. The cost is a writing
        // rule instead: a literal dollar in prose is `\$`.
        remarkMath,
        remarkEmbeds,
        remarkFigures,
        // See src/styles/variants/emphasis.css. After remarkFigures, so a lone image
        // is already a figure and cannot be read as a lone run.
        remarkEmphasis,
        remarkWikilinks,
        // Last: the only one that reads files off disk and injects nodes, so it runs
        // on a settled tree.
        remarkLabDemos,
      ],
      rehypePlugins: [
        // The posts use Obsidian's callout vocabulary; the plugin's github default
        // knows a handful of types and renders the rest as a blockquote with a stray
        // title.
        // `important` is red here, so its stock flame icon reads as a fire hazard.
        // Lucide's octagon-alert is the stop-sign shape instead.
        [
          rehypeCallouts,
          {
            theme: 'obsidian',
            callouts: {
              important: {
                indicator:
                  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
              },
            },
          },
        ],
        rehypeKatex,
        rehypeMathCopy,
        // Astro adds heading ids only after this list runs, and rehypeHeadingAnchors
        // refuses to invent one. Running it here puts the ids in place first.
        rehypeHeadingIds,
        rehypeHeadingAnchors,
        rehypeFootnoteSidenotes,
      ],
    }),
  },
  image: {
    responsiveStyles: true,
    // `constrained` fits the one fixed reading column remark-figures wraps into.
    layout: 'constrained',
  },
  vite: {
    // Monkeypatches the "@mdx-js/rolldown" plugin's own transform in place, so
    // it must sit in this array with that plugin already resolvable; see the
    // comment at the top of mdx-transform-cache.mjs. MDX_CACHE=0 disables it.
    plugins: [mdxTransformCache()],
    build: {
      // A font under Vite's 4 KB threshold becomes a `data:` URI, which the site's
      // `font-src 'self'` blocks. Nothing errors; the glyphs are just wrong.
      // Undefined for everything else keeps Vite's threshold in charge.
      assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
    },
    css: {
      modules: {
        // Component__class__hash, so a post component's class cannot collide with a
        // global one even when the dev server injects the sheet unscoped. The hash
        // is of the file path, so a shared basename in two folders still differs and
        // the same input always builds the same name.
        generateScopedName(name, filename) {
          const path = filename.replace(/\?.*$/, '')
          const component = path.split('/').pop()?.replace(/\.(vue|module\.css)$/, '') ?? 'style'
          const hash = createHash('sha256').update(path.replace(process.cwd(), '')).digest('base64url').slice(0, 4)
          return `${component}__${name}__${hash}`
        },
      },
    },
  },
})
