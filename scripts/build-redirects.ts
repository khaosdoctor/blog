/**
 * Emits the redirect list for Cloudflare Bulk Redirects.
 *
 * Post URLs are NOT in here: every slug is preserved exactly, so they need no
 * redirect at all. Only Ghost's taxonomy paths moved, plus the handful of
 * routes Ghost served that no longer exist.
 *
 *   node scripts/build-redirects.ts > .migration/redirects.csv
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SITE = 'https://blog.lsantos.dev'
const SOURCE_DIR = 'content/blog'

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const tags = new Set<string>()
const categories = new Set<string>()

for (const name of readdirSync(SOURCE_DIR)) {
  if (!name.endsWith('.mdx') && !name.endsWith('.md')) continue
  const raw = readFileSync(join(SOURCE_DIR, name), 'utf8')
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
  const category = /^category:\s*"?([^"\n]+)"?/m.exec(frontmatter)?.[1]
  if (category !== undefined) categories.add(category.trim())
  const tagLine = /^tags:\s*\[(.*)\]/m.exec(frontmatter)?.[1] ?? ''
  for (const match of tagLine.matchAll(/"([^"]+)"/g)) tags.add(match[1])
}

const rows: [string, string, number][] = []

// Ghost served tag archives at /tag/<slug>/; the new site uses /tags/<slug>/.
for (const tag of [...tags].sort()) {
  rows.push([`${SITE}/tag/${slugify(tag)}/`, `${SITE}/tags/${slugify(tag)}/`, 301])
}
// A tag that became a section now lives at the section landing page.
for (const category of [...categories].sort()) {
  rows.push([`${SITE}/tag/${slugify(category)}/`, `${SITE}/${category}/`, 301])
}

// Ghost chrome that has no equivalent here.
rows.push([`${SITE}/ghost/`, `${SITE}/`, 302])
rows.push([`${SITE}/rss/`, `${SITE}/rss.xml`, 301])
rows.push([`${SITE}/feed/`, `${SITE}/rss.xml`, 301])
rows.push([`${SITE}/sitemap.xml`, `${SITE}/sitemap-index.xml`, 301])

// Later entries win in Bulk Redirects, so dedupe on the source URL keeping the
// last one: a tag that is also a section should land on the section.
const bySource = new Map<string, [string, string, number]>()
for (const row of rows) bySource.set(row[0], row)

console.log('source,target,status')
for (const [source, target, status] of bySource.values()) {
  console.log(`${source},${target},${status}`)
}
