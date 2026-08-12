// @ts-check
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import expressiveCode from 'astro-expressive-code'
import mermaid from 'astro-mermaid'
import rehypeCallouts from 'rehype-callouts'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { redirectStubs } from './src/integrations/redirect-stubs.mjs'
import { remarkEmbeds } from './src/plugins/remark-embeds.mjs'
import { remarkFigures } from './src/plugins/remark-figures.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'

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
    // expressiveCode must precede mdx: it replaces the default Shiki setup.
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      styleOverrides: { borderRadius: '4px', codeFontSize: '0.85rem' },
    }),
    mdx(),
    // The search page and the offline fallback are chrome, not content.
    sitemap({ filter: (page) => !page.includes('/busca/') && !page.includes('/offline/') }),
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
    remarkPlugins: [remarkReadingTime, remarkMath, remarkEmbeds, remarkFigures],
    rehypePlugins: [rehypeCallouts, rehypeKatex],
  },
  image: {
    // The migration colocates images next to posts; they are all local files.
    responsiveStyles: true,
    // Real srcset/sizes for every <Image>. `constrained` fits this site's one
    // fixed reading column (Figure.astro clamps the request width to it).
    layout: 'constrained',
  },
})
