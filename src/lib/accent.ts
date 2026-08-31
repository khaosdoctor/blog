import { dayColor } from './day-color'
import { readStorage, writeStorage } from './storage'

const ACCENT_KEY = 'accent'

// Keys are stored verbatim in the reader's browser, so they are names rather
// than tokens: renaming a CSS token must not invalidate stored choices.
const ACCENT_TOKENS: Record<string, string> = {
  red: 'var(--brand-red)',
  green: 'var(--brand-green)',
  yellow: 'var(--brand-yellow)',
  blue: 'var(--brand-blue)',
  purple: 'var(--brand-purple)',
  // `--fg`, not literal white: white would be invisible on the sepia ground.
  white: 'var(--fg)',
}

export function storedAccent(): string | null {
  const raw = readStorage(ACCENT_KEY)
  return raw !== null && raw in ACCENT_TOKENS ? raw : null
}

function resolveAccent(): string {
  const stored = storedAccent()
  if (stored !== null) return ACCENT_TOKENS[stored]
  return dayColor(undefined, { excludePurple: true })
}

export function applyAccent(): void {
  try {
    document.documentElement.style.setProperty('--accent-day', resolveAccent())
  } catch {}
}

export function setAccent(name: string | null): void {
  writeStorage(ACCENT_KEY, name !== null && name in ACCENT_TOKENS ? name : null)
  applyAccent()
}
