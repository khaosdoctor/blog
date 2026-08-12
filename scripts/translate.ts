/**
 * Write once, publish twice.
 *
 * Every post is written in one language (`lang` in its frontmatter). This script
 * translates the ones that changed into the other locale and writes them to
 * content/translated/<locale>/<slug>/index.mdx, which is NOT opened in Obsidian:
 * the writing view only ever shows source-language files.
 *
 *   node scripts/translate.ts [--locale en] [--only slug] [--all] [--dry-run]
 *
 * Only new or changed posts are translated, tracked by a content hash. Editing a
 * generated file by hand makes it a human override: the script detects that and
 * never overwrites it.
 *
 * The model is configured by environment, so switching to a smaller or local model is a
 * matter of exporting different variables:
 *
 *   TRANSLATE_PROVIDER    anthropic (default) | openai-compatible
 *   TRANSLATE_MODEL       default claude-opus-5
 *   TRANSLATE_BASE_URL    required by openai-compatible, e.g.
 *                         https://api.groq.com/openai/v1,
 *                         https://openrouter.ai/api/v1,
 *                         http://localhost:11434/v1
 *   TRANSLATE_MAX_TOKENS  default 64000, lower it for models with a smaller cap
 *   TRANSLATE_API_KEY     falls back to ANTHROPIC_API_KEY
 *
 * It refuses to run without a key rather than silently producing nothing. A local
 * Ollama is the exception: it needs no key, so openai-compatible allows none.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { sanitizeCaption } from '../src/lib/sanitizeCaption.ts'

const SOURCE_DIR = 'content/blog'
const OUTPUT_ROOT = 'content/translated'
const CACHE_FILE = join(OUTPUT_ROOT, '.translation-cache.json')

const PROVIDERS = ['anthropic', 'openai-compatible'] as const
type Provider = (typeof PROVIDERS)[number]

const PROVIDER = (process.env.TRANSLATE_PROVIDER ?? 'anthropic') as Provider
const MODEL = process.env.TRANSLATE_MODEL ?? 'claude-opus-5'
const BASE_URL = (process.env.TRANSLATE_BASE_URL ?? '').replace(/\/$/, '')
const MAX_TOKENS = Number(process.env.TRANSLATE_MAX_TOKENS ?? 64000)
// The specific variable wins: an ANTHROPIC_API_KEY left over in the shell should
// not be sent to Groq or OpenRouter.
const API_KEY = process.env.TRANSLATE_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? ''

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

type Completion = {
  text: string
  /** Set when the model declined the post; it is skipped instead of written. */
  refusal: string | null
  /** Token counts, already formatted for the log line. */
  usage: string
}

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

/** One post is one folder, so the file to read is the index inside it. */
function sourceFile(slug: string): string | null {
  const candidates = [join(SOURCE_DIR, slug, 'index.mdx'), join(SOURCE_DIR, slug, 'index.md')]
  return candidates.find((file) => existsSync(file)) ?? null
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

async function completeWithAnthropic(system: string, user: string): Promise<Completion> {
  const client = new Anthropic({ apiKey: API_KEY })
  // Streaming: a long post plus thinking can run well past the non-streaming
  // HTTP timeout.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  })

  const message = await stream.finalMessage()
  const used = message.usage
  return {
    text: message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join(''),
    refusal:
      message.stop_reason === 'refusal'
        ? (message.stop_details?.category ?? 'no category')
        : message.stop_reason === 'max_tokens'
          ? 'output hit max_tokens and is truncated'
          : null,
    usage: `${used.input_tokens} in, ${used.output_tokens} out, ${used.cache_read_input_tokens ?? 0} cached`,
  }
}

type ChatCompletion = {
  choices?: { message?: { content?: string; refusal?: string | null }; finish_reason?: string }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/** Groq, OpenRouter and Ollama all serve this same shape, so one path covers all three. */
async function completeWithOpenAICompatible(system: string, user: string): Promise<Completion> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(API_KEY.length === 0 ? {} : { authorization: `Bearer ${API_KEY}` }),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!response.ok) throw new Error(`${BASE_URL} returned ${response.status}: ${await response.text()}`)

  const data = (await response.json()) as ChatCompletion
  const choice = data.choices?.[0]
  if (choice === undefined) throw new Error(`${BASE_URL} returned no choices`)

  // A truncated translation is treated as a refusal so it is skipped rather than
  // written and cached as finished. The body marker appears near the start of the
  // response, so the existing validity check cannot see a cut-off tail.
  const refused =
    choice.message?.refusal ??
    (choice.finish_reason === 'content_filter'
      ? 'content_filter'
      : choice.finish_reason === 'length'
        ? 'output hit the token limit and is truncated'
        : null)
  const used = data.usage
  return {
    text: choice.message?.content ?? '',
    refusal: refused,
    usage: `${used?.prompt_tokens ?? 0} in, ${used?.completion_tokens ?? 0} out`,
  }
}

function complete(system: string, user: string): Promise<Completion> {
  switch (PROVIDER) {
    case 'anthropic':
      return completeWithAnthropic(system, user)
    case 'openai-compatible':
      return completeWithOpenAICompatible(system, user)
    default:
      throw new Error(`unreachable provider: ${PROVIDER satisfies never}`)
  }
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

if (!PROVIDERS.includes(PROVIDER)) {
  console.error(`TRANSLATE_PROVIDER must be one of ${PROVIDERS.join(', ')}, got "${PROVIDER}".`)
  process.exit(1)
}

if (PROVIDER === 'anthropic' && API_KEY.length === 0) {
  console.error(
    'Neither TRANSLATE_API_KEY nor ANTHROPIC_API_KEY is set. Refusing to run so the build does not silently skip translations.',
  )
  process.exit(1)
}

if (PROVIDER === 'openai-compatible' && BASE_URL.length === 0) {
  console.error('TRANSLATE_BASE_URL is not set. Point it at the /v1 root of the OpenAI-compatible endpoint.')
  process.exit(1)
}

const outputDir = join(OUTPUT_ROOT, args.locale)
mkdirSync(outputDir, { recursive: true })

const cache = readCache()
const sources = readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => args.only === null || slug === args.only)
  .map((slug) => ({ slug, file: sourceFile(slug) }))
  .filter((post): post is { slug: string; file: string } => post.file !== null)

const changed: { slug: string; file: string; raw: string; sourceHash: string }[] = []
const overrides: string[] = []

for (const post of sources) {
  const raw = readFileSync(post.file, 'utf8')
  const { frontmatter } = splitFrontmatter(raw)
  const sourceLang = (frontmatterValue(frontmatter, 'lang') ?? 'pt') as Locale

  // A post already written in the target language needs no translation.
  if (sourceLang === args.locale) continue
  if (frontmatterValue(frontmatter, 'draft') === 'true') continue

  const sourceHash = hash(raw)
  const entry = cache[post.slug]
  const target = join(outputDir, post.slug, 'index.mdx')

  if (entry !== undefined && existsSync(target)) {
    const currentOutputHash = hash(readFileSync(target, 'utf8'))
    // Someone edited the generated file: their version wins, forever.
    if (currentOutputHash !== entry.outputHash) {
      overrides.push(post.slug)
      continue
    }
    if (entry.sourceHash === sourceHash && !args.all) continue
  }

  changed.push({ slug: post.slug, file: post.file, raw, sourceHash })
}

console.log(`${sources.length} source posts, ${changed.length} to translate into ${args.locale} with ${MODEL}`)
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

  const completion = await complete(SYSTEM_PROMPT, buildUserPrompt(body, fields, sourceLang, args.locale))

  if (completion.refusal !== null) {
    console.error(`refused: ${post.slug} (${completion.refusal}), skipped`)
    continue
  }

  if (!completion.text.includes('<<<BODY>>>')) {
    console.error(`unparseable response for ${post.slug}, skipped`)
    continue
  }

  const parsed = parseResponse(completion.text)

  // The model is untrusted output, not reviewed migration content: run it through
  // the same denylist captions get before it's allowed anywhere near set:html.
  const unsafeField = [...parsed.fields].find(([, value]) => sanitizeCaption(value) !== value)
  if (unsafeField !== undefined || sanitizeCaption(parsed.body) !== parsed.body) {
    console.error(`unsafe HTML in translated output for ${post.slug} (field: ${unsafeField?.[0] ?? 'body'}), skipped`)
    continue
  }

  const output = `---\n${rebuildFrontmatter(frontmatter, parsed.fields, args.locale, post.slug)}\n---\n\n${parsed.body}\n`
  const target = join(outputDir, post.slug, 'index.mdx')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, output)

  cache[post.slug] = {
    sourceHash: post.sourceHash,
    outputHash: hash(output),
    translatedAt: new Date().toISOString(),
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))

  console.log(`${post.slug} -> ${args.locale} (${completion.usage})`)
}

console.log('done')
