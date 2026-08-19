/**
 * Makes the cover for a post: the wireframe-3D SVG Lucas picked in the theme
 * lab (content/blog/theme-lab-arquivo/components/CoverLab.vue, "capa ·
 * wireframe 3D"), rasterised locally with sharp. No network call, no Replicate token,
 * no external Deno service: the three shortlisted candidates all drew their
 * own SVG locally, and choosing one retired the AI-background pipeline this
 * script used to run (docs/decisions.md, docs/decisions-log.md).
 *
 *   node scripts/cover.ts <slug>
 *
 * Colour, seed and the generated solid all come from `hashSlug(slug)`
 * (src/lib/cover.ts), never `Math.random()`, so the same post always draws
 * the same cover and the social-card cache does not break on every build.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { parseAuthors } from '../src/lib/authors.ts'
import { buildCoverSvg, formatCoverByline } from '../src/lib/cover.ts'
import { fail as failLine, heading, ok } from './lib/cli.ts'

const SOURCE_DIR = 'content/blog'

function fail(message: string): never {
  failLine(message)
  process.exit(1)
}

function frontmatterOf(raw: string): string {
  return /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
}

function field(frontmatter: string, key: string): string | null {
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(frontmatter)
  if (match === null) return null
  return match[1].trim().replace(/^["'](.*)["']$/, '$1')
}

const slug = process.argv[2] ?? fail('Usage: node scripts/cover.ts <slug>')

heading(`cover: making the cover for ${slug}`)

const dir = join(SOURCE_DIR, slug)
const postFile = ['index.mdx', 'index.md'].map((name) => join(dir, name)).find(existsSync) ?? fail(`No post at ${dir}.`)

const raw = readFileSync(postFile, 'utf8')
const frontmatter = frontmatterOf(raw)
const title = field(frontmatter, 'title') ?? fail(`${postFile} has no title in its frontmatter.`)
const category = field(frontmatter, 'category') ?? ''
const lang = field(frontmatter, 'lang') === 'en' ? 'en' : 'pt'
const pubDateRaw = field(frontmatter, 'pubDate') ?? fail(`${postFile} has no pubDate in its frontmatter.`)
const pubDate = new Date(pubDateRaw)

// No post sets `authors` today (a plain frontmatter line reader like `field`
// above cannot follow a YAML list safely), so this reads the site's own
// default the same way Authors.astro does when a post is silent about it.
const [author] = parseAuthors(undefined)
const byline = formatCoverByline(pubDate, lang, author.name)

const svg = buildCoverSvg({ slug, title, category, byline })
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
