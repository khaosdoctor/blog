/**
 * Post-build guard. The migration is the kind of thing that fails quietly, so
 * the build checks its own output instead of trusting it.
 *
 *   node scripts/check-output.ts
 *
 * Exits non-zero on anything that would ship broken content.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
// One post is one folder holding index.md(x) and its images, so the slug is the
// folder name. Anything else in content/blog (a stray note, a loose file) is not
// a post and is deliberately not checked.
const expected = readdirSync(CONTENT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => {
    const file = ['index.mdx', 'index.md'].map((name) => join(CONTENT, slug, name)).find(existsSync)
    if (file === undefined) return false
    return !/^draft:\s*true/m.test(readFileSync(file, 'utf8'))
  })
for (const slug of expected) {
  if (!files.includes(join(DIST, slug, 'index.html'))) {
    failures.push({ check: 'missing page', detail: slug })
  }
}

// 2. No Ghost markup survived the conversion.
// 3. No component tag leaked as literal text (a rule that never matched).
const GHOST_CLASS = /\bkg-[a-z-]+\b/
const LEAKED_TAG = /&#60;(?:Figure|Video|Bookmark|CourseCTA|RawEmbed|Sidenote|MarginNote|YouTube|Vimeo)\b/

const REMOTE_LOADER = /new Function\s*\(|gist\.githubusercontent|eval\s*\(\s*await/

/**
 * Every host this site is allowed to load or execute code from. The previous
 * Ghost site served an injected script for a month without anyone noticing, so
 * the question this answers is "did anything new appear", not "does it look
 * like last time". Adding a host here should be a deliberate, reviewed act.
 */
const ALLOWED_SCRIPT_HOSTS = new Set([
  'platform.twitter.com',
  'static.cloudflareinsights.com',
  // The YouTube and Vimeo facades only contact these once a reader clicks play.
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'i.ytimg.com',
  'player.vimeo.com',
  'vumbnail.com',
  'i.vimeocdn.com',
  'f.vimeocdn.com',
  'fresnel.vimeocdn.com',
  // astro-embed's YouTube facade preconnects to Google's ad network. Nothing
  // executes until a reader presses play, but the contact is real and it is not
  // a choice this site made. Removing it means replacing that component.
  'www.google.com',
  'googleads.g.doubleclick.net',
  'static.doubleclick.net',
])
const ALLOWED_FRAME_HOSTS = new Set(['cdn.embedly.com', 'www.youtube-nocookie.com', 'www.youtube.com', 'player.vimeo.com'])

function hostOf(url: string): string | null {
  if (url.startsWith('/') && !url.startsWith('//')) return null
  try {
    return new URL(url, 'https://blog.lsantos.dev').hostname
  } catch {
    return null
  }
}

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  if (GHOST_CLASS.test(html)) failures.push({ check: 'leftover Ghost class', detail: page })
  if (LEAKED_TAG.test(html)) failures.push({ check: 'unrendered component tag', detail: page })
  if (html.includes('__GHOST_URL__')) failures.push({ check: 'unresolved Ghost URL', detail: page })
  if (REMOTE_LOADER.test(html)) failures.push({ check: 'remote script loader in output', detail: page })

  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const host = hostOf(match[1])
    if (host !== null && !ALLOWED_SCRIPT_HOSTS.has(host)) {
      failures.push({ check: 'script from an unapproved host', detail: `${host} in ${page}` })
    }
  }

  for (const match of html.matchAll(/<iframe[^>]+src="([^"]+)"/g)) {
    const host = hostOf(match[1])
    if (host !== null && !ALLOWED_FRAME_HOSTS.has(host)) {
      failures.push({ check: 'iframe from an unapproved host', detail: `${host} in ${page}` })
    }
  }

  // Inline code that builds a script element pointing somewhere else. This is
  // how the injected loader worked, and how the Twitter widget legitimately
  // loads, so the host still has to be on the list. Scoped to script bodies:
  // posts link to .js files on GitHub as prose all the time.
  for (const block of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    // JSON-LD and other data blocks are not executable and are full of URLs.
    if (/type\s*=\s*"(?!module|text\/javascript)/.test(block[1])) continue
    for (const match of block[2].matchAll(/["'`](https?:\/\/[^"'`\s]+)["'`]/g)) {
      const host = hostOf(match[1])
      if (host !== null && !ALLOWED_SCRIPT_HOSTS.has(host)) {
        failures.push({ check: 'remote URL in inline script', detail: `${match[1]} in ${page}` })
      }
    }
  }
}

// 4. The feeds, the sitemap and the scheduler manifest all exist and parse.
for (const required of ['rss.xml', 'sitemap-index.xml', 'scheduled.json', '404.html', 'robots.txt']) {
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

// 4b. The manifest promised three icons that did not exist, so installing the
// app failed on a missing file. Every icon it names must be in the output.
// One manifest per locale now, so every one of them gets checked.
for (const manifestFile of files.filter((file) => file.endsWith('.webmanifest'))) {
  try {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { icons?: { src: string }[] }
    for (const icon of manifest.icons ?? []) {
      const path = join(DIST, icon.src.replace(/^\//, ''))
      if (!files.includes(path)) failures.push({ check: 'missing manifest icon', detail: icon.src })
    }
  } catch (error) {
    failures.push({ check: manifestFile, detail: `unparseable: ${(error as Error).message}` })
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
  warnings.push('no pagefind index in dist/, search will fall back to the plain form')
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
