/**
 * Post-build guard. The migration is the kind of thing that fails quietly, so
 * the build checks its own output instead of trusting it.
 *
 *   node scripts/check-output.ts
 *
 * Exits non-zero on anything that would ship broken content.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const CONTENT = 'content/blog'

type Failure = { check: string; detail: string }

const failures: Failure[] = []
const warnings: string[] = []

function walk(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...walk(full))
      continue
    }
    found.push(full)
  }
  return found
}

const files = walk(DIST)
const pages = files.filter((file) => file.endsWith('.html'))

// 1. Every published post produced a page.
const published = readdirSync(CONTENT)
  .filter((name) => name.endsWith('.mdx') || name.endsWith('.md'))
  .filter((name) => !/^draft:\s*true/m.test(readFileSync(join(CONTENT, name), 'utf8')))
const expected = published.map((name) => name.replace(/\.mdx?$/, ''))
for (const slug of expected) {
  if (!files.includes(join(DIST, slug, 'index.html'))) {
    failures.push({ check: 'missing page', detail: slug })
  }
}

// 2. No Ghost markup survived the conversion.
// 3. No component tag leaked as literal text (a rule that never matched).
const GHOST_CLASS = /\bkg-[a-z-]+\b/
const LEAKED_TAG = /&#60;(?:Figure|Video|Bookmark|CourseCTA|RawEmbed|Sidenote|MarginNote|YouTube|Vimeo)\b/

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  if (GHOST_CLASS.test(html)) failures.push({ check: 'leftover Ghost class', detail: page })
  if (LEAKED_TAG.test(html)) failures.push({ check: 'unrendered component tag', detail: page })
  if (html.includes('__GHOST_URL__')) failures.push({ check: 'unresolved Ghost URL', detail: page })
}

// 4. The feeds, the sitemap and the scheduler manifest all exist and parse.
for (const required of ['rss.xml', 'sitemap-index.xml', 'scheduled.json', '404.html']) {
  if (!files.includes(join(DIST, required))) {
    failures.push({ check: 'missing artifact', detail: required })
  }
}
const manifestPath = join(DIST, 'scheduled.json')
if (files.includes(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { posts?: unknown[] }
    if (!Array.isArray(manifest.posts)) {
      failures.push({ check: 'scheduled.json', detail: 'posts is not an array' })
    }
  } catch (error) {
    failures.push({ check: 'scheduled.json', detail: `unparseable: ${(error as Error).message}` })
  }
}

// 5. Every colocated image the posts reference actually made it into the build.
const missingImages = new Set<string>()
for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  for (const match of html.matchAll(/src="(\/_astro\/[^"]+)"/g)) {
    const asset = join(DIST, decodeURIComponent(match[1]))
    if (!files.includes(asset)) missingImages.add(match[1])
  }
}
for (const image of missingImages) failures.push({ check: 'missing built image', detail: image })

// 6. Pagefind ran. Not fatal on its own, but the search page is dead without it.
if (!files.some((file) => file.startsWith(join(DIST, 'pagefind')))) {
  warnings.push('no pagefind index in dist/ — search will fall back to the plain form')
}

// 7. Nothing enormous slipped into the output.
for (const file of files) {
  const size = statSync(file).size
  if (size > 8 * 1024 * 1024) warnings.push(`${file} is ${(size / 1024 / 1024).toFixed(1)}MB`)
}

console.log(`checked ${pages.length} pages, ${expected.length} published posts`)
for (const warning of warnings) console.log(`warning: ${warning}`)

if (failures.length === 0) {
  console.log('output looks clean')
  process.exit(0)
}

const grouped = new Map<string, string[]>()
for (const failure of failures) {
  const current = grouped.get(failure.check) ?? []
  current.push(failure.detail)
  grouped.set(failure.check, current)
}
for (const [check, details] of grouped) {
  console.error(`\n${check} (${details.length}):`)
  for (const detail of details.slice(0, 10)) console.error(`  ${detail}`)
  if (details.length > 10) console.error(`  ...and ${details.length - 10} more`)
}
process.exit(1)
