/**
 * Inventory pass over the Ghost export. Reads nothing but the export JSON and
 * reports what the migration actually has to deal with: which Koenig cards are
 * used, which posts predate them, where every asset lives, and which tags are
 * section candidates. Run it before writing any conversion code.
 *
 *   node scripts/analyze-export.ts [path-to-export.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_EXPORT = join(homedir(), 'ghost-backups', 'lucas-santos.ghost.2026-08-07-21-28-06.json')
const OUT_DIR = '.migration'

type Post = {
  id: string
  slug: string
  title: string
  status: string
  type: string
  html: string | null
  feature_image: string | null
  published_at: string
  visibility: string
}

const exportPath = process.argv[2] ?? DEFAULT_EXPORT
const raw = JSON.parse(readFileSync(exportPath, 'utf8'))
const data = raw.db?.[0]?.data ?? raw.data
const posts: Post[] = data.posts
const tags: { id: string; name: string; slug: string }[] = data.tags
const postsTags: { post_id: string; tag_id: string; sort_order: number }[] = data.posts_tags
const postsMeta: { post_id: string; email_only: unknown }[] = data.posts_meta ?? []

/** Only the things that become articles on the new site. */
const articles = posts.filter((post) => post.type === 'post')

function tally<T>(items: T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (k === null) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

function sorted(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

// ---------------------------------------------------------------- cards + eras

const cardCounts = new Map<string, number>()
const cardExamples = new Map<string, string>()
const koenigPosts: string[] = []
const legacyPosts: string[] = []

for (const post of articles) {
  const html = post.html ?? ''
  const cards = [...html.matchAll(/class="[^"]*\bkg-([a-z0-9-]+?)-card\b/g)].map((match) => match[1])
  const unique = new Set(cards)
  for (const card of unique) {
    cardCounts.set(card, (cardCounts.get(card) ?? 0) + 1)
    if (!cardExamples.has(card)) cardExamples.set(card, post.slug)
  }
  // No Koenig markup at all means the body came from the old Markdown-card era.
  if (unique.size > 0) koenigPosts.push(post.slug)
  if (unique.size === 0) legacyPosts.push(post.slug)
}

// ------------------------------------------------------------------- landmines

const landmineTests: [string, RegExp][] = [
  ['katex-math', /class="[^"]*\bkatex\b/],
  ['table', /<table[\s>]/],
  ['footnotes', /(<section[^>]+footnotes|id="fn(ref)?[-:]?\d)/],
  ['iframe', /<iframe[\s>]/],
  ['code-block', /<pre[\s>]/],
  ['inline-style-attr', /\sstyle="/],
  ['raw-html-comment', /<!--/],
]

const landmines = new Map<string, string[]>()
for (const [name, test] of landmineTests) {
  landmines.set(
    name,
    articles.filter((post) => test.test(post.html ?? '')).map((post) => post.slug),
  )
}

// ---------------------------------------------------------------------- assets

const ASSET_ATTR = /(?:src|href|poster|srcset)="([^"]+)"/g

function classifyAsset(url: string): string {
  if (/raw\.githubusercontent\.com\/khaosdoctor\/blog-assets\//.test(url)) return 'blog-assets-repo'
  if (/blog\.lsantos\.dev\/content\/media\//.test(url)) return 'VM-ONLY-VIDEO'
  if (/blog\.lsantos\.dev\/content\//.test(url)) return 'VM-ONLY'
  if (/^https?:\/\//.test(url)) return 'OTHER-CDN'
  return 'RELATIVE'
}

const assets = new Map<string, { kind: string; posts: Set<string> }>()

for (const post of articles) {
  const urls = [...(post.html ?? '').matchAll(ASSET_ATTR)].flatMap((match) => match[1].split(/\s*,\s*/))
  const all = post.feature_image === null ? urls : [post.feature_image, ...urls]
  for (const candidate of all) {
    const url = candidate.trim().split(/\s+/)[0]
    if (url.length === 0 || url.startsWith('#') || url.startsWith('mailto:')) continue
    const existing = assets.get(url)
    if (existing === undefined) {
      assets.set(url, { kind: classifyAsset(url), posts: new Set([post.slug]) })
      continue
    }
    existing.posts.add(post.slug)
  }
}

const externalHosts = tally(
  [...assets.entries()].filter(([, meta]) => meta.kind === 'OTHER-CDN'),
  ([url]) => new URL(url).host,
)

// ------------------------------------------------------------------------ tags

const tagById = new Map(tags.map((tag) => [tag.id, tag]))
const tagsByPost = new Map<string, string[]>()
for (const link of [...postsTags].sort((a, b) => a.sort_order - b.sort_order)) {
  const tag = tagById.get(link.tag_id)
  if (tag === undefined) continue
  const current = tagsByPost.get(link.post_id) ?? []
  current.push(tag.name)
  tagsByPost.set(link.post_id, current)
}

const tagUsage = tally(articles, (post) => null)
for (const post of articles) {
  for (const name of tagsByPost.get(post.id) ?? []) {
    tagUsage.set(name, (tagUsage.get(name) ?? 0) + 1)
  }
}

/** First tag on a post is Ghost's primary tag, the default `category` source. */
const primaryTags = tally(articles, (post) => tagsByPost.get(post.id)?.[0] ?? '(no tags)')

// ---------------------------------------------------------------------- series

const SERIES_TITLE = /^(?<base>.+?)[\s—–-]+(?:parte|part|pt\.?)?\s*(?<n>\d+)\s*$/i
const seriesCandidates = new Map<string, string[]>()
for (const post of articles) {
  const match = SERIES_TITLE.exec(post.title)
  if (match?.groups === undefined) continue
  const base = match.groups.base.trim()
  const current = seriesCandidates.get(base) ?? []
  current.push(`${post.slug} (#${match.groups.n})`)
  seriesCandidates.set(base, current)
}
const realSeries = [...seriesCandidates.entries()].filter(([, members]) => members.length > 1)

// ----------------------------------------------------------------------- print

const emailOnly = new Set(
  postsMeta.filter((meta) => meta.email_only === 1 || meta.email_only === true).map((meta) => meta.post_id),
)

console.log(`export: ${exportPath}`)
console.log(`posts: ${articles.length} (of ${posts.length} records, rest are pages)`)
console.log(`  by status:`, Object.fromEntries(sorted(tally(articles, (post) => post.status))))
console.log(`  by visibility:`, Object.fromEntries(sorted(tally(articles, (post) => post.visibility))))
console.log(`  email-only: ${articles.filter((post) => emailOnly.has(post.id)).length}`)
console.log(`\ncontent eras: koenig ${koenigPosts.length} · legacy-markdown ${legacyPosts.length}`)

console.log(`\nKoenig cards (posts using each):`)
for (const [card, count] of sorted(cardCounts)) {
  console.log(`  ${card.padEnd(22)} ${String(count).padStart(4)}  e.g. ${cardExamples.get(card)}`)
}

console.log(`\nlandmines (posts affected):`)
for (const [name, slugs] of landmines) {
  const sample = slugs.length === 0 ? '' : `  e.g. ${slugs[0]}`
  console.log(`  ${name.padEnd(22)} ${String(slugs.length).padStart(4)}${sample}`)
}

console.log(`\nassets: ${assets.size} unique URLs`)
for (const [kind, count] of sorted(tally([...assets.values()], (meta) => meta.kind))) {
  console.log(`  ${kind.padEnd(22)} ${String(count).padStart(4)}`)
}
console.log(`  external hosts:`, Object.fromEntries(sorted(externalHosts).slice(0, 12)))

console.log(`\ntags: ${tags.length} total. Primary-tag distribution (category candidates):`)
for (const [name, count] of sorted(primaryTags)) {
  console.log(`  ${name.padEnd(28)} ${String(count).padStart(4)}`)
}

console.log(`\nseries candidates from titles: ${realSeries.length}`)
for (const [base, members] of realSeries) {
  console.log(`  ${base} → ${members.length} parts`)
}

mkdirSync(OUT_DIR, { recursive: true })
const inventory = {
  exportPath,
  generatedFrom: articles.length,
  eras: { koenig: koenigPosts, legacy: legacyPosts },
  cards: Object.fromEntries(sorted(cardCounts)),
  landmines: Object.fromEntries([...landmines].map(([name, slugs]) => [name, slugs])),
  assets: [...assets.entries()].map(([url, meta]) => ({ url, kind: meta.kind, posts: [...meta.posts] })),
  tagUsage: Object.fromEntries(sorted(tagUsage)),
  primaryTags: Object.fromEntries(sorted(primaryTags)),
  series: Object.fromEntries(realSeries),
  emailOnly: articles.filter((post) => emailOnly.has(post.id)).map((post) => post.slug),
}
writeFileSync(join(OUT_DIR, 'inventory.json'), JSON.stringify(inventory, null, 2))
console.log(`\nwrote ${OUT_DIR}/inventory.json`)
