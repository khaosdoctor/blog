/**
 * Write once, publish twice.
 *
 * Every post is written in one language (`lang` in its frontmatter). This script
 * translates the ones that changed into the other locale and writes them to
 * content/translated/<locale>/, which is NOT opened in Obsidian: the writing
 * view only ever shows source-language files.
 *
 *   node scripts/translate.ts [--locale en] [--only slug] [--all] [--dry-run]
 *
 * Only new or changed posts are translated, tracked by a content hash. Editing a
 * generated file by hand makes it a human override: the script detects that and
 * never overwrites it.
 *
 * Needs ANTHROPIC_API_KEY. It refuses to run without one rather than silently
 * producing nothing.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sanitizeCaption } from '../src/lib/sanitizeCaption.ts'

const SOURCE_DIR = 'content/blog'
const OUTPUT_ROOT = 'content/translated'
const CACHE_FILE = join(OUTPUT_ROOT, '.translation-cache.json')
const MODEL = 'claude-opus-5'

type Locale = 'pt' | 'en'

const LANGUAGE_NAMES: Record<Locale, string> = {
  pt: 'Brazilian Portuguese',
  en: 'English',
}

type CacheEntry = {
  /** Hash of the source post when this translation was produced. */
  sourceHash: string
  /** Hash of what we wrote, so a later hand-edit is detectable. */
  outputHash: string
  translatedAt: string
}

type Cache = Record<string, CacheEntry>

function parseArgs() {
  const argv = process.argv.slice(2)
  const value = (name: string): string | null => {
    const index = argv.indexOf(`--${name}`)
    if (index === -1) return null
    return argv[index + 1] ?? null
  }
  return {
    locale: (value('locale') ?? 'en') as Locale,
    only: value('only'),
    all: argv.includes('--all'),
    dryRun: argv.includes('--dry-run'),
  }
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function readCache(): Cache {
  if (!existsSync(CACHE_FILE)) return {}
  return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Cache
}

/** Frontmatter stays machine-readable, so split it off and translate only prose. */
function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw)
  if (match === null) return { frontmatter: '', body: raw }
  return { frontmatter: match[1], body: raw.slice(match[0].length) }
}

function frontmatterValue(frontmatter: string, key: string): string | null {
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(frontmatter)
  if (match === null) return null
  return match[1].trim().replace(/^"(.*)"$/, '$1')
}

/**
 * The three human-facing strings worth translating in frontmatter. Everything
 * else (dates, category, tags, slugs, paths) must survive untouched or the
 * collection schema and the URLs break.
 */
const TRANSLATABLE_FIELDS = ['title', 'description', 'seoTitle', 'seoDescription', 'heroImageAlt', 'epigraph'] as const

const SYSTEM_PROMPT = `You translate technical blog posts written in MDX. You are given a post body and a few frontmatter strings, and you return the same content in the target language.

Rules, in order of importance:

1. NEVER translate anything inside a fenced code block (\`\`\`), an inline code span (\`), or an MDX/JSX component tag. Component names, prop names, and prop values like src, alt, poster, id, url and caption stay exactly as they are. Code comments inside code blocks stay in the original language too: they are part of the code sample.
2. NEVER translate LaTeX. Anything between $...$ or $$...$$ is math and must come through byte for byte.
3. NEVER change a URL, a file path, a relative image reference, an anchor, or a footnote marker like [^1]. Link text is translated, link targets are not.
4. Keep the markdown structure identical: the same heading levels, the same list markers, the same blockquote callout syntax (> [!NOTE] and friends stay in English, they are syntax), the same number of paragraphs, in the same order.
5. Translate prose so it reads as if it had been written in the target language by the same author: an experienced software engineer writing for other engineers, direct and conversational, technically precise. Do not add, remove, explain or summarise anything. Do not soften opinions.
6. Keep technical terms that the target audience uses in English in English (backend, deploy, feature, pull request, container). Translate everything else.
7. Never use an em dash. Use a comma, parentheses, or two sentences.

Return ONLY the translated content, with no preamble, no closing remark, and no code fence wrapping the whole thing.`

function buildUserPrompt(body: string, fields: Map<string, string>, from: Locale, to: Locale): string {
  const fieldLines = [...fields.entries()].map(([key, value]) => `${key}: ${value}`).join('\n')
  return `Translate from ${LANGUAGE_NAMES[from]} to ${LANGUAGE_NAMES[to]}.

First, translate these frontmatter strings. Return them in a block that starts with the line <<<FRONTMATTER>>> and uses the exact same "key: value" lines, in the same order:

${fieldLines}

Then, after a line containing only <<<BODY>>>, return the translated post body.

Here is the post body:

${body}`
}

function parseResponse(text: string): { fields: Map<string, string>; body: string } {
  const bodyIndex = text.indexOf('<<<BODY>>>')
  const fieldsBlock = text.slice(text.indexOf('<<<FRONTMATTER>>>') + '<<<FRONTMATTER>>>'.length, bodyIndex)
  const fields = new Map<string, string>()
  for (const line of fieldsBlock.split('\n')) {
    const match = /^([a-zA-Z]+):\s*(.+)$/.exec(line.trim())
    if (match === null) continue
    fields.set(match[1], match[2].trim())
  }
  return { fields, body: text.slice(bodyIndex + '<<<BODY>>>'.length).trim() }
}

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Rebuilds the frontmatter with translated strings swapped in, the locale
 * changed, and the provenance fields the LangBanner reads.
 */
function rebuildFrontmatter(original: string, translated: Map<string, string>, locale: Locale, slug: string): string {
  const lines = original.split('\n').map((line) => {
    const key = /^([a-zA-Z]+):/.exec(line)?.[1]
    if (key === undefined) return line
    if (key === 'lang') return `lang: ${locale}`
    const value = translated.get(key)
    if (value === undefined) return line
    return `${key}: ${yamlString(value)}`
  })
  lines.push(`machineTranslated: true`)
  lines.push(`translationOf: ${yamlString(slug)}`)
  return lines.join('\n')
}

const args = parseArgs()
const apiKey = process.env.ANTHROPIC_API_KEY

if (apiKey === undefined || apiKey.length === 0) {
  console.error('ANTHROPIC_API_KEY is not set. Refusing to run so the build does not silently skip translations.')
  process.exit(1)
}

const client = new Anthropic()
const outputDir = join(OUTPUT_ROOT, args.locale)
mkdirSync(outputDir, { recursive: true })

const cache = readCache()
const sources = readdirSync(SOURCE_DIR)
  .filter((name) => name.endsWith('.mdx') || name.endsWith('.md'))
  .filter((name) => args.only === null || name.startsWith(`${args.only}.`))

const changed: { slug: string; file: string; raw: string; sourceHash: string }[] = []
const overrides: string[] = []

for (const name of sources) {
  const file = join(SOURCE_DIR, name)
  const raw = readFileSync(file, 'utf8')
  const { frontmatter } = splitFrontmatter(raw)
  const slug = name.replace(/\.mdx?$/, '')
  const sourceLang = (frontmatterValue(frontmatter, 'lang') ?? 'pt') as Locale

  // A post already written in the target language needs no translation.
  if (sourceLang === args.locale) continue
  if (frontmatterValue(frontmatter, 'draft') === 'true') continue

  const sourceHash = hash(raw)
  const entry = cache[slug]
  const target = join(outputDir, `${slug}.mdx`)

  if (entry !== undefined && existsSync(target)) {
    const currentOutputHash = hash(readFileSync(target, 'utf8'))
    // Someone edited the generated file: their version wins, forever.
    if (currentOutputHash !== entry.outputHash) {
      overrides.push(slug)
      continue
    }
    if (entry.sourceHash === sourceHash && !args.all) continue
  }

  changed.push({ slug, file, raw, sourceHash })
}

console.log(`${sources.length} source posts, ${changed.length} to translate into ${args.locale}`)
if (overrides.length > 0) console.log(`skipping ${overrides.length} hand-edited translations: ${overrides.join(', ')}`)
if (args.dryRun) {
  console.log(changed.map((post) => post.slug).join('\n'))
  process.exit(0)
}

for (const post of changed) {
  const { frontmatter, body } = splitFrontmatter(post.raw)
  const sourceLang = (frontmatterValue(frontmatter, 'lang') ?? 'pt') as Locale

  const fields = new Map<string, string>()
  for (const key of TRANSLATABLE_FIELDS) {
    const value = frontmatterValue(frontmatter, key)
    if (value === null) continue
    fields.set(key, value)
  }

  // Streaming: a long post plus thinking can run well past the non-streaming
  // HTTP timeout.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: buildUserPrompt(body, fields, sourceLang, args.locale) }],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    console.error(`refused: ${post.slug} (${message.stop_details?.category ?? 'no category'}), skipped`)
    continue
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  if (!text.includes('<<<BODY>>>')) {
    console.error(`unparseable response for ${post.slug}, skipped`)
    continue
  }

  const parsed = parseResponse(text)

  // The model is untrusted output, not reviewed migration content: run it through
  // the same denylist captions get before it's allowed anywhere near set:html.
  const unsafeField = [...parsed.fields].find(([, value]) => sanitizeCaption(value) !== value)
  if (unsafeField !== undefined || sanitizeCaption(parsed.body) !== parsed.body) {
    console.error(`unsafe HTML in translated output for ${post.slug} (field: ${unsafeField?.[0] ?? 'body'}), skipped`)
    continue
  }

  const output = `---\n${rebuildFrontmatter(frontmatter, parsed.fields, args.locale, post.slug)}\n---\n\n${parsed.body}\n`
  const target = join(outputDir, `${post.slug}.mdx`)
  writeFileSync(target, output)

  cache[post.slug] = {
    sourceHash: post.sourceHash,
    outputHash: hash(output),
    translatedAt: new Date().toISOString(),
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))

  const used = message.usage
  console.log(
    `${post.slug} -> ${args.locale} (${used.input_tokens} in, ${used.output_tokens} out, ${used.cache_read_input_tokens ?? 0} cached)`,
  )
}

console.log('done')
