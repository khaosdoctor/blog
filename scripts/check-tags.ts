/**
 * Fails when a post carries a tag that `src/i18n/tags.ts` has never seen.
 *
 *   node scripts/check-tags.ts
 *
 * Tags are written in English and the URL is built from that word, so a new one
 * needs a decision: a Portuguese label in TAG_LABELS, or a place in KNOWN_TAGS
 * saying the word reads the same in both languages. Neither can be guessed from
 * the tag itself, and without one a Portuguese page shows an English chip with
 * nothing to say it happened.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { KNOWN_TAGS } from '../src/i18n/tags.ts'
import { count, fail as failLine, frontmatterOf, heading, ok } from './lib/cli.ts'

const SOURCE_DIR = 'content/blog'

/** Every tag in the corpus, translations included: they carry the same list. */
function readVocabulary(): Map<string, string[]> {
  const tags = new Map<string, string[]>()
  for (const entry of readdirSync(SOURCE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(SOURCE_DIR, entry.name)
    for (const file of readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue
      const line = /^tags:\s*\[(.*?)\]$/m.exec(frontmatterOf(readFileSync(join(dir, file), 'utf8')))
      if (line === null) continue
      for (const [, tag] of line[1].matchAll(/"([^"]+)"/g)) {
        tags.set(tag, [...(tags.get(tag) ?? []), join(dir, file)])
      }
    }
  }
  return tags
}

heading('check-tags: verifying every tag has a decision')

const vocabulary = readVocabulary()
const seen = new Set(KNOWN_TAGS)
const missing = [...vocabulary.keys()].filter((tag) => !seen.has(tag)).sort()

if (missing.length > 0) {
  for (const tag of missing) {
    const where = vocabulary.get(tag) ?? []
    failLine(`"${tag}" is not in KNOWN_TAGS, first used by ${where[0]}`)
  }
  failLine(
    'Add them to KNOWN_TAGS in src/i18n/tags.ts, plus an entry in TAG_LABELS when Portuguese reads one differently.',
  )
  process.exit(1)
}

ok(`${count(vocabulary.size, 'tag', 'tags')} all accounted for`)
