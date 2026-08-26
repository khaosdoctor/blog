import { asLocale } from '../i18n/ui'
import { readStorage, writeStorage } from '../lib/storage'

const CHOICE_KEY = 'lang'
// sessionStorage: without a per-tab mark, a reader pressing back after an
// automatic redirect is redirected again and cannot leave.
const REDIRECTED_KEY = 'lang-redirected'

function storedChoice(): string | null {
  return readStorage(CHOICE_KEY)
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
    /* private mode */
  }
}

function subtag(tag: string): string {
  return tag.toLowerCase().split('-')[0] ?? ''
}

function rememberChoiceOnClick(): void {
  const track = document.querySelector<HTMLAnchorElement>('.lang-switch .lang-track')
  track?.addEventListener('click', (event) => {
    const code = (event.currentTarget as HTMLElement).dataset.goesTo
    if (code !== undefined) writeStorage(CHOICE_KEY, code)
  })
}

function run(): void {
  const current = subtag(document.documentElement.lang)
  if (current === '') return

  const alternates = new Map<string, string>()
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')) {
    const code = subtag(link.hreflang)
    if (code === '' || code === 'x') continue
    if (!alternates.has(code)) alternates.set(code, link.href)
  }
  if (alternates.size < 2) return

  // The alternates are absolute against Astro.site, so only the path may be
  // reused or a dev server sends readers to the production host.
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

  if (alreadyRedirected()) return
  const top = subtag(navigator.languages?.[0] ?? navigator.language ?? '')
  if (top === '') return
  const wanted = asLocale(top)
  if (wanted === current) return
  const target = alternates.get(wanted)
  if (target === undefined) return
  markRedirected()
  location.replace(samePath(target))
}

rememberChoiceOnClick()
run()
