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
 * Reads the same environment as scripts/translate.ts: TRANSLATE_PROVIDER,
 * TRANSLATE_MODEL, TRANSLATE_BASE_URL and TRANSLATE_API_KEY, which falls back to
 * ANTHROPIC_API_KEY.
 */
import Anthropic from '@anthropic-ai/sdk'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { KNOWN_TAGS, TAG_LABELS } from '../src/i18n/tags.ts'
import { bold, count, dim, fail, frontmatterOf, heading, ok, postIndex } from './lib/cli.ts'

const SOURCE_DIR = 'content/blog'
const OUT_FILE = 'src/i18n/tags.ts'
/** Portuguese only: English is the language the tags are written in. */
const TARGET = 'pt'

const MODEL = process.env.TRANSLATE_MODEL ?? 'claude-opus-5'
const API_KEY = process.env.TRANSLATE_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? ''

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

async function translate(tags: string[]): Promise<Record<string, string>> {
  if (API_KEY === '') fail(`no TRANSLATE_API_KEY or ANTHROPIC_API_KEY, and ${tags.length} tags need one.`)
  const client = new Anthropic({ apiKey: API_KEY })
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(tags) }],
  })
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .replace(/^```(?:json)?\n?|\n?```$/g, '')
    .trim()

  const parsed = JSON.parse(text) as Record<string, string>
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
