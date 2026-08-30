/**
 * Keeps src/i18n/tags.ts current with the tag vocabulary in content/blog.
 *
 *   node scripts/build-tag-labels.ts [--dry-run]
 *
 * Only a tag missing from KNOWN_TAGS reaches the model, so a run that finds
 * nothing new costs nothing and writes nothing. Deleting a tag from the posts
 * leaves its entry behind on purpose: bringing the word back should not cost
 * another call.
 *
 * Its own model, separate from the one scripts/translate.ts uses on the posts:
 * this asks for single words and a small one is enough, where a post is prose
 * published under a name.
 *
 *   TAGS_BASE_URL   an OpenAI-compatible /chat/completions host, no trailing
 *                   /chat/completions. Cloudflare Workers AI is
 *                   https://api.cloudflare.com/client/v4/accounts/<id>/ai/v1
 *   TAGS_MODEL      default @cf/meta/llama-3.3-70b-instruct-fp8-fast
 *   TAGS_API_KEY    a Cloudflare API token with Workers AI read
 *
 * Without a key it reports the new tags and exits clean, so the workflow stays
 * green and the tag keeps its English label until this runs with one.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { KNOWN_TAGS, TAG_LABELS } from '../src/i18n/tags.ts'
import { bold, count, dim, fail as failLine, frontmatterOf, heading, ok, warn } from './lib/cli.ts'

function fail(message: string): never {
  failLine(message)
  process.exit(1)
}

const SOURCE_DIR = 'content/blog'
const OUT_FILE = 'src/i18n/tags.ts'
/** Portuguese only: English is the language the tags are written in. */
const TARGET = 'pt'

const MODEL = process.env.TAGS_MODEL ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const BASE_URL = (process.env.TAGS_BASE_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.TAGS_API_KEY ?? ''

const dryRun = process.argv.includes('--dry-run')

/** Every tag in the corpus, translations included: they carry the same list. */
function readVocabulary(): string[] {
  const tags = new Set<string>()
  for (const entry of readdirSync(SOURCE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(SOURCE_DIR, entry.name)
    for (const file of readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue
      const line = /^tags:\s*\[(.*?)\]$/m.exec(frontmatterOf(readFileSync(join(dir, file), 'utf8')))
      if (line === null) continue
      for (const tag of line[1].matchAll(/"([^"]+)"/g)) tags.add(tag[1])
    }
  }
  return [...tags].sort()
}

const SYSTEM_PROMPT = `You translate the tag vocabulary of a Brazilian software engineering blog. The tags are written in English and you return the Brazilian Portuguese a developer would actually say.

Rules:

1. Return a tag unchanged when Portuguese uses the English word: product names (kubernetes, docker, azure), languages (javascript, golang), and the loanwords developers keep in English (deploy, backend, devops, cloud, open source).
2. Translate a tag only when a Portuguese reader would expect the Portuguese word: career becomes carreira, security becomes segurança.
3. Lowercase, and singular or plural exactly as the English is.
4. Never explain, never add a tag, never drop one.

Return ONLY a JSON object mapping every tag you were given to its label, and nothing else.`

interface ChatCompletion {
  choices?: { message?: { content?: string } }[]
}

async function translate(tags: string[]): Promise<Record<string, string>> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(tags) },
      ],
    }),
  })
  if (!response.ok) fail(`${BASE_URL} returned ${response.status}: ${await response.text()}`)

  const text = ((await response.json()) as ChatCompletion).choices?.[0]?.message?.content
  if (text === undefined) fail(`${BASE_URL} returned no completion.`)

  // A small model wraps JSON in a fence often enough to be worth stripping.
  const parsed = JSON.parse(text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim()) as Record<string, string>
  for (const tag of tags) {
    if (typeof parsed[tag] === 'string') continue
    fail(`the model returned no label for "${tag}".`)
  }
  return parsed
}

function render(known: string[], labels: Record<string, Record<string, string>>): string {
  const head = readFileSync(OUT_FILE, 'utf8').split('/** Every tag the generator')[0]
  const list = known.map((tag) => `  ${JSON.stringify(tag)},`).join('\n')
  const entries = Object.keys(labels)
    .sort()
    .map((tag) => {
      const key = /^[a-z][a-z0-9]*$/.test(tag) ? tag : JSON.stringify(tag)
      const value = Object.entries(labels[tag])
        .map(([locale, label]) => `${locale}: ${JSON.stringify(label)}`)
        .join(', ')
      return `  ${key}: { ${value} },`
    })
    .join('\n')

  return `${head}/** Every tag the generator has already judged, so a rerun asks about none of them. */
export const KNOWN_TAGS = [
${list}
]

/** Only the tags that read differently. Everything else is the same word. */
export const TAG_LABELS: Record<string, Record<string, string>> = {
${entries}
}

export function tagLabel(tag: string, locale: string): string {
  return TAG_LABELS[tag]?.[locale] ?? tag
}
`
}

heading('build-tag-labels: checking the tag vocabulary')

const vocabulary = readVocabulary()
const seen = new Set(KNOWN_TAGS)
const missing = vocabulary.filter((tag) => !seen.has(tag))

console.log(`  ${count(vocabulary.length, 'tag', 'tags')} in ${SOURCE_DIR}, ${count(missing.length, 'new one', 'new ones')}`)

if (missing.length === 0) {
  ok('nothing new, the dictionary is current')
  process.exit(0)
}

if (dryRun) {
  console.log(missing.join('\n'))
  process.exit(0)
}

// Not an error. The key is optional so the workflow can run on every push and
// report the new tags without one, which is what happens until a key is set:
// `npm run tags` locally writes the file, and until it does the new tag reads
// in English on a Portuguese page, which is where it was anyway.
if (API_KEY === '' || BASE_URL === '') {
  warn(`no TAGS_API_KEY or TAGS_BASE_URL, so these keep their English label: ${missing.join(', ')}`)
  process.exit(0)
}

const translated = await translate(missing)
const labels = { ...TAG_LABELS }
for (const tag of missing) {
  // An unchanged word carries no entry: tagLabel falls through to the tag.
  if (translated[tag] === tag) continue
  labels[tag] = { ...labels[tag], [TARGET]: translated[tag] }
  console.log(`  ${bold(tag)} ${dim('->')} ${translated[tag]}`)
}

writeFileSync(OUT_FILE, render([...seen, ...missing].sort(), labels))
ok(`wrote ${count(missing.length, 'new tag', 'new tags')} to ${OUT_FILE}`)
