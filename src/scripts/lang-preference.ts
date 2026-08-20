// Which language a reader arrives in.
//
// Order, highest first:
//   1. A choice they made with the switcher (stored as `lang`).
//   2. Their browser's own preference, in `navigator.languages` order.
//   3. Whatever the URL already is, which is Portuguese at the root.
//
// The site is static, so there is no server to read Accept-Language and send
// a 302; `navigator.languages` is the same list that header is built from, so
// this reads it in the browser instead.
//
// Only ever redirects to a page that already exists: the targets come from the
// `<link rel="alternate" hreflang>` tags SEO.astro emits for this exact page,
// so a post with no translation stays where it is rather than bouncing to a
// language home.
export {}

const CHOICE_KEY = 'lang'
// Per tab, not per browser. A reader who hits back after an automatic redirect
// would otherwise be redirected again and be unable to leave, and clearing it
// on a new tab means a fresh visit still honours their browser.
const REDIRECTED_KEY = 'lang-redirected'

function storedChoice(): string | null {
  try {
    return localStorage.getItem(CHOICE_KEY)
  } catch {
    return null
  }
}

function alreadyRedirected(): boolean {
  try {
    return sessionStorage.getItem(REDIRECTED_KEY) === '1'
  } catch {
    return true
  }
}

function markRedirected(): void {
  try {
    sessionStorage.setItem(REDIRECTED_KEY, '1')
  } catch {
    // Private mode: worst case is one extra redirect on the next navigation.
  }
}

/** The language subtag of a tag like `pt-BR`, lowercased. */
function subtag(tag: string): string {
  return tag.toLowerCase().split('-')[0] ?? ''
}

function run(): void {
  const current = subtag(document.documentElement.lang)
  if (current === '') return

  // Where this page exists in other languages. Includes itself, which is what
  // makes the "already here" check below work without a second source.
  const alternates = new Map<string, string>()
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')) {
    const code = subtag(link.hreflang)
    if (code === '' || code === 'x') continue
    if (!alternates.has(code)) alternates.set(code, link.href)
  }
  if (alternates.size < 2) return

  const chosen = storedChoice()
  if (chosen !== null) {
    const target = alternates.get(subtag(chosen))
    if (target !== undefined && subtag(chosen) !== current) location.replace(target)
    return
  }

  // No stated choice, so the browser's own order decides, and only once.
  if (alreadyRedirected()) return
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = subtag(tag)
    if (code === '') continue
    // The reader's top preference the site actually speaks. Anything below it
    // in their list is a worse match than where they already are.
    if (!alternates.has(code)) continue
    if (code === current) return
    markRedirected()
    location.replace(alternates.get(code) as string)
    return
  }
}

run()
