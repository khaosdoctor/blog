/**
 * The site's accent colour, and the reader's own override of it.
 *
 * By default the accent is today's colour: `dayColor()` hashes the calendar
 * day into one of the brand tokens, so the whole site shifts once a day on
 * its own (header wordmark, link hovers, the chrome buttons, anything reading
 * `--accent-day`). That stays the default, under the name "auto".
 *
 * A reader who wants one colour and not a rotation can pick it here instead.
 * The stored choice wins over the day hash for as long as it is set, and
 * clearing it goes back to the rotation. Same "nothing stored means the
 * default" convention as every other preference on this site, so auto is the
 * absence of a value rather than the string 'auto'.
 *
 * Purple IS offered here even though `dayColor` is called with
 * `excludePurple` everywhere: that exclusion is about the automatic rotation,
 * which the owner asked never to draw purple by chance. Choosing it
 * deliberately is a different act, and the token exists.
 *
 * This lives in lib/ rather than in a script because two callers need it from
 * different places: header-brand.ts applies it on every page load, and the
 * settings panel writes it. It imports only day-color, which is free of
 * `astro:content`, so it stays safe in a browser bundle.
 */
import { dayColor } from './day-color'

export const ACCENT_KEY = 'accent'

/**
 * The pickable colours, in the order the panel draws them. Keys are stored
 * verbatim, so they are names rather than the tokens themselves: a stored
 * `var(--brand-red)` would be a stylesheet detail written into a reader's
 * browser, and unreadable if the token were ever renamed.
 */
export const ACCENT_TOKENS: Record<string, string> = {
  red: 'var(--brand-red)',
  green: 'var(--brand-green)',
  yellow: 'var(--brand-yellow)',
  blue: 'var(--brand-blue)',
  purple: 'var(--brand-purple)',
}

/** The reader's own choice, or null for the day rotation. */
export function storedAccent(): string | null {
  try {
    const raw = localStorage.getItem(ACCENT_KEY)
    return raw !== null && raw in ACCENT_TOKENS ? raw : null
  } catch {
    return null
  }
}

/** The token to paint with right now: the override if there is one, else today's. */
export function resolveAccent(): string {
  const stored = storedAccent()
  if (stored !== null) return ACCENT_TOKENS[stored]
  return dayColor(undefined, { excludePurple: true })
}

/**
 * Writes the resolved accent onto the root element, where every rule reading
 * `--accent-day` picks it up. An inline style rather than a class or an
 * attribute because the value is one of five tokens rather than one of five
 * states, and theme.css's own `--accent-day` is the fallback underneath for
 * a reader with no JavaScript.
 */
export function applyAccent(): void {
  try {
    document.documentElement.style.setProperty('--accent-day', resolveAccent())
  } catch {
    // Storage or DOM unavailable: theme.css's static fallback still paints a
    // sane accent, so this is never worth failing a page load over.
  }
}

/** Picking a colour, or null to go back to the day rotation. */
export function setAccent(name: string | null): void {
  try {
    if (name === null || !(name in ACCENT_TOKENS)) localStorage.removeItem(ACCENT_KEY)
    else localStorage.setItem(ACCENT_KEY, name)
  } catch {
    // Private mode, or storage disabled: the choice still applies for this page.
  }
  applyAccent()
}
