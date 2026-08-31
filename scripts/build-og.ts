/**
 * Generates the per-category social cards.
 *
 *   node scripts/build-og.ts
 *
 * Rendered in Chromium rather than a rasteriser: the card carries text in
 * Departure Mono, and the browser is the only thing here that reads a woff2.
 * The output is committed, so this runs by hand, never in the build.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { LIGHT_GROUND } from '../src/lib/grounds.ts'
import { bold, count, dim, heading, ok } from './lib/cli.ts'

const OUT_DIR = 'public/og'
// Mirrors OG_CARD_WIDTH, OG_CARD_HEIGHT and SITE_NAME in src/lib/seo.ts, which
// this cannot import: that module reaches the Astro-only extensionless imports.
const OG_CARD_WIDTH = 1200
const OG_CARD_HEIGHT = 630
const SITE_NAME = 'lsantos.dev'
const PAPER = LIGHT_GROUND
const INK = '#1a1c20'

// The two sentences each language already puts in its own meta description, so
// the card and the page it belongs to say one thing. `homeDescription` and
// `categoryDescription` in src/i18n/ui.ts are the originals. Portuguese writes
// to `public/og/`, English to `public/og/en/`, matching the routes.
const LOCALES = {
  pt: {
    prefix: '',
    home: 'Artigos sobre desenvolvimento, tecnologia e opinião.',
    category: (name: string) => `Todos os artigos da categoria ${name}.`,
  },
  en: {
    prefix: 'en/',
    home: 'Articles about software development, technology and opinion.',
    category: (name: string) => `Every article in the ${name} category.`,
  },
}

// One accent per category, taken from the brand mark's palette.
const CATEGORIES: Record<string, string> = {
  default: '#e30613',
  javascript: '#f5b200',
  typescript: '#0578be',
  infra: '#45b384',
  security: '#e30613',
  career: '#0578be',
  opinion: '#45b384',
  meta: '#1a1c20',
}

const mark = readFileSync('public/favicon.svg', 'utf8')
const face = readFileSync('public/fonts/DepartureMono-Regular.woff2').toString('base64')

type Copy = (typeof LOCALES)[keyof typeof LOCALES]

function card(category: string, accent: string, copy: Copy): string {
  const home = category === 'default'
  const label = `${SITE_NAME}/${copy.prefix}${home ? '' : category}`.replace(/\/$/, '')
  const tagline = home ? copy.home : copy.category(category)
  return `<!doctype html><meta charset="utf-8"><style>
@font-face {
  font-family: 'Departure Mono';
  src: url(data:font/woff2;base64,${face}) format('woff2');
}
* { margin: 0; box-sizing: border-box; }
body {
  inline-size: ${OG_CARD_WIDTH}px;
  block-size: ${OG_CARD_HEIGHT}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 26px;
  padding: 0 100px;
  border-block-end: 24px solid ${accent};
  background: ${PAPER};
  color: ${INK};
  font-family: 'Departure Mono', monospace;
}
svg { inline-size: 150px; block-size: 150px; }
.label { color: ${accent}; font-size: 30px; letter-spacing: 0.06em; }
h1 { font-size: 82px; font-weight: 400; letter-spacing: -0.02em; }
p { max-inline-size: 800px; font-size: 34px; line-height: 1.35; }
hr { inline-size: 420px; block-size: 8px; border: 0; background: ${INK}; }
</style>
${mark}
<div class="label">&gt; ${label}</div>
<h1>Lucas Santos</h1>
<hr>
<p>${tagline}</p>`
}

const total = Object.keys(CATEGORIES).length * Object.keys(LOCALES).length

heading(`build-og: rendering ${total} category cards`)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT } })

for (const copy of Object.values(LOCALES)) {
  const dir = join(OUT_DIR, copy.prefix)
  mkdirSync(dir, { recursive: true })

  for (const [name, accent] of Object.entries(CATEGORIES)) {
    await page.setContent(card(name, accent, copy))
    await page.evaluate(() => document.fonts.ready)
    const png = await page.screenshot()
    writeFileSync(join(dir, `${name}.png`), png)
    console.log(
      `  ${bold(`${copy.prefix}${name}.png`)} ${OG_CARD_WIDTH}x${OG_CARD_HEIGHT} ${dim(`(${(png.length / 1024).toFixed(1)}kB)`)}`,
    )
  }
}

await browser.close()

ok(`wrote ${count(total, 'card', 'cards')} to ${OUT_DIR}`)
