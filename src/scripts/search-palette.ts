import { dayColor } from '../lib/day-color'
import { readStorage, removeStorage, writeStorage } from '../lib/storage'
import {
  searchPaletteDebounceMilliseconds as DEBOUNCE_MS,
  searchPaletteResultLimit as MAX_RESULTS,
  searchShortcutDefaultLetter as DEFAULT_LETTER,
} from '../lib/tweaks'
import { loadPagefind, searchLabel as label, type PagefindModule } from './pagefind'
import { onReady } from './ready'

const SHORTCUT_KEY = 'search-shortcut'

// The browser owns these seven for its own shortcuts, so preventDefault
// cannot claim them back.
export const RESERVED_LETTERS = new Set(['D', 'L', 'N', 'Q', 'R', 'T', 'W'])

function readStoredLetter(): string {
  const stored = readStorage(SHORTCUT_KEY)
  return stored !== null && /^[A-Z]$/.test(stored) ? stored : DEFAULT_LETTER
}

let shortcutLetter = readStoredLetter()

export function getShortcutLetter(): string {
  return shortcutLetter
}

export function setShortcutLetter(letter: string): void {
  const upper = letter.toUpperCase()
  if (!/^[A-Z]$/.test(upper)) return
  shortcutLetter = upper
  writeStorage(SHORTCUT_KEY, upper)
  applyHint()
}

export function resetShortcutLetter(): void {
  shortcutLetter = DEFAULT_LETTER
  removeStorage(SHORTCUT_KEY)
  applyHint()
}

const isApple = /Mac|iPhone|iPad|iPod/.test(`${navigator.platform ?? ''} ${navigator.userAgent}`)

let hintModEl: HTMLElement | null = null
let hintKeyEl: HTMLElement | null = null

function applyHint(): void {
  const mod = isApple ? 'Cmd' : 'Ctrl'
  if (hintModEl !== null) hintModEl.textContent = mod
  if (hintKeyEl !== null) hintKeyEl.textContent = shortcutLetter
  const opener = hintModEl?.closest('a')
  const base = opener?.getAttribute('data-base-label')
  if (opener && base !== null && base !== undefined) {
    opener.setAttribute('aria-label', `${base} <${mod}+${shortcutLetter}>`)
  }
}

let pagefindLoad: Promise<PagefindModule | null> | null = null

function ensurePagefind(): Promise<PagefindModule | null> {
  pagefindLoad ??= loadPagefind()
  return pagefindLoad
}

function searchPageHref(query: string): string {
  const base = document.documentElement.lang === 'en' ? '/en/search/' : '/search/'
  return `${base}?q=${encodeURIComponent(query)}`
}

function init(): void {
  const triggerEl = document.querySelector<HTMLElement>('.search-trigger')
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

  opener.setAttribute('aria-haspopup', 'dialog')
  opener.setAttribute('aria-controls', 'sx-dialog')

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

    // A call superseded by a newer keystroke resolves to null instead of
    // running, so the live region does not announce once per key.
    const outcome = await pagefind.debouncedSearch(query, {}, DEBOUNCE_MS)
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
      if (!data.url.startsWith('/')) continue
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

    status.textContent = label(input, 'resultsFound', String(results.length))

    if (results.length > MAX_RESULTS) {
      const moreLink = document.createElement('a')
      moreLink.href = searchPageHref(query)
      moreLink.textContent = label(input, 'moreResults', String(results.length - MAX_RESULTS))
      more.append(moreLink)
    }
  }

  const inDrawer = (): boolean => document.querySelector('header.shell')?.matches('[data-menu-open]') === true

  function openDialog(): void {
    input.value = ''
    list.replaceChildren()
    more.replaceChildren()
    status.textContent = ''
    resultLinks = []
    cursor.style.background = dayColor()

    if (inDrawer()) {
      dialog.show()
      input.focus()
      updateCaret()
      return
    }

    dialog.showModal()
    // Focusing the input on touch opens the on-screen keyboard before the
    // reader has seen the dialog, so there the dialog itself takes initial focus.
    if (matchMedia('(pointer: fine)').matches) input.focus()
    else dialog.focus()
    updateCaret()
  }

  opener.addEventListener('click', (event) => {
    event.preventDefault()
    openDialog()
  })

  dialog.addEventListener('close', () => {
    opener.focus()
  })

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })

  // A non-modal dialog has no backdrop to catch that click, so light dismiss
  // needs a document listener instead.
  document.addEventListener('click', (event) => {
    if (!dialog.open || dialog.matches(':modal')) return
    const target = event.target as HTMLElement
    if (target.closest('.sx-dialog') === null && target.closest('.sx-open') === null) dialog.close()
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

    // Most browsers also use Ctrl/Cmd+1-9 for tabs, so this preventDefault may
    // lose that race.
    const shortcut = Number(event.key)
    if (metaHeld && Number.isInteger(shortcut) && shortcut >= 1 && shortcut <= MAX_RESULTS) {
      event.preventDefault()
      resultLinks[shortcut - 1]?.click()
      return
    }

    const target = event.target as HTMLElement

    if (target === input) {
      if (event.key === 'ArrowDown' && resultLinks.length > 0) {
        event.preventDefault()
        resultLinks[0].focus()
      } else if (event.key === 'ArrowUp' && resultLinks.length > 0) {
        event.preventDefault()
        resultLinks[resultLinks.length - 1].focus()
      }
      // Escape is native here: showModal() fires 'cancel' and closes with no
      // listener. A dialog opened with show() gets neither.
      return
    }

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
        event.preventDefault()
        if (currentIndex === 0) input.focus()
        else resultLinks[currentIndex - 1].focus()
        break
      case 'h':
      case 'ArrowLeft':
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

  document.addEventListener('keydown', (event) => {
    if (dialog.open) return
    const metaHeld = isApple ? event.metaKey : event.ctrlKey
    if (!metaHeld || event.altKey || event.shiftKey) return
    if (event.key.toUpperCase() !== shortcutLetter) return
    event.preventDefault()
    openDialog()
  })
}

onReady(init)
