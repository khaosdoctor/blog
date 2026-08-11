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
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { homedir } from 'node:os'
import TurndownService from 'turndown'
// @ts-expect-error the gfm plugin ships no types
import { gfm } from 'turndown-plugin-gfm'
import { addCardRules, addFootnoteRules, addMathRule } from './cards.ts'

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
  published_at: string
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
  career: 'carreira',
  opinion: 'carreira',
  '#newsletter': 'newsletter',
  'backlog-newsletter': 'newsletter',
  blog: 'meta',
  github: 'meta',
  events: 'meta',
  podcasts: 'meta',
  video: 'meta',
}

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
// pre-migration content tar, extracted next to the export.
indexAssets(join(homedir(), 'ghost-backups', 'vm-content'))

const missingAssets = new Set<string>()

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

// ------------------------------------------------------------------ conversion

function normalizeHtml(html: string): string {
  return html
    .replaceAll('__GHOST_URL__', GHOST_URL)
    .replaceAll('src="/content/', `src="${GHOST_URL}/content/`)
    .replaceAll('href="/content/', `href="${GHOST_URL}/content/`)
}

/**
 * The page template already prints the title as the only h1, so a body that
 * starts its sections at h1 (208 of them across the export) has to move down a
 * level or the document outline is wrong for screen readers and for SEO.
 */
function demoteHeadings(html: string): string {
  if (!/<h1[\s>]/i.test(html)) return html
  const levels = [5, 4, 3, 2, 1]
  const shifted = levels.reduce(
    (current, level) =>
      current.replace(new RegExp(`<(/?)h${level}([\\s>])`, 'gi'), `<$1h${level + 1}$2`),
    html,
  )
  return shifted
}

/** Internal links become root-relative so they survive any domain change. */
function normalizeLinks(markdown: string): string {
  return markdown
    .replaceAll(`${GHOST_URL}/`, '/')
    .replace(/\]\(\/(?!\/)([^)\s]*)\)/g, (_full, path: string) => `](/${path})`)
}

/** `.../images/2020/11/foo.jpg` -> `2020/11/foo.jpg`, dropping Ghost size variants. */
function assetKey(url: string): string {
  const clean = decodeURIComponent(url.split('?')[0].split('#')[0])
  const afterImages = /\/(?:images|media)\/(.+)$/.exec(clean)
  const path = afterImages === null ? basename(clean) : afterImages[1]
  return path.replace(/^size\/[a-z]\d+\//, '')
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
      copied.set(exact, name)
      return `./${slug}/${name}`
    }
    // No exact path hit: only fall back to a filename match when it is unambiguous.
    const candidates = assetsByName.get(name) ?? []
    if (candidates.length === 1) {
      note(`asset matched by filename, not path: ${url}`)
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

function describe(post: Post, meta: Meta | undefined): string {
  const excerpt = post.custom_excerpt?.trim() ?? ''
  if (excerpt.length > 0) return excerpt
  const metaDescription = meta?.meta_description?.trim() ?? ''
  if (metaDescription.length > 0) return metaDescription
  const plain = (post.plaintext ?? '').replace(/\s+/g, ' ').trim()
  if (plain.length === 0) return post.title
  const sentence = /^(.{40,200}?[.!?])\s/.exec(plain)
  const text = sentence === null ? plain.slice(0, 157) : sentence[1]
  return text.length < plain.length && sentence === null ? `${text}...` : text
}

function categoryFor(post: Post, postTags: string[]): string {
  if (post.status === 'sent') return 'newsletter'
  for (const tag of postTags) {
    const mapped = CATEGORY_OF[tag.toLowerCase()]
    if (mapped !== undefined) return mapped
  }
  return 'meta'
}

const notes: string[] = []
const emailOnlyReview: string[] = []
const privateReview: string[] = []
const perPostNotes = new Map<string, string[]>()

const articles = posts.filter((post) => post.type === 'post')
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
      return `![${alt}](${src})`
    },
  })

  const html = demoteHeadings(normalizeHtml(post.html ?? ''))
  const body = escapeMdxOutsideCode(normalizeLinks(turndown.turndown(html)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const leftovers = [...body.matchAll(/kg-[a-z-]+/g)].map((match) => match[0])
  if (leftovers.length > 0) postNotes.push(`leftover Ghost classes: ${[...new Set(leftovers)].join(', ')}`)

  const meta = metaById.get(post.id)
  const postTags = tagsByPost.get(post.id) ?? []
  const isPrivate = postTags.some((tag) => tag.toLowerCase() === '#private')
  const emailOnly = meta?.email_only === 1 || meta?.email_only === true
  const series = seriesBySlug.get(post.slug)
  const hero = post.feature_image === null ? null : resolveAsset(normalizeHtml(post.feature_image))
  const publicTags = postTags.filter((tag) => !tag.startsWith('#'))
  const description = describe(post, meta)

  const updated = new Date(post.updated_at)
  const published = new Date(post.published_at)
  const updatedIsMeaningful = updated.getTime() - published.getTime() > 24 * 60 * 60 * 1000

  const file = join(args.out, `${post.slug}.mdx`)
  const assetDir = join(args.out, post.slug)
  if (copied.size > 0) mkdirSync(assetDir, { recursive: true })
  if (copied.size === 0 && existsSync(assetDir)) rmSync(assetDir, { recursive: true, force: true })
  for (const [source, name] of copied) copyFileSync(source, join(assetDir, name))

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
      ['draft', post.status === 'draft' ? 'true' : 'false'],
      ['visibility', yamlString(post.visibility)],
      ['canonicalUrl', canonical === null ? null : yamlString(canonical)],
      ['seoTitle', metaTitle.length > 0 && metaTitle !== post.title ? yamlString(metaTitle) : null],
      ['seoDescription', metaDescription.length > 0 && metaDescription !== description ? yamlString(metaDescription) : null],
    ]) + `\n${body}\n`

  writeFileSync(file, content)

  if (emailOnly) {
    emailOnlyReview.push(`- [ ] \`${post.slug}\` — ${post.title} (${published.toISOString().slice(0, 10)})`)
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
if (missingAssets.size > 0) {
  reportLines.push(`## Assets referenced but not found locally (${missingAssets.size})`, '')
  for (const url of [...missingAssets].sort()) reportLines.push(`- ${url}`)
}
writeFileSync(join(args.report, 'report.md'), reportLines.join('\n'))

writeFileSync(
  join(args.report, 'review-email-only.md'),
  [
    `# Email-only posts (${emailOnlyReview.length})`,
    ``,
    `These were newsletter-only issues in Ghost. They are imported as normal published posts.`,
    `Tick the ones that should NOT be on the site and I'll set them to draft or delete them.`,
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
if (notes.length > 0) console.log(notes.join('\n'))
