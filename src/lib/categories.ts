import { readFileSync } from 'node:fs'
import type { Locale } from '../i18n/ui'

/**
 * What a section is about, in the owner's own words, read from
 * `content/categories.json`.
 *
 * A sidecar rather than frontmatter because a category has no file of its own:
 * it exists because posts claim it. It also is not an i18n key, because these
 * are prose he writes and rewrites, and prose belongs in `content/` where he
 * edits it, not in a TypeScript table of interface labels.
 *
 * Two shapes, both valid:
 *
 *   "javascript": "One sentence."                  // Portuguese only
 *   "infra": { "pt": "Uma frase.", "en": "One." }  // per language
 *
 * A language with no entry falls back to Portuguese, and a category with
 * neither falls back to a generated line on the page. Read once, at build time.
 * A malformed or missing file is not worth failing a build over.
 */
type Described = string | Partial<Record<Locale, string>>

let cache: Record<string, Described> | null = null

function load(): Record<string, Described> {
  if (cache !== null) return cache
  try {
    const parsed: unknown = JSON.parse(readFileSync('content/categories.json', 'utf8'))
    cache = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Described>) : {}
  } catch {
    cache = {}
  }
  return cache
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/** The written description for this language, or null when there is none. */
export function categoryDescription(category: string, locale: Locale = 'pt'): string | null {
  const entry = load()[category]
  if (entry === undefined) return null
  if (typeof entry === 'string') return clean(entry)
  // Portuguese is the source language, so it is the fallback for every other.
  return clean(entry[locale]) ?? clean(entry.pt)
}
