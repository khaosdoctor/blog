import { readFileSync } from 'node:fs'
import type { Locale } from '../i18n/ui'

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

export function categoryDescription(category: string, locale: Locale = 'pt'): string | null {
  const entry = load()[category]
  if (entry === undefined) return null
  if (typeof entry === 'string') return clean(entry)
  return clean(entry[locale]) ?? clean(entry.pt)
}
