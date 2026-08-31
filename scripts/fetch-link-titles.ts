/**
 * Reads the title of every external link in the posts and stores it, so a
 * hover preview can name the page it points at.
 *
 *   node scripts/fetch-link-titles.ts               # fetch what is missing
 *   node scripts/fetch-link-titles.ts --retry-failed # try the dead ones again
 *   node scripts/fetch-link-titles.ts --dry-run      # report only
 *
 * The browser cannot do this itself: reading another origin's <title> is what
 * CORS exists to stop. So it happens here and ships as data.
 *
 * Runs as part of `prebuild`, and after the first run there is nothing left to
 * fetch. A URL that never answers is written back as null and skipped from then
 * on, which is what keeps the step a no-op rather than 200 timeouts per build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { bold, count, dim, heading, list, ok, postFiles, warn } from './lib/cli.ts'

const CONTENT_DIR = 'content/blog'
const CACHE = 'content/link-titles.json'
const CONCURRENCY = 8
const TIMEOUT = 10_000
const DESCRIPTION_MAX = 200
const REFRESH_HOPS = 3
const DRY_RUN = process.argv.includes('--dry-run')
const RETRY_FAILED = process.argv.includes('--retry-failed')

// Sent because a bare fetch is refused outright by a good number of these hosts.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

interface Meta {
  title: string
  description?: string
  publisher?: string
}

type Cache = Record<string, Meta | null>

/** Markdown link targets only: an image is never previewed, and neither is a bare mention. */
function linksIn(body: string): string[] {
  const found: string[] = []
  for (const match of body.matchAll(/(!?)\]\((https?:\/\/[^)\s]+)/g)) {
    if (match[1] === '!') continue
    found.push(match[2].replace(/[.,;:]+$/, ''))
  }
  return found
}

function collect(): string[] {
  const urls = new Set<string>()
  for (const file of postFiles(CONTENT_DIR)) {
    for (const url of linksIn(readFileSync(file, 'utf8'))) urls.add(url)
  }
  return [...urls].sort()
}

function readCache(): Cache {
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8')) as Cache
  } catch {
    return {}
  }
}

function decode(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLowerCase()] ?? whole)
}

// Decoded twice: GitHub and X both write &amp;amp; into a meta tag, so one pass
// leaves the reader looking at &amp; where the title said &.
function clean(text: string | undefined): string {
  return text === undefined ? '' : decode(decode(text)).replace(/\s+/g, ' ').trim()
}

/** A meta tag writes its two attributes in either order, so both arrangements are tried. */
function metaContent(html: string, key: string): string {
  const attribute = key.startsWith('og:') ? 'property' : 'name'
  const quoted = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const forward = new RegExp(`<meta[^>]+${attribute}=["']${quoted}["'][^>]*content=["']([^"']*)["']`, 'i')
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attribute}=["']${quoted}["']`, 'i')
  return clean(forward.exec(html)?.[1] ?? reverse.exec(html)?.[1])
}

/**
 * Where a shortener sends the reader, when it does so without a 3xx. t.co
 * answers 200 with a script that replaces the location and a <noscript> refresh
 * beside it, so `redirect: 'follow'` never sees a hop to follow.
 */
function refreshTarget(html: string, from: string): string | null {
  const head = html.slice(0, 4000)
  const meta = /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"';]+)/i.exec(head)
  const script = /location\.replace\(\s*["']([^"']+)["']/i.exec(head)
  const target = clean(meta?.[1] ?? script?.[1]).replace(/\\\//g, '/')
  if (target === '') return null
  try {
    const resolved = new URL(target, from).href
    return resolved === from ? null : resolved
  } catch {
    return null
  }
}

function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/.test(text)
}

function parse(html: string): Meta | null {
  const title = metaContent(html, 'og:title') || clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1])
  // A page that titles itself with its own address has told us nothing.
  if (title === '' || isUrl(title)) return null

  const description = metaContent(html, 'og:description') || metaContent(html, 'description')
  const publisher = metaContent(html, 'og:site_name')

  const meta: Meta = { title }
  if (description !== '') {
    meta.description =
      description.length > DESCRIPTION_MAX ? `${description.slice(0, DESCRIPTION_MAX).trimEnd()}…` : description
  }
  if (publisher !== '' && publisher !== title) meta.publisher = publisher
  return meta
}

async function fetchMeta(url: string, hops = 0): Promise<Meta | null> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!response.ok) return null
    if (!(response.headers.get('content-type') ?? '').includes('html')) return null

    const html = await response.text()
    const next = hops < REFRESH_HOPS ? refreshTarget(html, response.url || url) : null
    return next === null ? parse(html) : await fetchMeta(next, hops + 1)
  } catch {
    return null
  }
}

async function run(urls: string[], cache: Cache): Promise<void> {
  let done = 0
  const queue = [...urls]

  async function worker(): Promise<void> {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      cache[url] = await fetchMeta(url)
      done += 1
      if (done % 25 === 0) console.log(dim(`  ${done}/${urls.length}`))
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

heading('fetch-link-titles: reading the titles behind the external links')

const urls = collect()
const cache = readCache()
const missing = urls.filter((url) => (RETRY_FAILED ? cache[url] == null : !(url in cache)))

console.log(`${bold(String(urls.length))} external links, ${count(missing.length, 'title', 'titles')} to fetch`)

if (missing.length === 0) {
  ok('every link already has a title')
} else if (DRY_RUN) {
  list(missing)
} else {
  await run(missing, cache)

  // A link dropped from a post keeps no entry: the file is a cache of what the
  // posts point at now, not a history of what they once did.
  const live = new Set(urls)
  const kept = Object.fromEntries(Object.entries(cache).filter(([url]) => live.has(url)))
  const sorted = Object.fromEntries(
    Object.keys(kept)
      .sort()
      .map((url) => [url, kept[url]]),
  )
  writeFileSync(CACHE, `${JSON.stringify(sorted, null, 2)}\n`)

  const dead = Object.entries(sorted).filter(([, meta]) => meta === null)
  ok(`${count(Object.keys(sorted).length - dead.length, 'title', 'titles')} stored in ${CACHE}`)
  if (dead.length > 0) {
    warn(`${count(dead.length, 'link', 'links')} answered with nothing; run with --retry-failed to try again`)
    list(dead.map(([url]) => url))
  }
}
