/**
 * Write once, publish twice.
 *
 * Every post is written in one language (`lang` in its frontmatter). This script
 * translates the ones that changed into the other locale and writes the result
 * into the SAME FOLDER as the source, named after its own slug:
 * content/blog/<folder>/index.mdx is the source, and
 * content/blog/<folder>/<translated-slug>.mdx is the translation. The folder is
 * the pairing, there is no separate collection and no `translationOf` key.
 *
 * Output stays .mdx, same as the source: the figures, embeds and wikilink
 * markers on this site are produced by remark plugins that emit MDX nodes, and
 * a plain .md translation would silently lose every one of them. The model is
 * told never to write an `import`, an `export`, or a `{ }` expression, and
 * scripts/check-translations.ts rejects the output if it did anyway before it
 * is ever committed.
 *
 *   node scripts/translate.ts [--locale en] [--only slug] [--all] [--dry-run]
 *
 * Two separate questions. Who owns a translation is answered by its own
 * frontmatter: only `machineOwnedTranslation: true` may be rewritten, and absent
 * counts as owned by a person. Whether it is stale is answered by the source
 * hash in .translation-cache.json.
 *
 * By default it shells out to the `claude` CLI, which uses the session you are
 * already logged into and costs nothing beyond the subscription.
 * `.github/workflows/translate.yml` runs this same script with
 * CLAUDE_CODE_OAUTH_TOKEN, so a local run and a CI run do the same work at the
 * same price, and neither has rules the other lacks.
 *
 * The model is configured by environment, so switching to an API key or a local
 * model is a matter of exporting different variables:
 *
 *   TRANSLATE_PROVIDER    claude-cli (default) | anthropic | openai-compatible
 *   TRANSLATE_MODEL       default claude-opus-5
 *   TRANSLATE_BASE_URL    required by openai-compatible, e.g.
 *                         https://openrouter.ai/api/v1,
 *                         http://localhost:11434/v1
 *   TRANSLATE_MAX_TOKENS  default 64000, lower it for models with a smaller cap
 *   TRANSLATE_API_KEY     anthropic only, falls back to ANTHROPIC_API_KEY
 *
 * `anthropic` refuses to run without a key rather than silently producing nothing.
 * The other two need none: the CLI has a session, and a local Ollama wants no auth.
 */
// Type-only, so the default claude-cli path runs with nothing installed: the
// `anthropic` provider imports the package itself, at the point it needs one.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import { asLocale, type Locale } from '../src/i18n/locales.ts'
import { sanitizeCaption } from '../src/lib/sanitizeCaption.ts'
import { slugify } from '../src/lib/slugify.ts'
import { bold, count, dim, fail, field, frontmatterOf, heading, ok, postIndex, warn } from './lib/cli.ts'

const SOURCE_DIR = 'content/blog'
// Lives directly in content/blog, not one level down inside a post folder like
// every real post and translation does, so it never matches the collection's
// glob and never looks like a translation to check-translations.ts either.
const CACHE_FILE = join(SOURCE_DIR, '.translation-cache.json')

const PROVIDERS = ['claude-cli', 'anthropic', 'openai-compatible'] as const
type Provider = (typeof PROVIDERS)[number]

// The CLI by default: it bills against the Claude subscription the same way
// `claude-code-action` does in the workflow, so a local run costs nothing extra
// and both paths translate with the same model.
const PROVIDER = (process.env.TRANSLATE_PROVIDER ?? 'claude-cli') as Provider
const MODEL = process.env.TRANSLATE_MODEL ?? 'claude-opus-5'
const BASE_URL = (process.env.TRANSLATE_BASE_URL ?? '').replace(/\/$/, '')
const MAX_TOKENS = Number(process.env.TRANSLATE_MAX_TOKENS ?? 64000)
// The specific variable wins: an ANTHROPIC_API_KEY left over in the shell should
// not be sent to Groq or OpenRouter.
const API_KEY = process.env.TRANSLATE_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? ''

const LANGUAGE_NAMES: Record<Locale, string> = {
  pt: 'Brazilian Portuguese',
  en: 'English',
}

type CacheEntry = {
  /** Hash of the source post when this translation was produced. */
  sourceHash: string
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
  return postIndex(join(SOURCE_DIR, slug)) ?? null
}

/** Frontmatter stays machine-readable, so split it off and translate only prose. */
function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const frontmatter = frontmatterOf(raw)
  if (frontmatter === '') return { frontmatter: '', body: raw }
  return { frontmatter, body: raw.slice(`---\n${frontmatter}\n---`.length).replace(/^\n/, '') }
}

/** Copies a frontmatter key through byte for byte, whatever shape its value has. */
function frontmatterLine(frontmatter: string, key: string): string | null {
  const match = new RegExp(`^${key}:.*$`, 'm').exec(frontmatter)
  return match === null ? null : match[0]
}

/**
 * The human-facing strings worth translating in frontmatter. Everything else
 * (dates, category, tags, series) is copied verbatim instead, or dropped: see
 * buildFrontmatter.
 */
const TRANSLATABLE_FIELDS = ['title', 'description', 'seoTitle', 'seoDescription'] as const

type ExistingTranslation = { file: string; slug: string; machineOwned: boolean }

/** Finds the translation already sitting in a post's folder for this locale, if any. */
function findExistingTranslation(postDir: string, locale: Locale): ExistingTranslation | null {
  for (const entry of readdirSync(postDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue
    if (!/\.mdx?$/.test(entry.name)) continue
    if (/^index\.mdx?$/.test(entry.name)) continue
    const full = join(postDir, entry.name)
    const { frontmatter } = splitFrontmatter(readFileSync(full, 'utf8'))
    if (field(frontmatter, 'lang') !== locale) continue
    const slug = field(frontmatter, 'slug') ?? entry.name.replace(/\.mdx?$/, '')
    // Absent counts as owned by a person, so a post written by hand in both
    // languages is safe without needing a cache entry to prove it.
    const machineOwned = field(frontmatter, 'machineOwnedTranslation') === 'true'
    return { file: full, slug, machineOwned }
  }
  return null
}

const SYSTEM_PROMPT = `You translate technical blog posts written in MDX. The post you are given is MDX; what you return is MDX too, but plain markdown, no imports and no { } expressions of any kind. You are given a post body and a few frontmatter strings, and you return the same content in the target language.

Rules, in order of importance:

1. NEVER translate anything inside a fenced code block (\`\`\`), an inline code span (\`), or an MDX/JSX component tag. Component names, prop names, and prop values like src, alt, poster, id, url and caption stay exactly as they are. Code comments inside code blocks stay in the original language too: they are part of the code sample.
2. NEVER translate LaTeX. Anything between $...$ or $$...$$ is math and must come through byte for byte.
3. NEVER change a URL, a file path, a relative image reference, an anchor, or a footnote marker like [^1]. Link text is translated, link targets are not. Relative image paths (e.g. ./photo.jpg) stay exactly as written: the translation is written into the same folder as the original post and its images, so the same relative path still resolves.
4. Keep the markdown structure identical: the same heading levels, the same list markers, the same blockquote callout syntax (> [!NOTE] and friends stay in English, they are syntax), the same number of paragraphs, in the same order.
5. Translate prose so it reads as if it had been written in the target language by the same author: an experienced software engineer writing for other engineers, direct and conversational, technically precise. Do not add, remove, explain or summarise anything. Do not soften opinions.
6. Keep technical terms that the target audience uses in English in English (backend, deploy, feature, pull request, container). Translate everything else.
7. Never use an em dash. Use a comma, parentheses, or two sentences.
8. Write plain markdown only. Copy a component tag that is already in the post through byte for byte, and never invent a new one. Never write an "import" or an "export" line, and never write a { } expression of any kind, anywhere: the output is MDX and any of those would execute as code when the site builds, and the file is checked for them and rejected if it has any.

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
  const { default: AnthropicClient } = await import('@anthropic-ai/sdk')
  const client = new AnthropicClient({ apiKey: API_KEY })
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

/**
 * Spawns `claude -p`, which reads the logged-in session rather than an API key.
 * The prompt goes in on stdin because a post is far past any safe argv length.
 */
async function completeWithClaudeCli(system: string, user: string): Promise<Completion> {
  const child = spawn('claude', ['-p', '--model', MODEL, '--append-system-prompt', system], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  child.stdin.end(user)

  const out: Buffer[] = []
  const err: Buffer[] = []
  child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
  child.stderr.on('data', (chunk: Buffer) => err.push(chunk))

  const code = await new Promise<number | null>((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })

  const text = Buffer.concat(out).toString('utf8').trim()
  if (code !== 0) throw new Error(`claude exited ${code}: ${Buffer.concat(err).toString('utf8').trim()}`)

  return {
    text,
    // The CLI reports neither a refusal nor a token count, so the body marker
    // check downstream is what catches a response that did not translate.
    refusal: text === '' ? 'claude returned nothing' : null,
    usage: 'billed to the Claude subscription',
  }
}

function complete(system: string, user: string): Promise<Completion> {
  switch (PROVIDER) {
    case 'claude-cli':
      return completeWithClaudeCli(system, user)
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
 * Builds the translation's frontmatter from scratch rather than patching the
 * source's: the field set is deliberately smaller (no heroImage, no
 * translationOf, no seriesName, no visibility, no canonicalUrl), so starting
 * clean is simpler than subtracting keys out of a copy.
 */
function buildFrontmatter(original: string, fields: Map<string, string>, locale: Locale, slug: string): string {
  const lines: string[] = [`title: ${yamlString(fields.get('title') ?? '')}`]

  for (const key of ['pubDate', 'updatedDate', 'category', 'tags', 'series', 'seriesOrder']) {
    const line = frontmatterLine(original, key)
    if (line !== null) lines.push(line)
  }

  lines.push(`lang: ${locale}`)
  lines.push(`description: ${yamlString(fields.get('description') ?? '')}`)

  for (const key of ['seoTitle', 'seoDescription']) {
    const value = fields.get(key)
    if (value !== undefined) lines.push(`${key}: ${yamlString(value)}`)
  }

  lines.push(`slug: ${yamlString(slug)}`)
  lines.push('machineOwnedTranslation: true')
  lines.push('draft: false')

  return lines.join('\n')
}

const args = parseArgs()

heading('translate: translating changed posts')

if (!PROVIDERS.includes(PROVIDER)) {
  fail(`TRANSLATE_PROVIDER must be one of ${PROVIDERS.join(', ')}, got "${PROVIDER}".`)
  process.exit(1)
}

if (PROVIDER === 'anthropic' && API_KEY.length === 0) {
  fail(
    'Neither TRANSLATE_API_KEY nor ANTHROPIC_API_KEY is set. Refusing to run so the build does not silently skip translations.',
  )
  process.exit(1)
}

if (PROVIDER === 'openai-compatible' && BASE_URL.length === 0) {
  fail('TRANSLATE_BASE_URL is not set. Point it at the /v1 root of the OpenAI-compatible endpoint.')
  process.exit(1)
}

const cache = readCache()
const sources = readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => args.only === null || slug === args.only)
  .map((slug) => ({ slug, file: sourceFile(slug) }))
  .filter((post): post is { slug: string; file: string } => post.file !== null)

const changed: { slug: string; file: string; raw: string; sourceHash: string; existingSlug: string | null }[] = []
const overrides: string[] = []

for (const post of sources) {
  const raw = readFileSync(post.file, 'utf8')
  const { frontmatter } = splitFrontmatter(raw)
  const sourceLang = asLocale(field(frontmatter, 'lang'))

  // A post already written in the target language needs no translation.
  if (sourceLang === args.locale) continue
  if (field(frontmatter, 'draft') === 'true') continue
  // The lab pages hold component demos rather than prose, so a translation of one
  // is a page nobody reads made of source nobody should paraphrase.
  if (field(frontmatter, 'noindex') === 'true') continue

  const sourceHash = hash(raw)
  const entry = cache[post.slug]
  const postDir = join(SOURCE_DIR, post.slug)
  const existing = findExistingTranslation(postDir, args.locale)

  if (existing !== null) {
    // The translation says who owns it, so reviewing one by hand is a matter of
    // setting machineOwnedTranslation to false rather than of hashes matching.
    if (!existing.machineOwned) {
      overrides.push(post.slug)
      continue
    }
    if (entry?.sourceHash === sourceHash && !args.all) continue
  }

  changed.push({ slug: post.slug, file: post.file, raw, sourceHash, existingSlug: existing?.slug ?? null })
}

console.log(
  `${count(sources.length, 'source post', 'source posts')}, ${count(changed.length, 'post', 'posts')} to translate into ${args.locale} with ${MODEL}`,
)
if (overrides.length > 0) {
  warn(
    `skipping ${count(overrides.length, 'translation a person owns', 'translations a person owns')}: ${overrides.join(', ')}`,
  )
}
if (args.dryRun) {
  console.log(changed.map((post) => post.slug).join('\n'))
  process.exit(0)
}

let translated = 0
let skipped = 0

for (const post of changed) {
  const { frontmatter, body } = splitFrontmatter(post.raw)
  const sourceLang = asLocale(field(frontmatter, 'lang'))

  const fields = new Map<string, string>()
  for (const key of TRANSLATABLE_FIELDS) {
    const value = field(frontmatter, key)
    if (value === null) continue
    fields.set(key, value)
  }

  const completion = await complete(SYSTEM_PROMPT, buildUserPrompt(body, fields, sourceLang, args.locale))

  if (completion.refusal !== null) {
    warn(`refused: ${post.slug} (${completion.refusal}), skipped`)
    skipped += 1
    continue
  }

  if (!completion.text.includes('<<<BODY>>>')) {
    warn(`unparseable response for ${post.slug}, skipped`)
    skipped += 1
    continue
  }

  const parsed = parseResponse(completion.text)

  // The model is untrusted output, not reviewed migration content: run it through
  // the same denylist captions get before it's allowed anywhere near set:html.
  const unsafeField = [...parsed.fields].find(([, value]) => sanitizeCaption(value) !== value)
  if (unsafeField !== undefined || sanitizeCaption(parsed.body) !== parsed.body) {
    warn(`unsafe HTML in translated output for ${post.slug} (field: ${unsafeField?.[0] ?? 'body'}), skipped`)
    skipped += 1
    continue
  }

  // Reuse the slug a previous run already picked, so a rerun updates the same
  // file instead of renaming it out from under existing links.
  const slug = post.existingSlug ?? slugify(parsed.fields.get('title') ?? post.slug)
  const output = `---\n${buildFrontmatter(frontmatter, parsed.fields, args.locale, slug)}\n---\n\n${parsed.body}\n`
  const target = join(SOURCE_DIR, post.slug, `${slug}.mdx`)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, output)

  cache[post.slug] = {
    sourceHash: post.sourceHash,
    translatedAt: new Date().toISOString(),
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))

  translated += 1
  console.log(`  ${bold(post.slug)} ${dim('->')} ${args.locale} (${completion.usage})`)
}

if (changed.length === 0) ok('nothing to translate (no-op)')
else if (skipped === 0) ok(`translated ${count(translated, 'post', 'posts')}`)
else warn(`translated ${count(translated, 'post', 'posts')}, skipped ${count(skipped, 'post', 'posts')}`)
