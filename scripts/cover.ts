/**
 * Makes the cover for a post: the wireframe-3D SVG from the theme lab
 * (content/blog/theme-lab-arquivo/components/CoverLab.vue, "capa · wireframe
 * 3D"), rasterised locally with sharp. No network call and no external
 * service.
 *
 *   node scripts/cover.ts <slug>     # every file in one post
 *   node scripts/cover.ts            # every post file missing a cover
 *   node scripts/cover.ts --force    # regenerate all covers
 *
 * Each language gets its own cover (the title differs), named cover.png for
 * the default language (pt) and cover-{lang}.png for translations. Colour,
 * seed and the generated solid all come from `hashSlug(slug)`
 * (src/lib/cover.ts), never `Math.random()`, so the same post always draws
 * the same cover and the social-card cache does not break on every build.
 *
 * Covers generate in parallel (8 at a time) since sharp already uses libuv
 * threads for the PNG encode.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { basename, join } from 'node:path'
import sharp from 'sharp'
import { asLocale } from '../src/i18n/locales.ts'
import { parseAuthors } from '../src/lib/authors.ts'
import { buildCoverSvg, formatCoverByline } from '../src/lib/cover.ts'
import { estimateReadingTime } from '../src/lib/reading-time.ts'
import { fail as failLine, field, frontmatterOf, heading, ok } from './lib/cli.ts'

const SOURCE_DIR = 'content/blog'
const DEFAULT_LANG = 'pt'
const CONCURRENCY = Math.min(availableParallelism(), 16)

const args = process.argv.slice(2)
const force = args.includes('--force')
const slug = args.find((a) => !a.startsWith('--'))

function fail(message: string): never {
  failLine(message)
  process.exit(1)
}

function coverFilename(lang: string): string {
  return lang === DEFAULT_LANG ? 'cover.png' : `cover-${lang}.png`
}

async function generateCoverForFile(filePath: string, slug: string): Promise<boolean> {
  let raw = readFileSync(filePath, 'utf8')
  let frontmatter = frontmatterOf(raw)

  const hasHero = /^heroImage:/m.test(frontmatter)
  if (hasHero && !force) return false

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

  const filename = coverFilename(lang)
  const dir = join(SOURCE_DIR, slug)
  const target = join(dir, filename)
  writeFileSync(target, png)

  if (hasHero) {
    raw = readFileSync(filePath, 'utf8')
    frontmatter = frontmatterOf(raw)
    writeFileSync(filePath, raw.replace(/^heroImage:.*$/m, `heroImage: "./${filename}"`))
  } else {
    writeFileSync(
      filePath,
      raw.replace(/^---\n([\s\S]*?)\n---/, (_, fm: string) => `---\n${fm}\nheroImage: "./${filename}"\n---`),
    )
  }
  ok(`${slug}/${basename(filePath)}: wrote ${filename}`)
  return true
}

function postMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.mdx?$/.test(e.name))
    .map((e) => join(dir, e.name))
}

async function pool(tasks: Array<() => Promise<boolean>>, concurrency: number): Promise<number> {
  let generated = 0
  let i = 0
  async function next(): Promise<void> {
    while (i < tasks.length) {
      const task = tasks[i++]
      if (await task()) generated++
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => next()))
  return generated
}

function collectTasks(folders: string[]): Array<() => Promise<boolean>> {
  const tasks: Array<() => Promise<boolean>> = []
  for (const folder of folders) {
    const dir = join(SOURCE_DIR, folder)
    for (const file of postMdFiles(dir)) {
      tasks.push(() => generateCoverForFile(file, folder))
    }
  }
  return tasks
}

if (slug) {
  heading(`cover: generating covers for ${slug}`)
  const dir = join(SOURCE_DIR, slug)
  const files = postMdFiles(dir)
  if (files.length === 0) fail(`No post files at ${dir}.`)

  const tasks = files.map((file) => () => generateCoverForFile(file, slug))
  const generated = await pool(tasks, CONCURRENCY)

  if (generated === 0) {
    ok('all files already have covers')
  } else {
    ok(`generated ${generated} cover${generated === 1 ? '' : 's'}`)
  }
} else {
  heading(`cover: generating ${force ? 'all' : 'missing'} covers (${CONCURRENCY} parallel)`)
  const folders = readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  const tasks = collectTasks(folders)
  const generated = await pool(tasks, CONCURRENCY)

  if (generated === 0) {
    ok('all posts have covers')
  } else {
    ok(`generated ${generated} cover${generated === 1 ? '' : 's'}`)
  }
}
