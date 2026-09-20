/**
 * The tag vocabulary lives in `content/tags.json`, next to `categories.json`:
 * every key is a tag a post may carry, and its value holds the label per
 * language for the ones that read differently. Tags are written in English in
 * the frontmatter and the URL is built from that word, so only what the reader
 * sees changes: `/tags/tests/` reads "testes" on a Portuguese page and "tests"
 * on an English one. A tag Portuguese uses in English (kubernetes, docker) has
 * an empty object and falls through to itself.
 *
 * `scripts/check-tags.ts` fails on a tag missing from the file, and
 * `scripts/sync-metadata.ts` drops the keys no post uses any more.
 */
import { readFileSync } from 'node:fs'

type Labelled = string | Partial<Record<string, string>>

let cache: Record<string, Labelled> | null = null

function load(): Record<string, Labelled> {
  if (cache !== null) return cache
  const parsed: unknown = JSON.parse(readFileSync('content/tags.json', 'utf8'))
  cache = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Labelled>) : {}
  return cache
}

/** Every tag that has been decided about. */
export const KNOWN_TAGS: readonly string[] = Object.keys(load())

export function tagLabel(tag: string, locale: string): string {
  const entry = load()[tag]
  if (entry === undefined) return tag
  // A bare string is the Portuguese label, the same shorthand categories.json allows.
  if (typeof entry === 'string') return locale === 'pt' ? entry : tag
  return entry[locale] ?? tag
}
