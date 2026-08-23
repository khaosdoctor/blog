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
      // Line numbers on every block, including the source a lab demo reveals:
      // that source is emitted as an ordinary code node, so it goes through this
      // same pass. A block that reads better without them can turn them off with
      // `showLineNumbers=false` on the fence.
      // Without pluginTokenStyles a code-heavy post reaches megabytes: it moves the
      // fourteen colours written on every syntax token into the stylesheet.
      plugins: [pluginLineNumbers(), pluginTokenStyles()],
      // ayu-light/ayu-dark are the default pair (the owner's own words:
      // "default code theme is ayu dark if the theme is dark, ayu light if
      // the theme is light"), so they lead the list; the rest are the
      // picker's other options, still grouped by family: GitHub light/dark,
      // Monokai (dark only, no light variant ships in the Shiki bundle),
      // Dracula (same, dark only), all four Catppuccin variants, all three
      // Kanagawa variants (two dark, one light), and Snazzy (the bundle only
      // ships a light Snazzy, despite the name).
      //
      // This array's order decides the default and nothing else. The order
      // the picker itself lists its options in is CodeTheme.astro's own
      // static <optgroup>/<option> markup, and code-theme.ts's THEMES array
      // is only ever asked `includes()`, so moving Ayu to the front here
      // does not reshuffle the menu a reader sees.
      themes: [
        'ayu-light',
        'ayu-dark',
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
        'snazzy-light',
      ],
      // Inline <style> instead of a <link> dropped beside the first code
      // block: that link arrived after first paint and re-laid out every post
      // that has code (measured CLS 0.10 on phones). Inline applies at parse.
      emitExternalStylesheet: false,
      // This default only turns on automatically for exactly one light and
      // one dark theme, so with fourteen it needs to stay explicit.
      //
      // What it actually generates (read out of @expressive-code/core's own
      // getThemeStyles, not assumed): themes[0] becomes the base, emitted at
      // `:root` with no theme selector at all, and the media query then
      // overrides it with the *first entry of the opposite type*, wrapped in
      // `:root:not([data-code-theme='<themes[0]>'])`. So it is not "the first
      // two entries" in general, it is entry 0 plus the first one whose type
      // differs. ayu-light first and ayu-dark second satisfies both readings
      // at once and leaves no room for a later insertion to quietly change
      // the pair.
      //
      // That media query asks the OS, which is only half the answer here: the
      // site writes its own explicit `data-theme` on <html> when a reader
      // picks light or dark in ThemeToggle, and a reader on a dark OS who
      // chose light would otherwise read ayu-dark on a light page. BaseLayout's
      // pre-paint snippet and code-theme.ts resolve that mismatch by naming
      // the matching ayu outright as `data-code-theme` whenever a site-wide
      // choice exists; see the comment on applyTheme in code-theme.ts.
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
    // `markdown.remarkPlugins` and `markdown.rehypePlugins` are deprecated, and
    // Astro's own notice points here: the same arrays, passed to `unified()` from
    // `@astrojs/markdown-remark` and set as the processor. Not `satteri()`, whose
    // `mdastPlugins`/`hastPlugins` are a different API that every plugin below
    // would have to be rewritten against.
    processor: unified({
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
        /*
         * Inline `$x$` stays ON. It looks like a trap (two dollar signs in one
         * paragraph become one expression, so "$4,950 ... and $9,800" rendered
         * as a single KaTeX span with every letter between them stacked
         * vertically) and turning it off was tried. It cannot be: the RSA post
         * alone carries dozens of real single-dollar expressions, several with
         * braces (`$\frac{a}{b}$`), and with the option off those braces reach
         * MDX's own expression parser and fail the build outright.
         *
         * So the rule is on the writing side, in content/WRITING.md: a literal
         * dollar in prose is `\$`. Only currency needs it; a lone `$` with no
         * partner on the same line is already safe.
         */
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
        // `important` is red here (see code-and-callouts.css), and the theme's own
        // icon for it is a flame, which reads as a fire hazard rather than "stop,
        // this one matters". Lucide's octagon-alert is the stop-sign shape, the
        // same silhouette a road sign uses, so the type is legible before the
        // title is read. Every other type keeps its stock indicator.
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
        // Astro adds the heading ids itself, but only after this list runs, and the
        // anchor plugin refuses to invent an id that would be the only one of its
        // kind on the site. Running it explicitly here puts the ids in place first;
        // Astro's own pass then finds every heading already has one.
        rehypeHeadingIds,
        rehypeHeadingAnchors,
        rehypeFootnoteSidenotes,
      ],
    }),
  },
  image: {
    // The migration colocates images next to posts; they are all local files.
    responsiveStyles: true,
    // Real srcset/sizes for every <Image>. `constrained` fits this site's one
    // fixed reading column, which is what remark-figures wraps an image into.
    layout: 'constrained',
  },
  vite: {
    build: {
      /*
       * Never inline a font, whatever its size. Vite inlines any asset under 4 KB
       * as a `data:` URI, and `KaTeX_Size3-Regular.woff2` is 3624 bytes, so it
       * was being embedded in the built CSS. The site's CSP is `font-src 'self'`,
       * which does not cover `data:`, so the browser blocked exactly that one
       * font and display maths fell back for its largest delimiters. Found by
       * reading the console of a built page, because nothing fails: the CSS is
       * valid and the glyphs are simply wrong.
       *
       * Fixing it here rather than by adding `data:` to `font-src` keeps the
       * policy tight. Returning undefined for everything else leaves Vite's own
       * threshold in charge of the assets where inlining is a real win.
       */
      assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
    },
    css: {
      modules: {
        // A post component's <style module> classes get renamed to
        // Component__class__hash, so a class can never collide with a global
        // one even when the dev server injects the sheet without its scope
        // (which is how a lab component once stretched every tag chip on its
        // page). The hash comes from the file path, so two components that
        // share a basename in different folders still get distinct names, and
        // the same input always builds the same output.
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
