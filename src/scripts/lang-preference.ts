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

  /*
   * The alternates are absolute and point at the production host, which is what
   * SEO wants and what SEO.astro builds them from (Astro.site). Following one
   * verbatim therefore walks a reader off whatever origin they are actually on:
   * on a dev server or a preview deploy it sent them to the live blog.
   *
   * Only the path is ours to reuse. The origin has to stay the one being read.
   */
  const samePath = (target: string): string => {
    const url = new URL(target, location.href)
    return `${url.pathname}${url.search}${url.hash}`
  }

  const chosen = storedChoice()
  if (chosen !== null) {
    const target = alternates.get(subtag(chosen))
    if (target !== undefined && subtag(chosen) !== current) location.replace(samePath(target))
    return
  }

  // No stated choice, so the browser decides, and only once.
  //
  // Two outcomes, never more: the site speaks Portuguese and English, so a
  // reader whose top preference is any flavour of Portuguese (pt-BR, pt-PT,
  // bare pt) gets Portuguese and EVERYONE else gets English. A French or
  // Japanese reader is better served by English than by a language they did
  // not ask for at all, which is what matching only exact hits would have
  // given them.
  if (alreadyRedirected()) return
  const top = subtag(navigator.languages?.[0] ?? navigator.language ?? '')
  if (top === '') return
  const wanted = top === 'pt' ? 'pt' : 'en'
  if (wanted === current) return
  const target = alternates.get(wanted)
  if (target === undefined) return
  markRedirected()
  location.replace(samePath(target))
}

run()
