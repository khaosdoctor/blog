// @ts-check
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import expressiveCode from 'astro-expressive-code'
import mermaid from 'astro-mermaid'
import rehypeCallouts from 'rehype-callouts'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
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
  ],
  markdown: {
    remarkPlugins: [remarkReadingTime, remarkMath],
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
