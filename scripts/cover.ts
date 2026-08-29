/**
 * Makes the cover for a post: the wireframe-3D SVG from the theme lab
 * (content/blog/theme-lab-arquivo/components/CoverLab.vue, "capa · wireframe
 * 3D"), rasterised locally with sharp. No network call and no external
 * service.
 *
 *   node scripts/cover.ts <slug>
 *
 * Colour, seed and the generated solid all come from `hashSlug(slug)`
 * (src/lib/cover.ts), never `Math.random()`, so the same post always draws
 * the same cover and the social-card cache does not break on every build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { asLocale } from '../src/i18n/locales.ts'
import { parseAuthors } from '../src/lib/authors.ts'
import { buildCoverSvg, formatCoverByline } from '../src/lib/cover.ts'
import { estimateReadingTime } from '../src/lib/reading-time.ts'
import { fail as failLine, field, frontmatterOf, heading, ok, postIndex } from './lib/cli.ts'

const SOURCE_DIR = 'content/blog'

function fail(message: string): never {
  failLine(message)
  process.exit(1)
}

const slug = process.argv[2] ?? fail('Usage: node scripts/cover.ts <slug>')

heading(`cover: making the cover for ${slug}`)

const dir = join(SOURCE_DIR, slug)
const postFile = postIndex(dir) ?? fail(`No post at ${dir}.`)

const raw = readFileSync(postFile, 'utf8')
const frontmatter = frontmatterOf(raw)
const title = field(frontmatter, 'title') ?? fail(`${postFile} has no title in its frontmatter.`)
const category = field(frontmatter, 'category') ?? ''
const lang = asLocale(field(frontmatter, 'lang'))
const pubDateRaw = field(frontmatter, 'pubDate') ?? fail(`${postFile} has no pubDate in its frontmatter.`)
const pubDate = new Date(pubDateRaw)

// No post sets `authors` today (a plain frontmatter line reader like `field`
// cannot follow a YAML list safely), so this reads the site's own
// default the same way Authors.astro does when a post is silent about it.
const [author] = parseAuthors(undefined)
const byline = formatCoverByline(pubDate, lang, author.name)

// The card's meta line carries the reading time, and this script has no
// render() to read the exact remark-computed number off (src/plugins/
// remark-reading-time.mjs runs inside Astro). The regex estimate every list
// page already shows is the one available here, so an MDX-heavy post's
// og:image can read a minute off its own page. Same trade PostList makes, and
// the same reason.
const readingMinutes = estimateReadingTime(raw.replace(/^---\n[\s\S]*?\n---/, ''))

const svg = buildCoverSvg({ slug, title, category, byline, readingMinutes })
const png = await sharp(Buffer.from(svg)).png().toBuffer()

const target = join(dir, 'cover.png')
writeFileSync(target, png)
ok(`wrote ${target}`)

if (/^heroImage:/m.test(frontmatter)) {
  console.log(`${postFile} already sets heroImage, left alone`)
  process.exit(0)
}

writeFileSync(
  postFile,
  raw.replace(/^---\n([\s\S]*?)\n---/, (_, fm: string) => `---\n${fm}\nheroImage: "./cover.png"\n---`),
)
ok('set heroImage: "./cover.png"')
