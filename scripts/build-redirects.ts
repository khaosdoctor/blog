// Regenerates src/data/redirects.ts. Run when content moves.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// The same function the tag route uses, so a generated redirect can never point
// at a slug the site spells differently.
import { slugify } from '../src/lib/slugify.ts'
import { count, frontmatterOf, heading, ok, postIndex } from './lib/cli.ts'

heading('build-redirects: regenerating src/data/redirects.ts')

const SOURCE_DIR = 'content/blog'
const OUT = 'src/data/redirects.ts'

// Not imported from src/lib/taxonomy.ts: that file pulls in ./posts, which
// pulls in the astro:content virtual module, which only exists inside
// Astro/Vite. This script runs under plain node, so that import chain cannot
// resolve here; src/lib/slugify.ts is the leaf module both sides import instead.

// The newsletter category has no published posts yet, so /newsletter/ is not a
// page. Sending 48 URLs to a 404 is worse than sending them home, and sending
// them home is a soft-404 signal to Google either way.
//
// Change this to '/newsletter/' the moment the triage publishes any
// roundup. checkTargets below fails the build if this points at nothing.
const NEWSLETTER_TARGET = '/'

// Ghost URLs for newsletter issues and roundups that were never migrated to
// posts here. These came from .migration/review-newsletter-roundups.md and
// .migration/dropped-newsletter-issues.md, both gitignored working files that
// no longer exist on disk. Pulled from the `newsletter issue` rows already
// committed in src/data/redirects.ts, since that generated output is the last
// record of the full list. Fixed on purpose: Ghost is never publishing these
// slugs again, so there is nothing left to regenerate this from.
const NEWSLETTER_SLUGS = [
  'fts-fundadores-news',
  'ganhadores-do-sorteio-de-4k-seguidores',
  'giro-de-noticias-abril-de-2021',
  'giro-de-noticias-agosto-2021',
  'giro-de-noticias-dezembro-de-2020',
  'giro-de-noticias-fevereiro-2021',
  'giro-de-noticias-janeiro-de-2021',
  'giro-de-noticias-julho-2021',
  'giro-de-noticias-junho-de-2021',
  'giro-de-noticias-marco-de-2021',
  'giro-de-noticias-novembro-de-2020',
  'giro-de-noticias-outubro-2020',
  'ls-news-1',
  'ls-news-10',
  'ls-news-11-2',
  'ls-news-11',
  'ls-news-13',
  'ls-news-14',
  'ls-news-15',
  'ls-news-16',
  'ls-news-17',
  'ls-news-18',
  'ls-news-19',
  'ls-news-2',
  'ls-news-3',
  'ls-news-4',
  'ls-news-5',
  'ls-news-6',
  'ls-news-7',
  'ls-news-8',
  'ls-news-9',
  'ls-news-especial',
  'noticias-mai-21',
  'noticias-semanais-1',
  'noticias-semanais-10',
  'noticias-semanais-11',
  'noticias-semanais-12',
  'noticias-semanais-2',
  'noticias-semanais-3',
  'noticias-semanais-4',
  'noticias-semanais-5',
  'noticias-semanais-6',
  'noticias-semanais-7',
  'noticias-semanais-8',
  'noticias-semanais-9',
  'por-essa-surpresa-voce-nao-esperava',
  'queria-ter-aprendido-isso-antes',
  'sobe-a-semana-ts',
]
if (NEWSLETTER_SLUGS.length === 0) {
  throw new Error('NEWSLETTER_SLUGS is empty, the newsletter redirect rules would silently disappear')
}

const tags = new Set<string>()
const categories = new Set<string>()
/** Only categories with a published post get a page, so only those are valid targets. */
const liveCategories = new Set<string>()
const liveSlugs = new Set<string>()

for (const entry of readdirSync(SOURCE_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const file = postIndex(join(SOURCE_DIR, entry.name))
  if (file === undefined) continue
  const frontmatter = frontmatterOf(readFileSync(file, 'utf8'))
  const published = /^draft:\s*false/m.test(frontmatter)
  // A noindex post keeps its own page and leaves every listing, so the two
  // answers differ: it is a valid redirect target itself, and it contributes
  // no tag or category page. This mirrors getListedPosts, which is what the
  // taxonomy routes build from.
  const listed = published && !/^noindex:\s*true/m.test(frontmatter)
  if (published) liveSlugs.add(entry.name)
  const category = /^category:\s*"?([^"\n]+)"?/m.exec(frontmatter)?.[1]
  if (category !== undefined) {
    const name = category.trim().replace(/"$/, '')
    categories.add(name)
    if (listed) liveCategories.add(name)
  }
  if (!listed) continue
  const tagLine = /^tags:\s*\[(.*)\]/m.exec(frontmatter)?.[1] ?? ''
  for (const match of tagLine.matchAll(/"([^"]+)"/g)) tags.add(match[1])
}

const rows: { from: string; to: string; note: string }[] = []

// Ghost served tag archives at /tag/<slug>/; the new site uses /tags/<slug>/.
for (const tag of [...tags].sort()) {
  rows.push({ from: `/tag/${slugify(tag)}/`, to: `/tags/${slugify(tag)}/`, note: 'tag archive' })
}
// A tag that became a category goes to the category instead. Pushed after the tag
// rules so the dedupe below keeps this one. A category whose posts are all drafts
// (newsletter, today) has no page, so its old tag archive goes home instead of
// into a 404.
for (const category of [...categories].sort()) {
  const live = liveCategories.has(category)
  rows.push({
    from: `/tag/${slugify(category)}/`,
    to: live ? `/${category}/` : NEWSLETTER_TARGET,
    note: live ? 'tag became a category' : 'category has no published posts yet',
  })
}

// Ghost chrome with no equivalent here.
rows.push({ from: '/rss/', to: '/rss.xml', note: 'Ghost feed path' })
rows.push({ from: '/feed/', to: '/rss.xml', note: 'Ghost feed path' })
for (const name of [
  'sitemap.xml',
  'sitemap-posts.xml',
  'sitemap-pages.xml',
  'sitemap-tags.xml',
  'sitemap-authors.xml',
]) {
  rows.push({ from: `/${name}`, to: '/sitemap-index.xml', note: 'Ghost sitemap' })
}
for (const author of ['lucas-santos', 'khaosdoctor']) {
  rows.push({ from: `/author/${author}/`, to: '/', note: 'Ghost author archive' })
}

/**
 * Newsletter issues that resolve on Ghost today but are not posts here: the
 * ls-news and Notícias Semanais issues were removed outright, and the remaining
 * roundups are drafts, which build no page. Email-only sends are deliberately
 * absent, Ghost never gave them a web page, so there is nothing to preserve.
 */
for (const slug of NEWSLETTER_SLUGS) {
  if (liveSlugs.has(slug)) continue // published after all: it has its own page
  rows.push({ from: `/${slug}/`, to: NEWSLETTER_TARGET, note: 'newsletter issue' })
}

// Later entries win, so a tag that is also a category resolves to the category.
const bySource = new Map<string, (typeof rows)[number]>()
for (const row of rows) bySource.set(row.from, row)
const final = [...bySource.values()].sort((a, b) => a.from.localeCompare(b.from))

writeFileSync(
  OUT,
  `// GENERATED by scripts/build-redirects.ts, do not edit by hand.
//
// Every entry becomes a stub page at build: a meta-refresh with a canonical
// pointing at the target and a visible link, since static hosting cannot issue
// a real 301. Google treats meta-refresh as a redirect and passes the ranking.
export interface Redirect {
  /** Path Ghost served, always with a trailing slash unless it is a file. */
  from: string
  to: string
  /** Why it exists, so a future reader can tell which rules are still needed. */
  note: string
}

export const redirects: Redirect[] = ${JSON.stringify(final, null, 2)}
`,
)

const counts = new Map<string, number>()
for (const row of final) counts.set(row.note, (counts.get(row.note) ?? 0) + 1)
ok(`wrote ${OUT} with ${count(final.length, 'rule', 'rules')}`)
for (const [note, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${count(n, 'rule', 'rules')} ${note}`)
