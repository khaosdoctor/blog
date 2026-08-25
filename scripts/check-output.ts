/**
 * Post-build guard. The migration is the kind of thing that fails quietly, so
 * the build checks its own output instead of trusting it.
 *
 *   node scripts/check-output.ts
 *
 * Exits non-zero on anything that would ship broken content.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { FRAME_HOSTS, MENTIONABLE_HOSTS, SCRIPT_HOSTS } from '../src/lib/embed-hosts.ts'
import { count, frontmatterOf, heading, postIndex, reportFailures, warn, walkFiles, type Failure } from './lib/cli.ts'
import { MDX_COMPONENT_PATTERN, RETIRED_COMPONENT_PATTERN } from '../src/lib/mdx-component-names.ts'
import { urlFor } from '../src/lib/post-dates.mjs'

const DIST = 'dist'
const CONTENT = 'content/blog'

// The file each failure is annotated against. A dist page or a manifest file is
// exact; a content slug falls back to its source post so the annotation still
// points somewhere a human can act on it.
const failures: Failure[] = []
const warnings: string[] = []

heading('check-output: verifying the build output')

function indexFileOf(slug: string): string | undefined {
  return postIndex(join(CONTENT, slug))
}

function contentFileFor(slug: string): string {
  return indexFileOf(slug) ?? join(CONTENT, slug)
}

const files = walkFiles(DIST)
const pages = files.filter((file) => file.endsWith('.html'))

// Read the scheduler manifest first: it is the build's own record of which posts
// it held back, and check 1 is stated in terms of it. This script runs in a
// separate process once the build has exited, so asking the clock here would be a
// second opinion on the cutoff, which is the disagreement being checked for.
const manifestPath = join(DIST, 'scheduled.json')
const scheduled = new Set<string>()
if (files.includes(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      posts?: { slug?: string }[]
    }
    if (!Array.isArray(manifest.posts)) {
      failures.push({ check: 'scheduled.json', detail: 'posts is not an array', file: manifestPath })
    }
    for (const post of manifest.posts ?? []) {
      if (typeof post.slug === 'string') scheduled.add(post.slug)
    }
  } catch (error) {
    failures.push({ check: 'scheduled.json', detail: `unparseable: ${(error as Error).message}`, file: manifestPath })
  }
}

// 1. Every non-draft post is either on the site or waiting in the manifest, and
// never both or neither. The two conditions come from one instant in one build,
// so a post that is in both states, or in neither, means they came apart.
// One post is one folder holding index.md(x) and its images, so the slug is the
// folder name. Anything else in content/blog (a stray note, a loose file) is not
// a post and is deliberately not checked.
const postSources = new Map<string, { file: string; source: string }>()
for (const entry of readdirSync(CONTENT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const file = indexFileOf(entry.name)
  if (file === undefined) continue
  const source = readFileSync(file, 'utf8')
  if (/^draft:\s*true/m.test(source)) continue
  postSources.set(entry.name, { file, source })
}
const postFolders = [...postSources.keys()]
const expected = postFolders.filter((slug) => !scheduled.has(slug))

/**
 * Where a folder's own index actually renders. Almost always `/<folder>/`, but a
 * folder whose index is English resolves to `/en/<slug>/` instead: twelve drafts are
 * already in that shape, and publishing one used to fail this check for a page
 * that had built perfectly well. Same rule as everywhere else, imported rather
 * than restated.
 */
function pageFor(slug: string, post: { file: string; source: string }): string {
  const url = urlFor(slug, post.file.endsWith('.md') ? 'index.md' : 'index.mdx', frontmatterOf(post.source))
  return join(DIST, url.replace(/^\/|\/$/g, ''), 'index.html')
}

for (const [slug, post] of postSources) {
  const hasPage = files.includes(pageFor(slug, post))
  if (scheduled.has(slug) && hasPage) {
    failures.push({ check: 'post both published and still scheduled', detail: slug, file: contentFileFor(slug) })
    continue
  }
  if (!scheduled.has(slug) && !hasPage) {
    failures.push({ check: 'missing page', detail: slug, file: contentFileFor(slug) })
  }
}

// 2. No Ghost markup survived the conversion.
// 3. No component tag leaked as literal text (a rule that never matched).
const GHOST_CLASS = /\bkg-[a-z-]+\b/
const LEAKED_TAG = new RegExp(`&#60;(?:${MDX_COMPONENT_PATTERN}|${RETIRED_COMPONENT_PATTERN})\\b`)

const REMOTE_LOADER = /new Function\s*\(|gist\.githubusercontent|eval\s*\(\s*await/

/**
 * Both lists come from src/lib/embed-hosts.ts, the same registry the CSP meta tag
 * is built from, so a host can never be approved by one and blocked by the other.
 * The previous Ghost site served an injected script for a month without anyone
 * noticing, so the question these answer is "did anything new appear", not "does
 * it look like last time".
 */
const ALLOWED_SCRIPT_HOSTS = new Set(SCRIPT_HOSTS)
const ALLOWED_FRAME_HOSTS = new Set(FRAME_HOSTS)
/** A URL may be *named* by more hosts than may execute: thumbnails, preconnects. */
const ALLOWED_MENTIONS = new Set(MENTIONABLE_HOSTS)
const REGISTRY = 'src/lib/embed-hosts.ts'

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
  if (GHOST_CLASS.test(html)) failures.push({ check: 'leftover Ghost class', detail: page, file: page })
  if (LEAKED_TAG.test(html)) failures.push({ check: 'unrendered component tag', detail: page, file: page })
  if (html.includes('__GHOST_URL__')) failures.push({ check: 'unresolved Ghost URL', detail: page, file: page })
  if (REMOTE_LOADER.test(html)) failures.push({ check: 'remote script loader in output', detail: page, file: page })

  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const host = hostOf(match[1])
    if (host !== null && !ALLOWED_SCRIPT_HOSTS.has(host)) {
      failures.push({
        check: 'script from an unapproved host',
        detail: `${host} in ${page}. If this is yours, add it to ${REGISTRY}`,
        file: page,
      })
    }
  }

  for (const match of html.matchAll(/<iframe[^>]+src="([^"]+)"/g)) {
    const host = hostOf(match[1])
    if (host !== null && !ALLOWED_FRAME_HOSTS.has(host)) {
      failures.push({
        check: 'iframe from an unapproved host',
        detail: `${host} in ${page}. If this is yours, add it to ${REGISTRY} as a frame host`,
        file: page,
      })
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
      if (host !== null && !ALLOWED_MENTIONS.has(host)) {
        failures.push({
          check: 'remote URL in inline script',
          detail: `${match[1]} in ${page}. If this is yours, add it to ${REGISTRY}`,
          file: page,
        })
      }
    }
  }
}

// 4. The feeds, the sitemap and the scheduler manifest all exist. The manifest is
// also parsed, at the top, because check 1 is written against it.
for (const required of ['rss.xml', 'sitemap-index.xml', 'scheduled.json', '404.html', 'robots.txt']) {
  if (!files.includes(join(DIST, required))) {
    failures.push({ check: 'missing artifact', detail: required, file: join(DIST, required) })
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
      if (!files.includes(path)) failures.push({ check: 'missing manifest icon', detail: icon.src, file: manifestFile })
    }
  } catch (error) {
    failures.push({ check: manifestFile, detail: `unparseable: ${(error as Error).message}`, file: manifestFile })
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
for (const image of missingImages) failures.push({ check: 'missing built image', detail: image, file: join(DIST, image) })

// 6. Pagefind ran. Not fatal on its own, but the search page is dead without it.
if (!files.some((file) => file.startsWith(join(DIST, 'pagefind')))) {
  warnings.push('no pagefind index in dist/, search will fall back to the plain form')
}

// 7. Nothing enormous slipped into the output.
for (const file of files) {
  const size = statSync(file).size
  if (size > 8 * 1024 * 1024) warnings.push(`${file} is ${(size / 1024 / 1024).toFixed(1)}MB`)
}

console.log(
  `checked ${count(pages.length, 'page', 'pages')}, ${count(expected.length, 'published post', 'published posts')}, ${scheduled.size} scheduled`,
)
for (const warning of warnings) warn(warning)

reportFailures(failures, 'output looks clean')
