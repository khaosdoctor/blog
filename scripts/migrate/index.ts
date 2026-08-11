/**
 * Ghost export -> MDX in content/blog/.
 *
 * Reads the admin JSON export (never the live site), converts each post's
 * RENDERED html to markdown, colocates its images next to it, and writes
 * frontmatter that matches src/content.config.ts.
 *
 *   node scripts/migrate/index.ts [--export path] [--assets path] [--out path] [--limit n] [--only slug]
 *
 * Idempotent: it overwrites its own output. It never touches the Ghost VM.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { homedir } from 'node:os'
import TurndownService from 'turndown'
// @ts-expect-error the gfm plugin ships no types
import { gfm } from 'turndown-plugin-gfm'
import { addCardRules, addFootnoteRules, addMathRule, addTableRule } from './cards.ts'

const GHOST_URL = 'https://blog.lsantos.dev'
const ASSETS_REPO_RAW = 'https://raw.githubusercontent.com/khaosdoctor/blog-assets/master/'

type Args = { export: string; assets: string; out: string; limit: number; only: string | null; report: string }

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (name: string): string | null => {
    const index = argv.indexOf(`--${name}`)
    if (index === -1) return null
    return argv[index + 1] ?? null
  }
  return {
    export: get('export') ?? join(homedir(), 'ghost-backups', 'lucas-santos.ghost.2026-08-07-21-28-06.json'),
    assets: get('assets') ?? join(homedir(), 'ghost-backups', 'blog-assets'),
    out: get('out') ?? 'content/blog',
    report: get('report') ?? '.migration',
    limit: Number(get('limit') ?? '0'),
    only: get('only'),
  }
}

type Post = {
  id: string
  slug: string
  title: string
  status: string
  type: string
  html: string | null
  plaintext: string | null
  custom_excerpt: string | null
  feature_image: string | null
  published_at: string | null
  updated_at: string
  visibility: string
  canonical_url: string | null
}

type Meta = {
  post_id: string
  meta_title: string | null
  meta_description: string | null
  feature_image_alt: string | null
  feature_image_caption: string | null
  email_only: unknown
}

/** Old primary tag -> the section it becomes. Everything else stays a tag. */
const CATEGORY_OF: Record<string, string> = {
  typescript: 'typescript',
  ecmascript: 'typescript',
  javascript: 'javascript',
  nodejs: 'javascript',
  deno: 'javascript',
  kubernetes: 'infra',
  docker: 'infra',
  containers: 'infra',
  containerd: 'infra',
  helm: 'infra',
  aks: 'infra',
  azure: 'infra',
  cloud: 'infra',
  grpc: 'infra',
  cryptography: 'security',
  security: 'security',
  career: 'career',
  opinion: 'career',
  '#newsletter': 'newsletter',
  'backlog-newsletter': 'newsletter',
  blog: 'meta',
  github: 'meta',
  events: 'meta',
  podcasts: 'meta',
  video: 'meta',
}

/**
 * Posts created by whoever compromised the Ghost install on 2026-07-30: eleven
 * empty posts titled "S", "V" and "SYSINFO-blog.lsantos.dev", published between
 * 13:06 and 15:47 UTC. They are attacker markers, not content, and one of them
 * was appearing in the RSS feed of the new site.
 *
 * Note the migration never reads `codeinjection_head`/`codeinjection_foot`, so
 * the loader script that the same intruder appended to all 247 real posts on
 * 2026-07-16 does not come across. That is checked, not assumed: see the
 * codeinjection guard below.
 */
const COMPROMISED_SLUGS = new Set([
  'rce',
  'rce-2',
  'rce-3',
  'rce-4',
  'rce-5',
  'rce-6',
  'rce-7',
  'rce-8',
  'rce-9',
  'rce-10',
  'sysinfo-e522dabe',
])

const args = parseArgs()
const raw = JSON.parse(readFileSync(args.export, 'utf8'))
const data = raw.db?.[0]?.data ?? raw.data
const posts: Post[] = data.posts
const tags: { id: string; name: string; slug: string }[] = data.tags
const postsTags: { post_id: string; tag_id: string; sort_order: number }[] = data.posts_tags
const metaById = new Map<string, Meta>((data.posts_meta ?? []).map((meta: Meta) => [meta.post_id, meta]))

const tagById = new Map(tags.map((tag) => [tag.id, tag]))
const tagsByPost = new Map<string, string[]>()
for (const link of [...postsTags].sort((a, b) => a.sort_order - b.sort_order)) {
  const tag = tagById.get(link.tag_id)
  if (tag === undefined) continue
  const current = tagsByPost.get(link.post_id) ?? []
  current.push(tag.name)
  tagsByPost.set(link.post_id, current)
}

// ------------------------------------------------------------------ series map

const SERIES_TITLE = /^(?<base>.+?)[\s—–-]+(?:parte|part|pt\.?)\s*(?<n>\d+)\s*$/i
const seriesGroups = new Map<string, { slug: string; order: number }[]>()
for (const post of posts) {
  if (post.type !== 'post') continue
  const match = SERIES_TITLE.exec(post.title)
  if (match?.groups === undefined) continue
  const base = match.groups.base.trim()
  const current = seriesGroups.get(base) ?? []
  current.push({ slug: post.slug, order: Number(match.groups.n) })
  seriesGroups.set(base, current)
}
const seriesBySlug = new Map<string, { name: string; order: number }>()
for (const [base, members] of seriesGroups) {
  if (members.length < 2) continue
  for (const member of members) seriesBySlug.set(member.slug, { name: base, order: member.order })
}

// ----------------------------------------------------------------- yaml output

function yamlString(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')
  return `"${escaped}"`
}

function frontmatter(fields: [string, string | null][]): string {
  const lines = fields.filter((field): field is [string, string] => field[1] !== null).map(([key, value]) => `${key}: ${value}`)
  return `---\n${lines.join('\n')}\n---\n`
}

// --------------------------------------------------------------------- assets

/**
 * Keyed by the path Ghost puts in the URL (`2020/11/foo.jpg`), NOT by filename:
 * blog-assets has 1617 files under only 615 distinct names, so a filename-only
 * index would silently copy the wrong image into ~194 posts.
 */
const assetIndex = new Map<string, string>()
const assetsByName = new Map<string, string[]>()

function indexAssets(root: string): void {
  if (!existsSync(root)) return
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop() as string
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      const key = full.slice(root.length + 1)
      assetIndex.set(key, full)
      const sameName = assetsByName.get(entry.name) ?? []
      sameName.push(full)
      assetsByName.set(entry.name, sameName)
    }
  }
}

indexAssets(join(args.assets, 'images'))
// The VM-only leftovers (3 mp4s, their posters, one stray image) come from the
// pre-migration content tar, extracted next to the export. Indexed the same
// way as the primary root, one call per images/media subfolder, so the keys
// stay bare (`2023/12/foo.mp4`) and line up with what assetKey() produces.
indexAssets(join(homedir(), 'ghost-backups', 'vm-content', 'images'))
indexAssets(join(homedir(), 'ghost-backups', 'vm-content', 'media'))

const missingAssets = new Set<string>()

/**
 * Animated GIFs are the worst thing in the corpus: one screen recording is
 * 19MB, and neither webp nor avif meaningfully compresses an animation, so
 * astro:assets just re-encodes it at the same size. ffmpeg turns it into a
 * silent looping mp4 at roughly 1% of the bytes, which is what a reader on a
 * phone actually wants. Falls back to shipping the GIF untouched when ffmpeg
 * is missing.
 */
const GIF_MIN_BYTES = 256 * 1024
const gifConversions = new Map<string, string | null>()

function gifToMp4(source: string): string | null {
  const cached = gifConversions.get(source)
  if (cached !== undefined) return cached
  if (statSync(source).size < GIF_MIN_BYTES) {
    gifConversions.set(source, null)
    return null
  }
  const target = source.replace(/\.gif$/i, '.mp4')
  if (existsSync(target)) {
    gifConversions.set(source, target)
    return target
  }
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      source,
      '-movflags',
      'faststart',
      '-pix_fmt',
      'yuv420p',
      // h264 needs even dimensions.
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-an',
      target,
    ],
    { stdio: 'ignore' },
  )
  if (result.status !== 0) {
    gifConversions.set(source, null)
    return null
  }
  gifConversions.set(source, target)
  return target
}

// ------------------------------------------------------- remote image mirroring

/**
 * Images hosted somewhere else (mostly Unsplash hero shots) are mirrored once
 * into a local cache so the posts keep working when those URLs eventually rot,
 * and so astro:assets can optimise them like every other image. Cached on disk,
 * so re-running the migration does no network work.
 */
const REMOTE_CACHE = join(homedir(), 'ghost-backups', 'remote-assets')
const IMAGE_HOSTS = /(?:images\.unsplash\.com|i\.imgur\.com|pbs\.twimg\.com|user-images\.githubusercontent\.com|raw\.githubusercontent\.com|opengraph\.githubassets\.com|img\.youtube\.com|i\.ytimg\.com)$/
const MAX_REMOTE_BYTES = 12 * 1024 * 1024
const remoteFiles = new Map<string, string>()

function isMirrorableImage(url: string): boolean {
  if (!url.startsWith('https://')) return false
  if (url.startsWith(ASSETS_REPO_RAW)) return false
  try {
    return IMAGE_HOSTS.test(new URL(url).host)
  } catch {
    return false
  }
}

function extensionFor(url: string, contentType: string): string {
  const fromPath = extname(new URL(url).pathname)
  if (/^\.(?:png|jpe?g|gif|webp|avif|svg)$/i.test(fromPath)) return fromPath.toLowerCase()
  const subtype = /image\/([a-z0-9+]+)/.exec(contentType)?.[1] ?? 'jpg'
  if (subtype === 'jpeg') return '.jpg'
  if (subtype === 'svg+xml') return '.svg'
  return `.${subtype}`
}

function cacheNameFor(url: string, extension: string): string {
  const slugPart = basename(new URL(url).pathname).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60)
  const digest = createHash('sha1').update(url).digest('hex').slice(0, 8)
  const stem = slugPart.length === 0 ? 'image' : slugPart
  return `${stem}-${digest}${extension}`
}

async function mirrorRemoteImage(url: string): Promise<void> {
  if (remoteFiles.has(url)) return
  const existingGuess = readdirSync(REMOTE_CACHE).find((name) => name.includes(createHash('sha1').update(url).digest('hex').slice(0, 8)))
  if (existingGuess !== undefined) {
    remoteFiles.set(url, join(REMOTE_CACHE, existingGuess))
    return
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' })
  if (!response.ok) {
    missingAssets.add(`${url} (HTTP ${response.status})`)
    return
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    missingAssets.add(`${url} (not an image: ${contentType})`)
    return
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > MAX_REMOTE_BYTES) {
    missingAssets.add(`${url} (too large: ${bytes.byteLength} bytes)`)
    return
  }
  const target = join(REMOTE_CACHE, cacheNameFor(url, extensionFor(url, contentType)))
  writeFileSync(target, bytes)
  remoteFiles.set(url, target)
}

// --------------------------------------------------------------- link shorteners

/**
 * bit.ly links are expanded to their real targets once, at migration time.
 * They resolve today, but a shortener is a single point of failure for 99 links
 * and it puts a tracker between the reader and the destination. Resolved with
 * redirect: 'manual' so we read the Location header without ever loading the
 * target, and cached on disk so re-runs do no network work.
 *
 * Only bit.ly. aka.ms and amzn.to are left alone: the first is Microsoft's own
 * and stable, the second is an affiliate link where the redirect IS the point.
 */
const BITLY_CACHE = join(homedir(), 'ghost-backups', 'bitly-cache.json')
const bitlyMap = new Map<string, string>(
  existsSync(BITLY_CACHE) ? Object.entries(JSON.parse(readFileSync(BITLY_CACHE, 'utf8')) as Record<string, string>) : [],
)

async function resolveShortLink(url: string): Promise<void> {
  if (bitlyMap.has(url)) return
  const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const location = response.headers.get('location')
  if (location === null || !/^https?:\/\//.test(location)) return
  // One hop only. A shortener pointing at another shortener is a rabbit hole,
  // and the first hop is what the reader was going to follow anyway.
  bitlyMap.set(url, location.split('?utm_')[0])
}

// ------------------------------------------------------------------ conversion

function normalizeHtml(html: string): string {
  const expanded = [...bitlyMap.entries()].reduce(
    (current, [short, target]) => current.replaceAll(short, target),
    html,
  )
  return expanded
    .replaceAll('__GHOST_URL__', GHOST_URL)
    .replaceAll('src="/content/', `src="${GHOST_URL}/content/`)
    .replaceAll('href="/content/', `href="${GHOST_URL}/content/`)
}

/**
 * The page template already prints the title as the only h1, so the body's
 * first heading level needs to land on h2, whatever level Ghost happened to
 * start it at. Most bodies start at h1 (208 of them) and just shift down one
 * level, but some (e.g. the "ls-news" newsletter template) never use an h1
 * and start straight at h3/h4 with nothing above it, which would otherwise
 * skip h2 entirely. Shifting by the same, uniform amount preserves whatever
 * nesting the body already has; it does not fix skips that exist within the
 * body itself (e.g. h2 straight to h4 with no h3), that's a content issue.
 */
function demoteHeadings(html: string): string {
  // The level to shift from is whatever heading comes first in reading
  // order, not the lowest level anywhere in the body: a stray, mis-tagged
  // heading further down (an authoring mistake, e.g. one <h1> used mid-body
  // as a section divider in an otherwise h2/h3 document) must not throw off
  // the shift for the whole post.
  const first = /<h([1-6])[\s>]/i.exec(html)
  if (first === null) return html
  const shift = 2 - Number(first[1])
  if (shift === 0) return html
  const order = shift > 0 ? [6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6]
  return order.reduce((current, level) => {
    const target = level + shift
    if (target < 1 || target > 6) return current
    return current.replace(new RegExp(`<(/?)h${level}([\\s>])`, 'gi'), `<$1h${target}$2`)
  }, html)
}

/**
 * Internal links become root-relative so they survive any domain change, and
 * get the trailing slash the site's routing requires. Ghost served both
 * `/post` and `/post/`; Astro only serves the second, so a link written without
 * the slash would 404 on the new site even though it worked on the old one.
 */
function normalizeLinks(markdown: string): string {
  const withKnownFixes = markdown
    .replaceAll(`${GHOST_URL}/`, '/')
    // Ghost's membership signup page does not exist here. Keep the sentence,
    // drop the dead link. Covers bare /signup and /signup with a UTM query string.
    .replace(/\[([^\]]*)\]\(\/signup(?:\?[^)]*)?\/?\)/g, '$1')
    // Ghost served tag archives at /tag/<slug>/; this site uses /tags/<slug>/.
    .replace(/\]\(\/tag\/([^)]+?)\/?\)/g, '](/tags/$1/)')
    .replace(/\]\(\/rss\/?\)/g, '](/rss.xml)')
    // Ghost preview links (/p/<uuid>/), the admin editor, and the old donations
    // page are all gone.
    .replace(/\[([^\]]*)\]\(\/p\/[0-9a-f-]{36}\/?\)/gi, '$1')
    .replace(/\[([^\]]*)\]\(\/ghost\/[^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\(\/doacoes\/?\)/g, '$1')
    // A link written as "example.com/thing" with no scheme resolves against the
    // current post and 404s. It is always meant to be external.
    .replace(/\]\((?!https?:|\/|#|mailto:)([a-z0-9-]+(?:\.[a-z]{2,})+[^)\s]*)\)/gi, '](https://$1)')
    .replace(/\]\((\/[^)\s]*)\)/g, (_full, path: string) => {
      // Leave anchors, files with an extension, and already-slashed paths alone.
      if (path.includes('#') || path.includes('?')) return `](${path})`
      if (/\.[a-z0-9]{2,5}$/i.test(path)) return `](${path})`
      if (path.endsWith('/')) return `](${path})`
      return `](${path}/)`
    })
  // The rule above promotes a bare domain with no scheme (e.g. a link written
  // as "blog.lsantos.dev/x" instead of a proper relative path, a recurring
  // Ghost editor slip) into an absolute https URL. When that domain is this
  // site's own, collapse it back to root-relative like every other internal
  // link, same as the very first replace in this chain.
  const rooted = withKnownFixes.replaceAll(`${GHOST_URL}/`, '/')
  // A handful of one-off authoring mistakes in the export point at posts that
  // don't exist, or don't exist under that slug, on the new site. Keep the
  // sentence, drop or correct the dead link.
  return rooted
    .replace(/\[([^\]]*)\]\(\/key-exchange\/?\)/g, '$1')
    .replace(/\[([^\]]*)\]\(\/diffie-helman-key-exchange\/?\)/g, '$1')
    .replace(/\(\/novos-metodos-set\/?\)/g, '(/ecma-2024-sets/)')
    .replace(/\(\/noticias-semanais-3\/hipsters\.tech\)/g, '(/hipsters-tech-212/)')
}

/** `.../images/2020/11/foo.jpg` -> `2020/11/foo.jpg`, dropping Ghost size variants. */
function assetKey(url: string): string {
  const clean = decodeURIComponent(url.split('?')[0].split('#')[0])
  const afterImages = /\/(?:images|media)\/(.+)$/.exec(clean)
  const path = afterImages === null ? basename(clean) : afterImages[1]
  return path.replace(/^size\/[a-z]\d+\//, '')
}

/**
 * Videos cannot go through astro:assets (it only handles images), so a
 * post-relative `./slug/clip.mp4` would resolve against the post's own URL and
 * 404. They are copied into public/ instead and referenced by absolute path,
 * which is what a plain <video src> needs.
 */
const PUBLIC_VIDEO_DIR = join('public', 'videos')

function publishVideo(slug: string, source: string): string {
  const dir = join(PUBLIC_VIDEO_DIR, slug)
  mkdirSync(dir, { recursive: true })
  const name = basename(source)
  copyFileSync(source, join(dir, name))
  return `/videos/${slug}/${name}`
}

function makeResolver(slug: string, copied: Map<string, string>, note: (message: string) => void) {
  return (url: string): string => {
    if (url.length === 0) return url
    const mirrored = remoteFiles.get(url)
    if (mirrored !== undefined) {
      const name = basename(mirrored)
      copied.set(mirrored, name)
      return `./${slug}/${name}`
    }
    const local = url.startsWith(ASSETS_REPO_RAW) || url.startsWith(`${GHOST_URL}/content/`)
    if (!local) return url
    const key = assetKey(url)
    const name = basename(key)
    const exact = assetIndex.get(key)
    if (exact !== undefined) {
      const mp4 = /\.gif$/i.test(exact) ? gifToMp4(exact) : null
      if (mp4 !== null) {
        note(`animated GIF converted to mp4: ${name}`)
        return publishVideo(slug, mp4)
      }
      if (/\.(?:mp4|webm|mov)$/i.test(exact)) return publishVideo(slug, exact)
      copied.set(exact, name)
      return `./${slug}/${name}`
    }
    // No exact path hit: only fall back to a filename match when it is unambiguous.
    const candidates = assetsByName.get(name) ?? []
    if (candidates.length === 1) {
      note(`asset matched by filename, not path: ${url}`)
      if (/\.(?:mp4|webm|mov)$/i.test(candidates[0])) return publishVideo(slug, candidates[0])
      copied.set(candidates[0], name)
      return `./${slug}/${name}`
    }
    missingAssets.add(url)
    if (candidates.length > 1) note(`AMBIGUOUS asset (${candidates.length} files named ${name}): ${url}`)
    return url
  }
}

const COMPONENT_TAGS =
  'Figure|Video|Epigraph|CourseCTA|Bookmark|YouTube|Vimeo|RawEmbed|Sidenote|MarginNote|br|kbd|sup|sub|abbr|mark|small'

/**
 * MDX reads `{` as the start of an expression and `<` as the start of a tag, so
 * prose containing either has to be escaped. Three things must survive
 * untouched: fenced code, real inline code spans, and the component tags this
 * migration emits.
 *
 * Two traps the naive version fell into, both found by compiling all 246 posts:
 * turndown backslash-escapes backticks in prose (`\`import {\``), so a
 * "code span" delimited by escaped backticks is really prose and its braces
 * DO need escaping; and a stray `<` with no closing `>` on the line (Ghost had
 * one post starting a paragraph with "<as") still opens a JSX tag.
 */
function escapeMdxOutsideCode(markdown: string): string {
  const token = new RegExp(
    [
      '```[\\s\\S]*?```', // fenced code
      '(?<!\\\\)`[^`\\n]*(?<!\\\\)`', // inline code, real backticks only
      `</?(?:${COMPONENT_TAGS})\\b(?:"[^"]*"|'[^']*'|[^>])*/?>`, // our own tags
    ].join('|'),
    'g',
  )

  const out: string[] = []
  let cursor = 0
  for (const match of markdown.matchAll(token)) {
    out.push(escapeProse(markdown.slice(cursor, match.index)))
    out.push(match[0])
    cursor = match.index + match[0].length
  }
  out.push(escapeProse(markdown.slice(cursor)))
  return out.join('')
}

function escapeProse(text: string): string {
  return text.replace(/[{}<]/g, (character) => `\\${character}`)
}

/**
 * `<Figure src="./slug/name.png">` only ever gets a real srcset out of
 * astro:assets if `src` is an imported ImageMetadata, not a runtime-resolved
 * string (see src/components/Figure.astro). Rewrites every local Figure src
 * into a static top-of-file `import`, reusing one identifier per unique
 * path, and marks the first one `priority` since it is the post's first
 * image. Remote `<Figure src="https://...">` tags are untouched.
 */
function hoistFigureImages(body: string): string {
  const imports: string[] = []
  const identifiers = new Map<string, string>()
  let firstSeen = false
  const withImports = body.replace(/<Figure src="(\.\/[^"]+)"/g, (_match, src: string) => {
    const existing = identifiers.get(src)
    const identifier = existing ?? `figureImage${identifiers.size + 1}`
    if (existing === undefined) {
      identifiers.set(src, identifier)
      imports.push(`import ${identifier} from '${src}'`)
    }
    const priorityAttr = firstSeen ? '' : ' priority'
    firstSeen = true
    return `<Figure src={${identifier}}${priorityAttr}`
  })
  if (imports.length === 0) return withImports
  return `${imports.join('\n')}\n\n${withImports}`
}

function describe(post: Post, meta: Meta | undefined): string {
  const excerpt = post.custom_excerpt?.trim() ?? ''
  if (excerpt.length > 0) return excerpt
  const metaDescription = meta?.meta_description?.trim() ?? ''
  if (metaDescription.length > 0) return metaDescription
  const plain = (post.plaintext ?? '').replace(/\s+/g, ' ').trim()
  if (plain.length === 0) return post.title
  const sentence = /^(.{40,200}?[.!?])\s/.exec(plain)
  if (sentence !== null) return sentence[1]
  const slice = plain.slice(0, 157)
  const boundary = slice.lastIndexOf(' ')
  const text = boundary === -1 ? slice : slice.slice(0, boundary)
  return text.length < plain.length ? `${text}...` : text
}

/**
 * Two passes: a substantive tag (typescript/javascript/infra/security/...)
 * wins even if a "meta" tag (video/github/podcasts/events/blog) comes first in
 * Ghost's tag order. Only falls back to meta when nothing else matched.
 */
/**
 * The newsletter split, per Lucas.
 *
 * Two very different things were both tagged as newsletter. The 12 posts tagged
 * `backlog-newsletter` are real essays (median 2465 words: his first computer,
 * first languages, 29 years of JavaScript, the Vim piece). The other 48 are
 * `#newsletter` link roundups (median 726 words: ls-news, noticias-semanais,
 * giro-de-noticias). The essays become ordinary posts filed under their real
 * subject; the roundups stay drafts for him to go through later.
 */
function isBacklogEssay(postTags: string[]): boolean {
  return postTags.some((tag) => tag.toLowerCase() === 'backlog-newsletter')
}

function isNewsletterRoundup(postTags: string[]): boolean {
  const lower = postTags.map((tag) => tag.toLowerCase())
  return lower.includes('#newsletter') && !lower.includes('backlog-newsletter')
}

function categoryFor(post: Post, postTags: string[]): string {
  // A Backlog essay is filed by what it is actually about. Only one of the
  // twelve is technical; the rest are career and opinion pieces.
  if (isBacklogEssay(postTags)) {
    for (const tag of postTags) {
      const mapped = CATEGORY_OF[tag.toLowerCase()]
      if (mapped !== undefined && mapped !== 'meta' && mapped !== 'newsletter') return mapped
    }
    return 'career'
  }
  if (isNewsletterRoundup(postTags)) return 'newsletter'
  if (post.status === 'sent') return 'newsletter'
  for (const tag of postTags) {
    const mapped = CATEGORY_OF[tag.toLowerCase()]
    if (mapped !== undefined && mapped !== 'meta') return mapped
  }
  for (const tag of postTags) {
    const mapped = CATEGORY_OF[tag.toLowerCase()]
    if (mapped !== undefined) return mapped
  }
  return 'meta'
}

const emailOnlyReview: string[] = []
const roundupReview: string[] = []
const backlogReview: string[] = []
const privateReview: string[] = []
const perPostNotes = new Map<string, string[]>()

const articles = posts.filter((post) => post.type === 'post' && !COMPROMISED_SLUGS.has(post.slug))

// The intruder's payload lived in Ghost's per-post code injection, which this
// migration never reads. Verify that rather than trust it: if a post carries an
// injected remote-script loader, say so loudly.
const injected = posts.filter((post) =>
  /gist\.githubusercontent|new Function\(/.test(
    `${(post as unknown as { codeinjection_head?: string }).codeinjection_head ?? ''}${(post as unknown as { codeinjection_foot?: string }).codeinjection_foot ?? ''}`,
  ),
)
if (injected.length > 0) {
  console.warn(
    `NOTE: ${injected.length} posts in the export carry an injected remote-script loader in Ghost's code injection fields. None of it is migrated, but the live Ghost site is still serving it.`,
  )
}
const selected = args.only === null ? articles : articles.filter((post) => post.slug === args.only)
const limited = args.limit > 0 ? selected.slice(0, args.limit) : selected

mkdirSync(args.out, { recursive: true })
mkdirSync(args.report, { recursive: true })
mkdirSync(REMOTE_CACHE, { recursive: true })

// Mirror every remote image once, before conversion, so the resolver is sync.
const remoteCandidates = new Set<string>()
for (const post of limited) {
  const html = normalizeHtml(post.html ?? '')
  for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    if (isMirrorableImage(match[1])) remoteCandidates.add(match[1])
  }
  const hero = post.feature_image === null ? '' : normalizeHtml(post.feature_image)
  if (isMirrorableImage(hero)) remoteCandidates.add(hero)
}
// Expand bit.ly links once, before any conversion reads the html.
const shortLinks = new Set<string>()
for (const post of limited) {
  for (const match of (post.html ?? '').matchAll(/https?:\/\/bit\.ly\/[A-Za-z0-9]+/g)) {
    shortLinks.add(match[0])
  }
}
const unresolvedShort: string[] = []
if (shortLinks.size > 0) {
  console.log(`expanding ${shortLinks.size} bit.ly links...`)
  const links = [...shortLinks]
  for (let start = 0; start < links.length; start += 8) {
    await Promise.all(
      links.slice(start, start + 8).map((url) =>
        resolveShortLink(url).catch(() => {
          unresolvedShort.push(url)
        }),
      ),
    )
  }
  writeFileSync(BITLY_CACHE, JSON.stringify(Object.fromEntries(bitlyMap), null, 2))
  writeFileSync(
    join(args.report, 'review-expanded-links.md'),
    [
      `# bit.ly links expanded to their real targets (${bitlyMap.size})`,
      ``,
      `Every one of these replaced a bit.ly URL in a post. Two things to look at rather than trust:`,
      `anything still on plain \`http://\`, and anything whose target has nothing to do with the post.`,
      `An old shortlink can be repointed by whoever owns it, so the target today is not necessarily`,
      `what you linked years ago.`,
      ``,
      ...[...bitlyMap.entries()]
        .sort(([, a], [, b]) => Number(b.startsWith('http://')) - Number(a.startsWith('http://')))
        .map(([short, target]) => `- ${target.startsWith('http://') ? '**insecure** ' : ''}\`${short}\` -> ${target}`),
    ].join('\n'),
  )
  const missed = links.filter((url) => !bitlyMap.has(url))
  console.log(`expanded ${links.length - missed.length} of ${links.length}`)
  for (const url of missed) if (!unresolvedShort.includes(url)) unresolvedShort.push(url)
}

console.log(`mirroring ${remoteCandidates.size} remote images...`)
const candidateList = [...remoteCandidates]
const CONCURRENCY = 8
for (let start = 0; start < candidateList.length; start += CONCURRENCY) {
  const batch = candidateList.slice(start, start + CONCURRENCY)
  await Promise.all(batch.map((url) => mirrorRemoteImage(url).catch(() => missingAssets.add(`${url} (fetch failed)`))))
}
console.log(`mirrored ${remoteFiles.size} of ${remoteCandidates.size}`)

for (const post of limited) {
  const postNotes: string[] = []
  const copied = new Map<string, string>()
  const resolveAsset = makeResolver(post.slug, copied, (message) => postNotes.push(message))

  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  })
  turndown.use(gfm)
  turndown.keep(['kbd', 'sub', 'abbr', 'mark'])
  addFootnoteRules(turndown)
  addTableRule(turndown)
  addMathRule(turndown, { resolveAsset, note: (message) => postNotes.push(message) })
  addCardRules(turndown, { resolveAsset, note: (message) => postNotes.push(message) })

  // Plain <img> outside a card still has to be colocated.
  turndown.addRule('bare-image', {
    filter: 'img',
    replacement: (_content, node) => {
      const element = node as unknown as Element
      const src = resolveAsset(element.getAttribute('src') ?? '')
      const alt = element.getAttribute('alt') ?? ''
      if (src.length === 0) return ''
      if (src.endsWith('.mp4')) return `\n\n<Video src="${src}" caption="${alt.replace(/"/g, '&quot;')}" />\n\n`
      return `![${alt}](${src})`
    },
  })

  const html = demoteHeadings(normalizeHtml(post.html ?? ''))
  const body = hoistFigureImages(
    escapeMdxOutsideCode(normalizeLinks(turndown.turndown(html)))
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )

  // \b matters: without it `sudo dpkg-reconfigure` reads as a Ghost class.
  const leftovers = [...body.matchAll(/\bkg-[a-z-]+/g)].map((match) => match[0])
  if (leftovers.length > 0) postNotes.push(`leftover Ghost classes: ${[...new Set(leftovers)].join(', ')}`)

  const meta = metaById.get(post.id)
  const postTags = tagsByPost.get(post.id) ?? []
  const isPrivate = postTags.some((tag) => tag.toLowerCase() === '#private')
  const emailOnly = meta?.email_only === 1 || meta?.email_only === true
  const roundup = isNewsletterRoundup(postTags)
  const isDraft = post.status === 'draft' || emailOnly || roundup
  const series = seriesBySlug.get(post.slug)
  const hero = post.feature_image === null ? null : resolveAsset(normalizeHtml(post.feature_image))
  const publicTags = postTags.filter((tag) => !tag.startsWith('#'))
  const description = describe(post, meta)

  const updated = new Date(post.updated_at)
  // Ghost drafts carry a null published_at. Falling that into `new Date(null)`
  // silently coerces to the 1970 epoch, so fall back to updated_at instead.
  const published = post.published_at === null ? updated : new Date(post.published_at)
  const updatedIsMeaningful = updated.getTime() - published.getTime() > 24 * 60 * 60 * 1000

  const file = join(args.out, `${post.slug}.mdx`)
  const assetDir = join(args.out, post.slug)
  if (copied.size > 0) mkdirSync(assetDir, { recursive: true })
  if (copied.size === 0 && existsSync(assetDir)) rmSync(assetDir, { recursive: true, force: true })
  for (const [source, name] of copied) copyFileSync(source, join(assetDir, name))

  // Prune assets a previous run left behind. Without this, changing how an
  // asset is emitted (a GIF that became an mp4, say) leaves the old file in
  // place, and astro:assets happily processes it into the build even though no
  // post references it any more.
  if (existsSync(assetDir)) {
    const wanted = new Set(copied.values())
    for (const entry of readdirSync(assetDir)) {
      if (wanted.has(entry)) continue
      rmSync(join(assetDir, entry), { force: true })
      postNotes.push(`removed orphaned asset: ${entry}`)
    }
  }

  const metaTitle = meta?.meta_title?.trim() ?? ''
  const metaDescription = meta?.meta_description?.trim() ?? ''

  // Ghost stores its own URL as `__GHOST_URL__`, and a canonical pointing back at
  // this same site is what the SEO component emits anyway. Only a genuinely
  // external canonical (an article first published on Medium, MSDN, …) is worth
  // keeping.
  const rawCanonical = post.canonical_url === null ? '' : normalizeHtml(post.canonical_url)
  const canonical =
    rawCanonical.startsWith('http') && !rawCanonical.startsWith(GHOST_URL) ? rawCanonical : null

  const content =
    frontmatter([
      ['title', yamlString(post.title)],
      ['pubDate', published.toISOString()],
      ['updatedDate', updatedIsMeaningful ? updated.toISOString() : null],
      ['lang', 'pt'],
      ['category', yamlString(categoryFor(post, postTags))],
      ['tags', publicTags.length === 0 ? null : `[${publicTags.map(yamlString).join(', ')}]`],
      ['series', series === undefined ? null : yamlString(series.name)],
      ['seriesOrder', series === undefined ? null : String(series.order)],
      ['description', yamlString(description)],
      ['heroImage', hero === null ? null : yamlString(hero)],
      ['heroImageAlt', meta?.feature_image_alt == null ? null : yamlString(meta.feature_image_alt)],
      // Only Ghost's own drafts stay unpublished. A `#private` tag is a Ghost
      // INTERNAL tag: it hides the tag from listings, it does not unpublish the
      // post, and these all have live URLs today.
      // Drafted, in order: Ghost's own drafts; email-only sends, which never had
      // a web page at all in Ghost; and the newsletter roundups, which Lucas
      // wants held back for a manual pass.
      ['draft', isDraft ? 'true' : 'false'],
      ['visibility', yamlString(post.visibility)],
      ['canonicalUrl', canonical === null ? null : yamlString(canonical)],
      ['seoTitle', metaTitle.length > 0 && metaTitle !== post.title ? yamlString(metaTitle) : null],
      ['seoDescription', metaDescription.length > 0 && metaDescription !== description ? yamlString(metaDescription) : null],
    ]) + `\n${body}\n`

  writeFileSync(file, content)

  if (emailOnly) {
    emailOnlyReview.push(`- [ ] \`${post.slug}\` — ${post.title} (${published.toISOString().slice(0, 10)})`)
  }
  if (roundup) {
    roundupReview.push(
      `- [ ] \`${post.slug}\` — ${post.title} (${published.toISOString().slice(0, 10)})`,
    )
  }
  if (isBacklogEssay(postTags)) {
    backlogReview.push(
      `- \`${post.slug}\` -> category \`${categoryFor(post, postTags)}\` — ${post.title}`,
    )
  }
  if (isPrivate && post.status !== 'draft') {
    privateReview.push(`- [ ] \`${post.slug}\` — ${post.title} (${published.toISOString().slice(0, 10)})`)
  }
  if (postNotes.length > 0) perPostNotes.set(post.slug, postNotes)
}

// ----------------------------------------------------------------- the reports

const reportLines = [
  `# Migration report`,
  ``,
  `Export: \`${args.export}\``,
  `Posts written: ${limited.length} into \`${args.out}\``,
  `Assets indexed: ${assetIndex.size} files`,
  ``,
  `## Posts needing a human look (${perPostNotes.size})`,
  ``,
]
for (const [slug, list] of perPostNotes) {
  reportLines.push(`### \`${slug}\``)
  for (const note of list) reportLines.push(`- ${note}`)
  reportLines.push('')
}
if (unresolvedShort.length > 0) {
  reportLines.push(`## bit.ly links that could not be expanded (${unresolvedShort.length})`, '')
  for (const url of unresolvedShort) reportLines.push(`- ${url}`)
  reportLines.push('')
}
if (missingAssets.size > 0) {
  reportLines.push(`## Assets referenced but not found locally (${missingAssets.size})`, '')
  for (const url of [...missingAssets].sort()) reportLines.push(`- ${url}`)
}
writeFileSync(join(args.report, 'report.md'), reportLines.join('\n'))

writeFileSync(
  join(args.report, 'review-newsletter-roundups.md'),
  [
    `# Newsletter roundups held back as drafts (${roundupReview.length})`,
    ``,
    `Tagged \`#newsletter\` without \`backlog-newsletter\`: ls-news issues, noticias-semanais,`,
    `giro-de-noticias. Median 726 words, mostly links. They are in the repo with \`draft: true\`, so`,
    `they build no page. Tick any that should be published and I will flip them.`,
    ``,
    `Worth knowing: these DO resolve on the old Ghost site today, so leaving them as drafts means`,
    `those URLs will 404 after cutover. Say the word if you would rather have redirect stubs.`,
    ``,
    ...roundupReview,
  ].join('\n'),
)

writeFileSync(
  join(args.report, 'review-backlog-essays.md'),
  [
    `# Backlog essays, refiled by subject (${backlogReview.length})`,
    ``,
    `Tagged \`backlog-newsletter\`, median 2465 words. These are real posts, so they are published`,
    `and filed under their actual subject rather than under \`newsletter\`. The category comes from`,
    `each post's own topic tags, defaulting to \`career\` for the career and opinion pieces.`,
    `Moving one is a one-line frontmatter edit.`,
    ``,
    ...backlogReview,
  ].join('\n'),
)

writeFileSync(
  join(args.report, 'review-email-only.md'),
  [
    `# Email-only posts (${emailOnlyReview.length})`,
    ``,
    `Ghost email-only posts have NO web page: these were sent as email and never had a URL.`,
    `They are imported with \`draft: true\`, so publishing one would be adding a page that never`,
    `existed rather than preserving anything. Tick any you want on the site.`,
    ``,
    ...emailOnlyReview,
  ].join('\n'),
)

writeFileSync(
  join(args.report, 'review-internal-tag.md'),
  [
    `# Published posts carrying Ghost's \`#private\` internal tag (${privateReview.length})`,
    ``,
    `Ghost internal tags hide a tag from listings, they do NOT unpublish the post, so all of these`,
    `are live on blog.lsantos.dev right now and are migrated as published. Tick any that should`,
    `become drafts on the new site.`,
    ``,
    ...privateReview,
  ].join('\n'),
)

console.log(`wrote ${limited.length} posts to ${args.out}`)
console.log(`assets indexed: ${assetIndex.size}, missing: ${missingAssets.size}`)
console.log(`posts with notes: ${perPostNotes.size} (see ${args.report}/report.md)`)
