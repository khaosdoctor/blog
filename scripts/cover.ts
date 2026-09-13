/**
 * Makes the cover for a post: the wireframe-3D SVG from the theme lab
 * (content/blog/theme-lab-arquivo/components/CoverLab.vue, "capa · wireframe
 * 3D"), rasterised locally with sharp. No network call and no external
 * service.
 *
 *   node scripts/cover.ts <slug>     # one post
 *   node scripts/cover.ts            # every post missing a cover
 *
 * Colour, seed and the generated solid all come from `hashSlug(slug)`
 * (src/lib/cover.ts), never `Math.random()`, so the same post always draws
 * the same cover and the social-card cache does not break on every build.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

async function generateCover(slug: string): Promise<boolean> {
  const dir = join(SOURCE_DIR, slug)
  const postFile = postIndex(dir)
  if (!postFile) return false

  const raw = readFileSync(postFile, 'utf8')
  const frontmatter = frontmatterOf(raw)

  if (/^heroImage:/m.test(frontmatter)) return false

  const title = field(frontmatter, 'title')
  if (!title) return false
  const category = field(frontmatter, 'category') ?? ''
  const lang = asLocale(field(frontmatter, 'lang'))
  const pubDateRaw = field(frontmatter, 'pubDate')
  if (!pubDateRaw) return false
  const pubDate = new Date(pubDateRaw)
  const draft = field(frontmatter, 'draft')
  if (draft === 'true') return false
  const noindex = field(frontmatter, 'noindex')
  if (noindex === 'true') return false

  const [author] = parseAuthors(undefined)
  const byline = formatCoverByline(pubDate, lang, author.name)
  const readingMinutes = estimateReadingTime(raw.replace(/^---\n[\s\S]*?\n---/, ''))

  const svg = buildCoverSvg({ slug, title, category, byline, readingMinutes })
  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  const target = join(dir, 'cover.png')
  writeFileSync(target, png)

  writeFileSync(
    postFile,
    raw.replace(/^---\n([\s\S]*?)\n---/, (_, fm: string) => `---\n${fm}\nheroImage: "./cover.png"\n---`),
  )
  ok(`${slug}: wrote cover and set heroImage`)
  return true
}

const slug = process.argv[2]

if (slug) {
  heading(`cover: making the cover for ${slug}`)
  const dir = join(SOURCE_DIR, slug)
  if (!postIndex(dir)) fail(`No post at ${dir}.`)
  const raw = readFileSync(postIndex(dir)!, 'utf8')
  const frontmatter = frontmatterOf(raw)
  const title = field(frontmatter, 'title') ?? fail(`${postIndex(dir)} has no title in its frontmatter.`)
  const category = field(frontmatter, 'category') ?? ''
  const lang = asLocale(field(frontmatter, 'lang'))
  const pubDateRaw = field(frontmatter, 'pubDate') ?? fail(`${postIndex(dir)} has no pubDate in its frontmatter.`)
  const pubDate = new Date(pubDateRaw)

  const [author] = parseAuthors(undefined)
  const byline = formatCoverByline(pubDate, lang, author.name)
  const readingMinutes = estimateReadingTime(raw.replace(/^---\n[\s\S]*?\n---/, ''))

  const svg = buildCoverSvg({ slug, title, category, byline, readingMinutes })
  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  const target = join(dir, 'cover.png')
  writeFileSync(target, png)
  ok(`wrote ${target}`)

  if (/^heroImage:/m.test(frontmatter)) {
    console.log(`${postIndex(dir)} already sets heroImage, left alone`)
  } else {
    writeFileSync(
      postIndex(dir)!,
      raw.replace(/^---\n([\s\S]*?)\n---/, (_, fm: string) => `---\n${fm}\nheroImage: "./cover.png"\n---`),
    )
    ok('set heroImage: "./cover.png"')
  }
} else {
  heading('cover: generating missing covers')
  const folders = readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  let generated = 0
  for (const folder of folders) {
    if (await generateCover(folder)) generated++
  }

  if (generated === 0) {
    ok('all posts have covers')
  } else {
    ok(`generated ${generated} cover${generated === 1 ? '' : 's'}`)
  }
}
