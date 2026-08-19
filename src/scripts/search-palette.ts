// Wires up the command-style search opener from SearchPalette.astro: a
// magnifier plus a configurable Ctrl/Cmd+letter, opening a native <dialog>
// that live-searches through Pagefind.
//
// Deliberately not sharing code with Search.astro's own <script>: that file
// shipped earlier this session and works both with JS off and before a
// Pagefind index exists, and duplicating its small loadPagefind/init dance
// here is cheaper than touching a file this task was told to leave alone. The
// two copies are short enough that drifting apart later is an acceptable risk.
//
// The empty export makes this a real module, same reason as theme-toggle.ts,
// code-theme.ts and conway.ts: a script with no other import or export is
// global rather than file-scoped, and its names would collide with theirs.
export {}

import { dayColor } from '../lib/day-color'

// --- The shortcut letter: stored and read the same way every other reader
// preference on this site is (settings-panel.ts, conway.ts): a plain
// localStorage key, written on change, read once at startup, wrapped in
// try/catch for private mode. Exported so settings-panel.ts's own script can
// call straight into this module rather than duplicating the storage key, the
// same direct-import convention conway.ts's own control surface already uses. ---

const SHORTCUT_KEY = 'search-shortcut'
const DEFAULT_LETTER = 'K'

/*
 * Any of the 26 letters is choosable, but seven of them are a shortcut the
 * browser itself owns (bookmark, address bar, new window, quit, reload, new
 * tab, close tab) and a page-level keydown handler cannot preventDefault:
 * picking one of D, L, N, Q, R, T or W leaves the setting looking like it
 * silently does nothing, because the browser's own chrome intercepts the
 * combination before this script's listener ever runs. K, the default, works
 * unmodified in GitHub, Linear, Slack and every other command palette that
 * picked it.
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
    // Private mode, or storage disabled: the choice still applies for this page.
  }
  applyHint()
}

// Cmd on Apple platforms, Ctrl everywhere else, fixed rather than reader
// configurable (the owner's own words: "let's keep the meta key").
// navigator.platform is deprecated but still universally implemented; the
// user agent string is the fallback for the one engine that might drop it.
const isApple = /Mac|iPhone|iPad|iPod/.test(`${navigator.platform ?? ''} ${navigator.userAgent}`)

let hintModEl: HTMLElement | null = null
let hintKeyEl: HTMLElement | null = null

function applyHint(): void {
  if (hintModEl !== null) hintModEl.textContent = isApple ? 'Cmd' : 'Ctrl'
  if (hintKeyEl !== null) hintKeyEl.textContent = shortcutLetter
}

// --- Pagefind, loaded once and cached: the dialog can be opened many times
// in one page view, and there is no reason to re-run the dynamic import (or
// re-run init(), which Pagefind does not expect twice) each time. Same shape
// as Search.astro's own loadPagefind/init pair; see the note at the top of
// this file for why it is copied rather than shared outright. ---

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
    // Pagefind writes this file into dist/ after the build, so it is not a
    // source module: the specifier goes through a variable to keep both Vite
    // and the typechecker from trying to resolve something that only exists
    // in the built output. Same reasoning as Search.astro's own loadPagefind.
    const module = '/pagefind/pagefind.js'
    return (await import(/* @vite-ignore */ module)) as PagefindModule
  } catch {
    return null
  }
}

/**
 * Loads and initialises Pagefind on the first dialog open, then reuses the
 * result on every later one. Resolves to null both when the index does not
 * exist (dev, or a pre-build environment: the documented 404, same as
 * Search.astro) and when init() itself throws (the language-scoping guard
 * below), so every caller only has to handle one "not available" case.
 */
async function ensurePagefind(): Promise<PagefindModule | null> {
  if (pagefindState !== 'unready') return pagefindState
  pagefindLoad ??= (async () => {
    const pagefind = await loadPagefind()
    if (pagefind === null) return null

    // Pagefind builds one index per language and picks between them from the
    // page's own lang when init() is called bare, which silently serves
    // whichever index has the most pages (Portuguese, 276 against English's
    // 183 as of the 2026-08-19 build) to an unrecognised or variant tag. This
    // is the exact guard Search.astro's own script carries, kept identical
    // here so the palette never regresses it: passing the tag explicitly
    // turns that quiet fallback into a thrown error, handled the same way.
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

// --- The label() helper, `t()`'s server-side strings read back off the
// input's own data attributes, same technique and same reason as
// Search.astro: this plain script module has no access to t(). ---

function label(
  input: HTMLInputElement,
  name: 'searching' | 'noResults' | 'moreResults' | 'resultsFound',
  value = '',
): string {
  return (input.dataset[name] ?? '').replace(/%[ds]/, value)
}

const MAX_RESULTS = 5 // Matches the numbered 1-5 shortcut; anything past this is a link to the full /search/ page instead of a 6th row.

function searchPageHref(query: string): string {
  const base = document.documentElement.lang === 'en' ? '/en/search/' : '/search/'
  return `${base}?q=${encodeURIComponent(query)}`
}

function init(): void {
  const triggerEl = document.querySelector<HTMLElement>('.search-trigger')
  const openerEl = document.querySelector<HTMLButtonElement>('.sx-open')
  const dialogEl = document.querySelector<HTMLDialogElement>('.sx-dialog')
  const inputEl = document.querySelector<HTMLInputElement>('.sx-input')
  const cursorEl = document.querySelector<HTMLElement>('.sx-cursor')
  const statusEl = document.querySelector<HTMLElement>('.sx-status')
  const listEl = document.querySelector<HTMLUListElement>('.sx-results')
  const moreEl = document.querySelector<HTMLElement>('.sx-more')
  if (
    triggerEl === null ||
    openerEl === null ||
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
  const dialog = dialogEl
  const input = inputEl
  const cursor = cursorEl
  const status = statusEl
  const list = listEl
  const more = moreEl

  opener.setAttribute('aria-label', trigger.dataset.label ?? 'Search')
  // The hint lives inside the button now (SearchPalette.astro), but the
  // lookup still starts from the shared wrapper: a descendant selector finds
  // it either way, and starting from opener directly would work too, this
  // just avoids depending on exactly how deep it lives.
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

    // debouncedSearch coalesces rapid keystrokes through Pagefind's own API
    // rather than a hand-rolled setTimeout: a call superseded by a newer
    // keystroke resolves to null instead of running the search at all, which
    // is what keeps the status/results announcement from firing once per key.
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

    // One announcement per settled search, the count rather than the list
    // itself: the results are already visible, and reading every title aloud
    // on each keystroke is exactly the "shouting" a polite live region has to
    // avoid.
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

  opener.addEventListener('click', openDialog)

  dialog.addEventListener('close', () => {
    opener.focus()
  })

  // Clicking the backdrop closes: a click event with the dialog element
  // itself as its target, rather than any of the dialog's content, only ever
  // happens when the click falls on the ::backdrop area, since every real
  // child has its own box.
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

    // Cmd/Ctrl+1-5 jumps straight to that result, from either the input or
    // the list. Ctrl/Cmd+1-9 is also how most browsers switch to the tab in
    // that position; depending on the browser, this page's preventDefault may
    // lose that race, the same way GitHub's and Linear's own number-jump
    // shortcuts sometimes do, without a guarantee of winning everywhere.
    if (metaHeld && /^[1-5]$/.test(event.key)) {
      event.preventDefault()
      resultLinks[Number(event.key) - 1]?.click()
      return
    }

    const target = event.target as HTMLElement

    if (target === input) {
      // Arrow keys never insert a character, so they can move focus into the
      // results while the reader is still typing, with no conflict at all.
      if (event.key === 'ArrowDown' && resultLinks.length > 0) {
        event.preventDefault()
        resultLinks[0].focus()
      } else if (event.key === 'ArrowUp' && resultLinks.length > 0) {
        event.preventDefault()
        resultLinks[resultLinks.length - 1].focus()
      }
      // Escape is handled natively: showModal()'s own Escape behaviour fires
      // 'cancel' then closes the dialog with no listener needed here. Every
      // other key, h/j/k/l included, types into the field exactly as pressed:
      // the letters are never bound while this element has focus.
      return
    }

    // Focus is on a result link. This is the one place h/j/k/l are bound, and
    // that placement resolves the whole conflict on its own: hjkl are
    // ordinary letters a reader needs to type into the field above, so they
    // only ever mean navigation once focus has left it, reached here through
    // ArrowDown/Up, a click, or Tab, never through a letter keystroke.
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
        // Past the first item, k/ArrowUp returns focus to the input rather
        // than wrapping to the last result: a convenience of this palette,
        // since the field is the only other useful place to send focus from
        // here.
        event.preventDefault()
        if (currentIndex === 0) input.focus()
        else resultLinks[currentIndex - 1].focus()
        break
      case 'h':
      case 'ArrowLeft':
        // h: back, ranger/vifm's own convention for "up a level". There is no
        // parent list here, only the query that produced this one, so back
        // means returning focus to the input to keep editing it.
        event.preventDefault()
        input.focus()
        break
      case 'l':
      case 'ArrowRight':
      case 'Enter':
        // l: open, the same ranger/vifm convention mirrored as "follow the
        // highlighted result".
        event.preventDefault()
        target.click()
        break
      default:
        break
    }
  })

  // --- The global open shortcut. Modifier+letter never types a character
  // into whatever is currently focused, so this stays active everywhere on
  // the page, not only while the dialog itself has focus. ---
  document.addEventListener('keydown', (event) => {
    if (dialog.open) return
    const metaHeld = isApple ? event.metaKey : event.ctrlKey
    if (!metaHeld || event.altKey || event.shiftKey) return
    if (event.key.toUpperCase() !== shortcutLetter) return
    event.preventDefault()
    openDialog()
  })

  trigger.removeAttribute('hidden')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
