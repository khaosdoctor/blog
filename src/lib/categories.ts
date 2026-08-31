import { readFileSync } from 'node:fs'
import { type Locale, SOURCE_LOCALE } from '../i18n/ui'

type Described = string | Partial<Record<Locale, string>>

let cache: Record<string, Described> | null = null

function load(): Record<string, Described> {
  if (cache !== null) return cache
  let raw: string
  try {
    raw = readFileSync('content/categories.json', 'utf8')
  } catch {
    // No sidecar yet: every section falls back to its generated line. A file
    // that exists but does not parse is a typo in prose, so it throws instead.
    cache = {}
    return cache
  }
  const parsed: unknown = JSON.parse(raw)
  cache = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Described>) : {}
  return cache
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

export function categoryDescription(category: string, locale: Locale): string | null {
  const entry = load()[category]
  if (entry === undefined) return null
  if (typeof entry === 'string') return clean(entry)
  return clean(entry[locale]) ?? clean(entry[SOURCE_LOCALE])
}
