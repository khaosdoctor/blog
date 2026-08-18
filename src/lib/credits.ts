/**
 * The single list behind /oss/ and /en/oss/. Every open source project,
 * typeface and tool this site is built on, so both routes render from one
 * array and adding a credit is one entry here.
 *
 * Names, licences and authors come from package.json, public/fonts/LICENSES.txt,
 * or, where a licence is not written down in this repo, the package's own
 * package.json under node_modules. Nothing here is invented.
 *
 * One entry exists for a reason beyond decoration: PxPlus IBM VGA 9x16 is
 * CC BY-SA 4.0, which requires attribution reachable from the site. This page
 * is that attribution, so its entry carries `licenseUrl` and must not be
 * removed. See docs/theming.md and the footer in BaseLayout.astro.
 */
export type CreditKind = 'font' | 'icon' | 'dependency' | 'markdown' | 'search'

export interface Credit {
  name: string
  url: string
  license: string
  /** Set only where the licence text itself has to stay reachable, not just named. */
  licenseUrl?: string
  author?: string
  /** One line on what it does on this site. */
  note: string
  kind: CreditKind
}

export const credits: Credit[] = [
  // Fonts. Only the four decided faces, declared in src/styles/fonts.css and
  // applied to the live site. Everything else in public/fonts/ is a lab
  // candidate that loads only on /theme-lab/, through
  // content/blog/theme-lab/components/fonts.css, and is not credited here:
  // this page is for what the site is built on, not every candidate a
  // decision was made from. public/fonts/LICENSES.txt still lists all of
  // them, since the files stay in the repo and their licences travel with
  // them.
  {
    name: 'Departure Mono',
    url: 'https://departuremono.com',
    license: 'OFL 1.1',
    author: 'Helena Zhang',
    note: 'Display face on every heading, weight 400 only.',
    kind: 'font',
  },
  {
    name: 'Literata',
    url: 'https://fonts.google.com/specimen/Literata',
    license: 'OFL 1.1',
    author: 'Font Bureau and TypeTogether',
    note: 'Default body face.',
    kind: 'font',
  },
  {
    name: 'Atkinson Hyperlegible',
    url: 'https://fonts.google.com/specimen/Atkinson+Hyperlegible',
    license: 'OFL 1.1',
    author: 'Braille Institute of America',
    note: 'Body face for the sans reader setting.',
    kind: 'font',
  },
  {
    name: 'PxPlus IBM VGA 9x16',
    url: 'https://int10h.org/oldschool-pc-fonts/',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'VileR, The Oldschool PC Font Resource',
    note: 'Subtitle face for post excerpts and section descriptions, at a fixed 16px.',
    kind: 'font',
  },

  // Icons, kept as plain SVG in src/components/icons/ rather than installed.
  {
    name: 'Pixelarticons',
    url: 'https://pixelarticons.com',
    license: 'MIT',
    author: 'halfmage',
    note: 'Source of the theme and preferences icons in src/components/icons/.',
    kind: 'icon',
  },

  // Framework and dependencies, from package.json.
  {
    name: 'Astro',
    url: 'https://astro.build',
    license: 'MIT',
    note: 'Builds every page in this site as static HTML.',
    kind: 'dependency',
  },
  {
    name: 'Vue',
    url: 'https://vuejs.org',
    license: 'MIT',
    note: 'Runs the interactive islands inside a handful of posts.',
    kind: 'dependency',
  },
  {
    name: '@astrojs/vue',
    url: 'https://docs.astro.build/en/guides/integrations-guide/vue/',
    license: 'MIT',
    note: 'Astro integration that renders Vue components as islands.',
    kind: 'dependency',
  },
  {
    name: '@astrojs/rss',
    url: 'https://docs.astro.build/en/guides/rss/',
    license: 'MIT',
    note: 'Builds the RSS feed for each language.',
    kind: 'dependency',
  },
  {
    name: '@astrojs/sitemap',
    url: 'https://docs.astro.build/en/guides/integrations-guide/sitemap/',
    license: 'MIT',
    note: 'Builds the sitemap, with a lastmod date per page.',
    kind: 'dependency',
  },
  {
    name: 'astro-expressive-code',
    url: 'https://expressive-code.com',
    license: 'MIT',
    note: 'Syntax highlighting for every code block on the site.',
    kind: 'dependency',
  },
  {
    name: '@expressive-code/plugin-line-numbers',
    url: 'https://expressive-code.com/plugins/line-numbers/',
    license: 'MIT',
    note: 'Line numbers on every code block.',
    kind: 'dependency',
  },
  {
    name: 'sharp',
    url: 'https://sharp.pixelplumbing.com',
    license: 'Apache License 2.0',
    note: 'Resizes post images at build time and rasterises the generated cover art.',
    kind: 'dependency',
  },
  {
    name: 'acorn',
    url: 'https://github.com/acornjs/acorn',
    license: 'MIT',
    note: "Parses the source a lab demo's `<details>` block reveals.",
    kind: 'dependency',
  },
  {
    name: 'TypeScript',
    url: 'https://www.typescriptlang.org',
    license: 'Apache License 2.0',
    note: 'Every script, plugin and component in this repo is typed.',
    kind: 'dependency',
  },
  {
    name: '@astrojs/check',
    url: 'https://www.npmjs.com/package/@astrojs/check',
    license: 'MIT',
    note: 'Type-checks every .astro file, run by npm run check.',
    kind: 'dependency',
  },
  {
    name: 'Anthropic SDK',
    url: 'https://github.com/anthropics/anthropic-sdk-typescript',
    license: 'MIT',
    note: 'Drives the first-pass automated translation workflow, reviewed before it publishes.',
    kind: 'dependency',
  },

  // The markdown pipeline: everything a post's frontmatter or body actually
  // renders through, beyond this repo's own remark and rehype plugins.
  {
    name: '@astrojs/mdx',
    url: 'https://docs.astro.build/en/guides/integrations-guide/mdx/',
    license: 'MIT',
    note: 'Lets a post be MDX with the remark and rehype chain below attached.',
    kind: 'markdown',
  },
  {
    name: '@astrojs/markdown-remark',
    url: 'https://github.com/withastro/astro',
    license: 'MIT',
    note: 'The unified() processor astro.config.mjs attaches every remark and rehype plugin below to.',
    kind: 'markdown',
  },
  {
    name: 'remark-math',
    url: 'https://github.com/remarkjs/remark-math',
    license: 'MIT',
    note: 'Parses `$...$` math syntax in a post.',
    kind: 'markdown',
  },
  {
    name: 'rehype-katex',
    url: 'https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex',
    license: 'MIT',
    note: 'Turns parsed math into KaTeX markup during the build.',
    kind: 'markdown',
  },
  {
    name: 'KaTeX',
    url: 'https://katex.org',
    license: 'MIT',
    note: 'Renders the maths itself. Self-hosted rather than loaded from a CDN.',
    kind: 'markdown',
  },
  {
    name: 'rehype-callouts',
    url: 'https://github.com/lin-stephanie/rehype-callouts',
    license: 'MIT',
    note: "Renders Obsidian's callout syntax (`> [!note]` and the rest) as the boxes a post shows.",
    kind: 'markdown',
  },
  {
    name: 'github-slugger',
    url: 'https://github.com/Flet/github-slugger',
    license: 'ISC',
    note: 'Generates the heading ids that anchors and the table of contents link to.',
    kind: 'markdown',
  },
  {
    name: 'astro-mermaid',
    url: 'https://github.com/joesaby/astro-mermaid',
    license: 'MIT',
    note: 'Wires Mermaid diagram syntax into the markdown pipeline.',
    kind: 'markdown',
  },
  {
    name: 'Mermaid',
    url: 'https://mermaid.js.org',
    license: 'MIT',
    note: 'Renders diagram syntax as inline SVG.',
    kind: 'markdown',
  },
  {
    name: 'astro-embed',
    url: 'https://github.com/delucis/astro-embed',
    license: 'MIT',
    note: 'Turns a bare URL alone in a paragraph into a YouTube, Vimeo or Spotify embed.',
    kind: 'markdown',
  },

  // The search index.
  {
    name: 'Pagefind',
    url: 'https://pagefind.app',
    license: 'MIT',
    note: "Builds the search index after the site builds, and runs the search itself in the reader's browser.",
    kind: 'search',
  },
]
