/**
 * Vendors remote media into the repository, then rewrites the post to point at
 * the local copy.
 *
 *   node scripts/vendor-media.ts            # download and rewrite
 *   node scripts/vendor-media.ts --dry-run  # report only
 *
 * Runs as `prebuild`, so `npm run build` always vendors first. After the first
 * successful run there is nothing left to fetch and the step is a no-op, which
 * is the point: a post that has been built once no longer depends on anyone
 * else's server staying up.
 *
 * A failed download is never fatal. The remote URL stays in the post, the run
 * prints it, and every failure is written to .migration/unreachable-media.md as
 * a checklist so the file can be found by hand and dropped in.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { slugify } from '../src/lib/slugify.ts'
import { bold, count, dim, heading, list, ok, postFiles, warn } from './lib/cli.ts'

const CONTENT_DIR = 'content/blog'
const DEAD_IMAGES = 'content/dead-images.json'
const REPORT = '.migration/unreachable-media.md'
const SITE = 'http://localhost:4321'
const TIMEOUT = 20_000
const ATTEMPTS = 3
const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Hosts whose URLs are embeds, not media: remark-embeds turns these into a
 * player or a card, so there is nothing to download. Everything else that looks
 * like an image gets vendored.
 */
const EMBED_HOST = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|twitter\.com|x\.com|speakerdeck\.com|open\.spotify\.com)$/

/**
 * What Astro's image service will actually process. Anything else has to be
 * converted on the way in, or the build dies at render time on a file that looks
 * fine on disk.
 */
const ASTRO_FORMATS = new Set(['.png', '.jpg', '.gif', '.webp', '.avif', '.svg', '.tiff'])

/**
 * The real format, from the bytes. A content-type header is a claim, not a fact:
 * one host served a Windows .ico as `image/gif`, which passed every check here
 * and then failed the build inside sharp.
 */
function sniff(bytes: Buffer): string | null {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte)

  if (starts(0x89, 0x50, 0x4e, 0x47)) return '.png'
  if (starts(0xff, 0xd8, 0xff)) return '.jpg'
  if (starts(0x47, 0x49, 0x46, 0x38)) return '.gif'
  if (starts(0x00, 0x00, 0x01, 0x00)) return '.ico'
  if (starts(0x42, 0x4d)) return '.bmp'
  if (starts(0x49, 0x49, 0x2a, 0x00) || starts(0x4d, 0x4d, 0x00, 0x2a)) return '.tiff'
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return '.webp'
  }
  if (bytes.subarray(4, 12).toString('ascii').includes('ftypavif')) return '.avif'
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') return '.mp4'
  if (starts(0x1a, 0x45, 0xdf, 0xa3)) return '.webm'
  if (starts(0x49, 0x44, 0x33) || starts(0xff, 0xfb)) return '.mp3'

  const head = bytes.subarray(0, 300).toString('utf8').trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return '.svg'
  return null
}

/** Extension by content type, for URLs that carry no usable one. */
const EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
}

interface Target {
  url: string
  slug: string
  file: string
}

interface Failure extends Target {
  reason: string
}

/**
 * Prose and fenced code, alternating, with the fences at the odd positions. A
 * URL inside a fence is source text a reader is meant to copy, not an image the
 * page loads, so nothing here downloads it or rewrites it: an example in the
 * lab post would otherwise be fetched for real.
 */
function segments(body: string): string[] {
  return body.split(/(```[\s\S]*?```)/g)
}

const isCode = (index: number) => index % 2 === 1

/** Markdown images plus a remote heroImage in the frontmatter. */
function remoteUrls(body: string): string[] {
  const urls = new Set<string>()

  for (const match of body.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)/g)) urls.add(match[1])
  const hero = body.match(/^heroImage:\s*["']?(https?:\/\/[^"'\s]+)/m)
  if (hero !== null) urls.add(hero[1])

  return [...urls].filter((url) => {
    try {
      return !EMBED_HOST.test(new URL(url).hostname)
    } catch {
      return false
    }
  })
}

/**
 * A stable, readable filename. The hash keeps two different remote files from
 * colliding when their basenames match, which they often do (`image.png`,
 * `/public`, `1024px-Foo.jpg`), without making the name unreadable.
 */
function filenameFor(url: string, extension: string): string {
  const parsed = new URL(url)
  const base = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() ?? 'image')
  const stem = slugify(base.replace(/\.[a-z0-9]+$/i, '')).slice(0, 40)

  const short = createHash('sha256').update(url).digest('hex').slice(0, 6)
  return `${stem || 'media'}-${short}${extension}`
}

/**
 * Bytes ready for the asset pipeline. A format sharp can read but Astro cannot
 * process (.ico, .bmp) becomes a png rather than a broken build or a file kept
 * remote; everything Astro handles is written through untouched.
 */
async function forAssetPipeline(
  bytes: Buffer,
  extension: string,
): Promise<{ bytes: Buffer; extension: string } | string> {
  if (ASTRO_FORMATS.has(extension)) return { bytes, extension }
  if (extension === '.mp4' || extension === '.webm' || extension === '.mp3') return { bytes, extension }

  if (extension === '.ico' || extension === '.bmp') {
    try {
      const sharp = (await import('sharp')).default
      // An .ico holds several sizes; sharp reads the largest by default.
      return { bytes: await sharp(bytes).png().toBuffer(), extension: '.png' }
    } catch (error) {
      return `could not convert ${extension} to png: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  return `unsupported format ${extension}`
}

async function download(url: string): Promise<{ bytes: Buffer; contentType: string } | string> {
  let lastError = 'unknown error'

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT),
        redirect: 'follow',
        // Several CDNs (Wikimedia, some image hosts) refuse a bare fetch agent.
        headers: {
          'user-agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36',
          accept: 'image/avif,image/webp,image/png,image/*,video/*,*/*;q=0.8',
        },
      })
      if (!response.ok) {
        lastError = `HTTP ${response.status}`
        // A 4xx will not become a 2xx on retry; only server and network faults do.
        if (response.status < 500) return lastError
        continue
      }

      const contentType = response.headers.get('content-type') ?? ''
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.byteLength === 0) {
        lastError = 'empty response'
        continue
      }
      if (!/^(image|video|audio)\//.test(contentType)) return `not media, got ${contentType || 'no content-type'}`
      return { bytes, contentType }
    } catch (error) {
      lastError = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    }
  }

  return lastError
}

/**
 * A host that has stopped serving an image does not start again, and every
 * build otherwise pays the full retry sequence per reference to find that out.
 * remark-figures reads this same list to render <MissingImage /> in the post.
 */
function knownDead(): Set<string> {
  let raw: string
  try {
    raw = readFileSync(DEAD_IMAGES, 'utf8')
  } catch {
    return new Set()
  }
  return new Set((JSON.parse(raw).urls ?? []) as string[])
}

heading('vendor-media: vendoring remote media referenced in posts')

const dead = knownDead()
const targets: Target[] = []
for (const file of postFiles(CONTENT_DIR)) {
  const slug = file.split('/').slice(-2, -1)[0]
  const prose = segments(readFileSync(file, 'utf8'))
    .filter((_, index) => !isCode(index))
    .join('\n')
  for (const url of remoteUrls(prose)) {
    if (dead.has(url)) continue
    targets.push({ url, slug, file })
  }
}

if (targets.length === 0) {
  ok('nothing remote, every post already carries its own media (no-op)')
  process.exit(0)
}

console.log(
  `${count(targets.length, 'reference', 'references')} across ${count(new Set(targets.map((t) => t.slug)).size, 'post', 'posts')}`,
)

const failures: Failure[] = []
let vendored = 0

if (DRY_RUN)
  list(
    targets.map((t) => `would fetch ${t.url}`),
    { max: 20 },
  )

// Serial on purpose: this is a one-off per image over the life of a post, and a
// polite crawl rate matters more than finishing a second sooner.
for (const target of targets) {
  if (DRY_RUN) continue

  const result = await download(target.url)
  if (typeof result === 'string') {
    failures.push({ ...target, reason: result })
    continue
  }

  // The bytes decide the extension. The header only breaks the tie when the
  // signature is one this script does not know.
  const sniffed = sniff(result.bytes)
  const fromType = EXTENSIONS[result.contentType.split(';')[0].trim().toLowerCase()]
  const fromUrl = extname(new URL(target.url).pathname).toLowerCase()
  const claimed = sniffed ?? fromType ?? (/^\.[a-z0-9]{2,5}$/.test(fromUrl) ? fromUrl : '.bin')

  const prepared = await forAssetPipeline(result.bytes, claimed)
  if (typeof prepared === 'string') {
    failures.push({ ...target, reason: prepared })
    continue
  }

  const directory = dirname(target.file)
  const name = filenameFor(target.url, prepared.extension)
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, name), prepared.bytes)

  // Replace the URL only where it appears as a reference, so a URL that is also
  // quoted in prose or in a link stays as the author wrote it.
  const body = readFileSync(target.file, 'utf8')
  const escaped = target.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const updated = segments(body)
    .map((part, index) =>
      isCode(index)
        ? part
        : part
            .replace(new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}`, 'g'), `$1./${name}`)
            .replace(new RegExp(`(^heroImage:\\s*["']?)${escaped}["']?`, 'm'), `$1./${name}"`),
    )
    .join('')
  writeFileSync(target.file, updated)

  vendored += 1
  console.log(`  ${bold(name)} ${dim('<-')} ${target.url}`)
}

if (!DRY_RUN) {
  const summary = `vendored ${count(vendored, 'file', 'files')}, failed ${count(failures.length, 'file', 'files')}`
  if (failures.length === 0) ok(summary)
  else warn(summary)
}

if (failures.length > 0) {
  const byReason = new Map<string, Failure[]>()
  for (const failure of failures) byReason.set(failure.reason, [...(byReason.get(failure.reason) ?? []), failure])
  for (const [reason, group] of byReason) {
    console.log(`\n${bold(reason)} ${dim(`(${group.length})`)}`)
    list(group.map((failure) => `${failure.url}  in ${failure.slug}`))
  }

  mkdirSync('.migration', { recursive: true })
  const lines = [
    '# Media that could not be vendored',
    '',
    `Written by \`scripts/vendor-media.ts\`. ${failures.length} remote files that did not answer, so the posts still`,
    'point at them and they will break whenever that host goes away for good.',
    '',
    'Fetch each one by hand, drop it in the post folder, and point the post at `./thefile.ext`.',
    'The link after each URL opens the post on the dev server.',
    '',
    ...failures.flatMap((failure) => [
      `- [ ] ${failure.url}`,
      `      ${failure.reason}, in [${failure.slug}](${SITE}/${failure.slug}/)`,
    ]),
    '',
  ]
  writeFileSync(REPORT, lines.join('\n'))
  console.log(`wrote ${REPORT}`)
}

// Never fail the build. A post that keeps a remote URL still renders; the report
// is the record of what to chase.
process.exit(0)
