// The command-style search opener from SearchPalette.astro: a magnifier plus a
// configurable Ctrl/Cmd+letter, opening a native <dialog> that live-searches
// through Pagefind.
//
// The loadPagefind/init dance is duplicated from Search.astro's own <script>
// rather than shared: that file has to work with JS off and before an index
// exists, and both copies are short. If one changes, change both.
//
// The empty export makes this a real module, same as theme-toggle.ts,
// code-theme.ts and conway.ts: a script with no import or export is global,
// and its names would collide with theirs.
export {}

import { dayColor } from '../lib/day-color'

// --- The shortcut letter. Stored like every other reader preference here: a
// plain localStorage key, written on change, read once at startup, wrapped for
// private mode. Exported so settings-panel.ts calls into this module instead
// of duplicating the key. ---

const SHORTCUT_KEY = 'search-shortcut'
const DEFAULT_LETTER = 'K'

/*
 * Seven letters are a shortcut the browser itself owns (bookmark, address bar,
 * new window, quit, reload, new tab, close tab) and a page-level keydown
 * handler cannot preventDefault, so picking one would leave the setting
 * looking broken. settings-panel.ts disables these in the picker. K, the
 * default, is unclaimed and is what every other command palette uses.
 */
export const RESERVED_LETTERS = new Set(['D', 'L', 'N', 'Q', 'R', 'T', 'W'])

function readStoredLetter(): string {
  try {
    const stored = localStorage.getItem(SHORTCUT_KEY)
    return stored !== null && /^[A-Z]$/.test(stored) ? stored : DEFAULT_LETTER
  } catch {
    return DEFAULT_LETTER
  }
}

let shortcutLetter = readStoredLetter()

export function getShortcutLetter(): string {
  return shortcutLetter
}

export function setShortcutLetter(letter: string): void {
  const upper = letter.toUpperCase()
  if (!/^[A-Z]$/.test(upper)) return
  shortcutLetter = upper
  try {
    localStorage.setItem(SHORTCUT_KEY, upper)
  } catch {
    // Private mode: the choice still applies for this page.
  }
  applyHint()
}

/*
 * For the settings panel's reset-all. Removes the key rather than storing
 * 'K': choosing K on purpose is a choice worth storing, a reset is the
 * absence of one, and this site's convention is that nothing stored means the
 * default.
 */
export function resetShortcutLetter(): void {
  shortcutLetter = DEFAULT_LETTER
  try {
    localStorage.removeItem(SHORTCUT_KEY)
  } catch {
    // Private mode: the reset still applies for this page.
  }
  applyHint()
}

// Cmd on Apple platforms, Ctrl everywhere else, not reader configurable.
// navigator.platform is deprecated but still universally implemented; the user
// agent string is the fallback for the one engine that might drop it.
const isApple = /Mac|iPhone|iPad|iPod/.test(`${navigator.platform ?? ''} ${navigator.userAgent}`)

let hintModEl: HTMLElement | null = null
let hintKeyEl: HTMLElement | null = null

function applyHint(): void {
  if (hintModEl !== null) hintModEl.textContent = isApple ? 'Cmd' : 'Ctrl'
  if (hintKeyEl !== null) hintKeyEl.textContent = shortcutLetter
}

// --- Pagefind, loaded once and cached: the dialog opens many times per page
// view, and init() is not something Pagefind expects twice. ---

interface PagefindResult {
  data: () => Promise<{ url: string; excerpt: string; meta: { title?: string } }>
}

interface PagefindModule {
  init?: (language?: string) => Promise<void>
  debouncedSearch: (
    term: string,
    options?: Record<string, unknown>,
    timeoutMs?: number,
  ) => Promise<{ results: PagefindResult[] } | null>
}

type PagefindState = PagefindModule | null | 'unready'

let pagefindState: PagefindState = 'unready'
let pagefindLoad: Promise<PagefindModule | null> | null = null

async function loadPagefind(): Promise<PagefindModule | null> {
  try {
    // Pagefind writes this into dist/ after the build, so it is not a source
    // module: the specifier goes through a variable to keep Vite and the
    // typechecker from resolving something that only exists in the output.
    const module = '/pagefind/pagefind.js'
    return (await import(/* @vite-ignore */ module)) as PagefindModule
  } catch {
    return null
  }
}

/**
 * Resolves to null both when the index does not exist (dev, or before a build)
 * and when init() throws, so callers handle one "not available" case.
 */
async function ensurePagefind(): Promise<PagefindModule | null> {
  if (pagefindState !== 'unready') return pagefindState
  pagefindLoad ??= (async () => {
    const pagefind = await loadPagefind()
    if (pagefind === null) return null

    // Called bare, init() picks between the per-language indexes from the
    // page's lang and silently serves whichever has the most pages to an
    // unrecognised or variant tag. Passing the tag turns that quiet fallback
    // into a thrown error. Search.astro carries the same guard.
    if (pagefind.init) {
      try {
        await pagefind.init(document.documentElement.lang)
      } catch {
        return null
      }
    }
    return pagefind
  })()

  pagefindState = await pagefindLoad
  return pagefindState
}

// t()'s server-side strings read back off the input's own data attributes:
// this plain script module has no access to t(). Same as Search.astro.

function label(
  input: HTMLInputElement,
  name: 'searching' | 'noResults' | 'moreResults' | 'resultsFound',
  value = '',
): string {
  return (input.dataset[name] ?? '').replace(/%[ds]/, value)
}

const MAX_RESULTS = 5 // Matches the numbered 1-5 shortcut; past this is a link to /search/ instead of a 6th row.

function searchPageHref(query: string): string {
  const base = document.documentElement.lang === 'en' ? '/en/search/' : '/search/'
  return `${base}?q=${encodeURIComponent(query)}`
}

function init(): void {
  const triggerEl = document.querySelector<HTMLElement>('.search-trigger')
  // <a>, not <button>: see SearchPalette.astro for why this is a real link.
  const openerEl = document.querySelector<HTMLAnchorElement>('.sx-open')
  const hintEl = document.querySelector<HTMLElement>('.sx-hint')
  const dialogEl = document.querySelector<HTMLDialogElement>('.sx-dialog')
  const inputEl = document.querySelector<HTMLInputElement>('.sx-input')
  const cursorEl = document.querySelector<HTMLElement>('.sx-cursor')
  const statusEl = document.querySelector<HTMLElement>('.sx-status')
  const listEl = document.querySelector<HTMLUListElement>('.sx-results')
  const moreEl = document.querySelector<HTMLElement>('.sx-more')
  if (
    triggerEl === null ||
    openerEl === null ||
    hintEl === null ||
    dialogEl === null ||
    inputEl === null ||
    cursorEl === null ||
    statusEl === null ||
    listEl === null ||
    moreEl === null
  ) {
    return
  }
  const trigger = triggerEl
  const opener = openerEl
  const hint = hintEl
  const dialog = dialogEl
  const input = inputEl
  const cursor = cursorEl
  const status = statusEl
  const list = listEl
  const more = moreEl

  // These only become true now that the click below opens a dialog instead of
  // navigating; in the static markup they would describe behaviour a no-JS
  // reader never gets. aria-label is left alone, SearchPalette.astro sets one
  // that reads correctly in both states.
  opener.setAttribute('aria-haspopup', 'dialog')
  opener.setAttribute('aria-controls', 'sx-dialog')

  // The hint's space is already reserved at rest (visibility: hidden), so
  // revealing it resizes nothing. Only from here is the promise it makes true.
  hint.style.visibility = 'visible'
  hintModEl = trigger.querySelector('.sx-hint-mod')
  hintKeyEl = trigger.querySelector('.sx-hint-key')
  applyHint()

  let resultLinks: HTMLAnchorElement[] = []
  let searchGeneration = 0

  function updateCaret(): void {
    const pos = input.selectionStart ?? input.value.length
    cursor.style.transform = `translateX(calc(${pos} * 1ch))`
  }

  async function runSearch(query: string): Promise<void> {
    const generation = ++searchGeneration
    list.replaceChildren()
    more.replaceChildren()
    resultLinks = []

    if (query === '') {
      status.textContent = ''
      return
    }

    status.textContent = label(input, 'searching')

    const pagefind = await ensurePagefind()
    if (generation !== searchGeneration) return
    if (pagefind === null) {
      status.textContent = input.dataset.noIndexMessage ?? ''
      return
    }

    // Pagefind's own coalescing rather than a hand-rolled setTimeout: a call
    // superseded by a newer keystroke resolves to null instead of running,
    // which keeps the live region from announcing once per key.
    const outcome = await pagefind.debouncedSearch(query, {}, 200)
    if (outcome === null || generation !== searchGeneration) return

    const { results } = outcome
    if (results.length === 0) {
      status.textContent = label(input, 'noResults', query)
      return
    }

    const entries: { url: string; title: string }[] = []
    for (const result of results.slice(0, MAX_RESULTS)) {
      const data = await result.data()
      if (generation !== searchGeneration) return
      if (!data.url.startsWith('/')) continue // Same external-URL guard as Search.astro.
      entries.push({ url: data.url, title: data.meta.title ?? data.url })
    }
    if (generation !== searchGeneration) return

    resultLinks = entries.map(({ url, title }, index) => {
      const li = document.createElement('li')
      const link = document.createElement('a')
      link.href = url
      const num = document.createElement('span')
      num.className = 'sx-num'
      num.setAttribute('aria-hidden', 'true')
      num.textContent = String(index + 1)
      const titleEl = document.createElement('span')
      titleEl.textContent = title
      link.append(num, titleEl)
      li.append(link)
      list.append(li)
      return link
    })

    // One announcement per settled search, the count rather than the titles:
    // the results are already visible, and reading each one aloud on every
    // keystroke is what a polite live region has to avoid.
    status.textContent = label(input, 'resultsFound', String(results.length))

    if (results.length > MAX_RESULTS) {
      const moreLink = document.createElement('a')
      moreLink.href = searchPageHref(query)
      moreLink.textContent = label(input, 'moreResults', String(results.length - MAX_RESULTS))
      more.append(moreLink)
    }
  }

  function openDialog(): void {
    input.value = ''
    list.replaceChildren()
    more.replaceChildren()
    status.textContent = ''
    resultLinks = []
    cursor.style.background = dayColor()
    dialog.showModal()
    updateCaret()
  }

  // preventDefault is the upgrade: without it a real <a href> navigates, which
  // is the correct no-JS behaviour and wrong once this handler exists.
  opener.addEventListener('click', (event) => {
    event.preventDefault()
    openDialog()
  })

  dialog.addEventListener('close', () => {
    opener.focus()
  })

  // A click whose target is the dialog element itself, rather than any of its
  // content, only happens on the ::backdrop area: every real child has a box.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })

  input.addEventListener('input', () => {
    updateCaret()
    void runSearch(input.value.trim())
  })
  for (const eventName of ['keyup', 'click', 'focus']) {
    input.addEventListener(eventName, updateCaret)
  }

  dialog.addEventListener('keydown', (event) => {
    const metaHeld = isApple ? event.metaKey : event.ctrlKey

    // Cmd/Ctrl+1-5 jumps to that result. Most browsers also use Ctrl/Cmd+1-9
    // to switch tabs, so this preventDefault may lose that race depending on
    // the browser, the same way GitHub's and Linear's number shortcuts do.
    if (metaHeld && /^[1-5]$/.test(event.key)) {
      event.preventDefault()
      resultLinks[Number(event.key) - 1]?.click()
      return
    }

    const target = event.target as HTMLElement

    if (target === input) {
      // Arrow keys never insert a character, so they can move focus into the
      // results while the reader is still typing.
      if (event.key === 'ArrowDown' && resultLinks.length > 0) {
        event.preventDefault()
        resultLinks[0].focus()
      } else if (event.key === 'ArrowUp' && resultLinks.length > 0) {
        event.preventDefault()
        resultLinks[resultLinks.length - 1].focus()
      }
      // Escape is native: showModal() fires 'cancel' and closes with no
      // listener. Every other key, h/j/k/l included, types as pressed.
      return
    }

    // Focus is on a result link, the one place h/j/k/l are bound. That
    // placement is what resolves the conflict: they are ordinary letters a
    // reader types into the field above, so they only mean navigation once
    // focus has left it via arrows, a click or Tab, never via a letter.
    const currentIndex = resultLinks.indexOf(target as HTMLAnchorElement)
    if (currentIndex === -1) return

    switch (event.key) {
      case 'j':
      case 'ArrowDown':
        event.preventDefault()
        resultLinks[(currentIndex + 1) % resultLinks.length].focus()
        break
      case 'k':
      case 'ArrowUp':
        // From the first item this returns to the input rather than wrapping
        // to the last result: the field is the only other useful target.
        event.preventDefault()
        if (currentIndex === 0) input.focus()
        else resultLinks[currentIndex - 1].focus()
        break
      case 'h':
      case 'ArrowLeft':
        // ranger/vifm's "up a level". There is no parent list, only the query
        // that produced this one, so back means returning to the input.
        event.preventDefault()
        input.focus()
        break
      case 'l':
      case 'ArrowRight':
      case 'Enter':
        event.preventDefault()
        target.click()
        break
      default:
        break
    }
  })

  // Modifier+letter never types a character into whatever is focused, so the
  // global open shortcut stays active everywhere on the page.
  document.addEventListener('keydown', (event) => {
    if (dialog.open) return
    const metaHeld = isApple ? event.metaKey : event.ctrlKey
    if (!metaHeld || event.altKey || event.shiftKey) return
    if (event.key.toUpperCase() !== shortcutLetter) return
    event.preventDefault()
    openDialog()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
