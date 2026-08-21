// Draggable hover previews, progressive enhancement only: links work with JS
// off, this adds a floating card on top. No build-time pipeline, the target
// page's built HTML is fetched and parsed at hover time. A footnote reference
// is the exception: its note is already in this DOM, so its card is read from
// there (see getMeta).
import { readStorage } from '../lib/storage'
import { onReady } from './ready'

interface Meta {
  title: string
  description: string
  /** Shown for links to other sites, so it is obvious you are leaving. */
  host?: string
}

/** What a pinned card needs to come back on the next page. */
interface StoredCard {
  href: string
  left: number
  top: number
  /** Docked at the foot of the window rather than floating where it was left. */
  docked?: boolean
  /**
   * The words the card is showing. Nothing else can recover them for a link to
   * another site: that title comes from the link's own text (see
   * getExternalMeta), which belongs to the page the card was pinned from, and
   * on any later page that text is gone. Without it every restored external
   * card fell back to its bare hostname.
   */
  title?: string
}

/**
 * The popover methods are typed as required but absent in a browser without
 * the API, which is why every call site uses `?.()`.
 */
interface PopoverHTMLElement extends HTMLElement {
  hpLink?: HTMLAnchorElement
}

const CACHE_MAX = 40
const CARD_MAX = 6
const HOVER_DELAY = 200
const CLOSE_DELAY = 150
const LONG_PRESS_DELAY = 500
const DRAG_THRESHOLD = 6

const STORAGE_KEY = 'hp-pinned'
/** Reader opted into keeping the pinned set past the end of the session. */
const PERSIST_KEY = 'hp-persist'

// Labels for the runtime-built cards, from data attributes on .hp-settings
// (HoverPreviews.astro). The fallbacks only matter if that element is missing.
const strings = {
  ...{
    loading: 'Carregando…',
    close: 'Fechar prévia',
    pin: 'Fixar',
    unpin: 'Soltar',
    drag: 'arraste para mover',
    minimize: 'Minimizar prévia',
    restore: 'Restaurar prévia',
    unwritten: 'not yet written, but soon!',
  },
  ...(document.querySelector<HTMLElement>('.hp-settings')?.dataset ?? {}),
}

const cache = new Map<string, Meta | null>()
const inflight = new Map<string, AbortController>()
const pinned: PopoverHTMLElement[] = []

/** Bookmark metadata for external links, loaded once and shared by every card. */
let externalMeta: Promise<Record<string, { title?: string; description?: string; publisher?: string }>> | null = null

function loadExternalMeta(): NonNullable<typeof externalMeta> {
  externalMeta ??= fetch('/link-metadata.json')
    .then((res) => (res.ok ? res.json() : {}))
    .catch(() => ({}))
  return externalMeta
}

const canPopover = 'popover' in HTMLElement.prototype

/**
 * Minimised cards live in one fixed strip at the foot of the window, in DOM
 * order, so several of them stack along it instead of each keeping its own
 * coordinates.
 *
 * A card is taken OUT of the top layer to get there (hidePopover): an open
 * popover is laid out against the viewport whatever its parent is, so it would
 * ignore the strip's own flex layout entirely.
 */
let dock: HTMLElement | null = null

function ensureDock(): HTMLElement {
  if (dock !== null) return dock
  dock = document.createElement('div')
  dock.className = 'hp-dock'
  document.body.append(dock)
  return dock
}

// The breakpoint above which footnotes.css floats a margin aside and hides
// section[data-footnotes]. Read from the stylesheet rather than hardcoded a
// second time; an unset custom property reads back as '', so a load failure
// degrades to the aside's own default. Kept as a MediaQueryList because
// `.matches` is live, so previewable() sees a resize.
const footnoteWideMedia = matchMedia(
  `(min-width: ${getComputedStyle(document.documentElement).getPropertyValue('--footnote-wide-breakpoint').trim() || '70rem'})`,
)

let current: { link: HTMLAnchorElement; card: PopoverHTMLElement } | null = null
let openTimer = 0
let closeTimer = 0
let cardSeq = 0

function samePath(a: URL, b: URL): boolean {
  return a.pathname.replace(/\/?$/, '/') === b.pathname.replace(/\/?$/, '/')
}

function previewable(link: HTMLAnchorElement): boolean {
  // A bookmark card already is the preview. `no-preview` is the general
  // opt-out (Authors.astro's byline links carry it). closest(), so a link
  // nested inside a no-preview wrapper is caught too.
  if (!link.href || link.closest('.hp-card') || link.closest('.bookmark') || link.closest('.no-preview')) return false
  // A draft link (remark-wikilinks.mjs) gets its own card regardless of the
  // origin/same-page checks below, see buildCard's unwritten branch.
  if (link.classList.contains('link-unwritten')) return true
  // A footnote reference points down the same page, so it fails the
  // different-page check below on purpose. Card built from the note's own
  // text instead, but only above the wide breakpoint: below it, the notes are
  // on the page already and a card would duplicate them. Read live, so this
  // answers correctly after a resize.
  if (link.hasAttribute('data-footnote-ref')) return footnoteWideMedia.matches
  let url: URL
  try {
    url = new URL(link.href)
  } catch {
    return false
  }
  // mailto:, tel: and friends have nothing to preview.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  // Every other site gets a card too, built from cached metadata or, failing
  // that, the link's own text and hostname.
  if (url.origin !== location.origin) return true
  return !samePath(url, new URL(location.href))
}

function remember(href: string, meta: Meta | null): Meta | null {
  cache.set(href, meta)
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  return meta
}

/**
 * A card for a link to another site. CORS stops the page itself being read,
 * and no proxy is worth putting a third party between the reader and every
 * link, so this uses the metadata Ghost cached for its bookmark cards and
 * falls back to the link's own text plus the hostname.
 */
async function getExternalMeta(href: string, linkText: string): Promise<Meta> {
  const url = new URL(href)
  const host = url.hostname.replace(/^www\./, '')
  const known = (await loadExternalMeta())[href] ?? (await loadExternalMeta())[href.replace(/\/$/, '')]

  return {
    title: known?.title?.trim() || linkText.trim() || host,
    description: known?.description?.trim() || '',
    host: known?.publisher?.trim() || host,
  }
}

// Past this a footnote would grow the card beyond what a hover popover should
// be. (.hp-card still scrolls past 60vh, but that is a safety net.)
const FOOTNOTE_TEXT_MAX = 480

/**
 * The note's text, read from the foot of the page rather than fetched: it is
 * already in this document. The bracketed number echoes the "[1]" the
 * reference renders. The back-reference arrow is dropped, it points into the
 * body text and means nothing inside a popover.
 */
function getFootnoteMeta(hash: string, linkText: string): Meta | null {
  const target = document.getElementById(hash.slice(1))
  if (!target) return null

  const clone = target.cloneNode(true) as HTMLElement
  for (const backref of clone.querySelectorAll('[data-footnote-backref]')) backref.remove()

  const paragraphs = clone.querySelectorAll('p')
  const raw = paragraphs.length > 0 ? Array.from(paragraphs, (p) => p.textContent ?? '').join(' ') : (clone.textContent ?? '')
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return null

  return {
    title: `[${linkText.trim()}]`,
    description: text.length > FOOTNOTE_TEXT_MAX ? `${text.slice(0, FOOTNOTE_TEXT_MAX).trimEnd()}…` : text,
  }
}

async function getMeta(href: string, linkText: string): Promise<Meta | null> {
  // A cross-site card falls back to the link's own text, so two links to the
  // same URL with different words are two different cards. Keyed on the href
  // alone, the second link showed the first one's text. Same-origin cards
  // come from the fetched page and are shared.
  const external = new URL(href).origin !== location.origin
  const key = external ? `${href}\n${linkText}` : href
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  if (external) {
    return remember(key, await getExternalMeta(href, linkText))
  }

  const url = new URL(href)
  if (url.hash && samePath(url, new URL(location.href))) {
    return remember(key, getFootnoteMeta(url.hash, linkText))
  }

  inflight.get(href)?.abort()
  const controller = new AbortController()
  inflight.set(href, controller)

  try {
    // redirect: 'manual' keeps a same-origin-checked href from silently
    // following a redirect to a cross-origin page (hosting rewrite,
    // open-redirect endpoint). An opaque redirect has ok: false, so it falls
    // into the failure branch below rather than having its body parsed.
    const res = await fetch(href, { signal: controller.signal, redirect: 'manual' })
    if (!res.ok) return remember(href, null)
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const meta: Meta = {
      title: doc.querySelector('title')?.textContent?.trim() || href,
      description: doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '',
    }
    return remember(href, meta)
  } catch (err) {
    // Aborted means a newer call for the same href superseded this one and is
    // still running, so don't cache a false failure over it. Anything else is
    // real and gets cached, so a broken link isn't refetched on every hover.
    if (err instanceof DOMException && err.name === 'AbortError') return null
    return remember(href, null)
  } finally {
    if (inflight.get(href) === controller) inflight.delete(href)
  }
}

function place(card: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect()
  const gap = 8
  const cw = card.offsetWidth
  const ch = card.offsetHeight
  const vw = innerWidth
  const vh = innerHeight

  let top = rect.bottom + gap
  if (top + ch > vh && rect.top - ch - gap > 0) top = rect.top - ch - gap
  top = Math.min(Math.max(top, gap), Math.max(gap, vh - ch - gap))

  const left = Math.min(Math.max(rect.left, gap), Math.max(gap, vw - cw - gap))

  card.style.top = `${top}px`
  card.style.left = `${left}px`
}

/**
 * Pinned cards are the reader's working set, so the set is mirrored into
 * storage and restored on the next page.
 *
 * sessionStorage by default: one reading session's scratch space, which should
 * not still be there next week. The checkbox moves the same data to
 * localStorage. The preference itself always lives in localStorage, since a
 * session-scoped one could never be read back on the visit it affects.
 */
/*
 * On unless the reader turned it off, so the stored value is the OFF marker
 * ('0'): this site's convention is that nothing stored means the default. A
 * '1' written by the earlier opt-in shape still reads as on, which is what
 * that reader chose. Storage throwing (private mode) also reads as on.
 */
function persistent(): boolean {
  return readStorage(PERSIST_KEY) !== '0'
}

function store(): Storage | null {
  try {
    return persistent() ? localStorage : sessionStorage
  } catch {
    // Private mode: previews still work, they just do not survive navigation.
    return null
  }
}

function savePinned(): void {
  try {
    const state: StoredCard[] = pinned.map((card) => ({
      href: (card.querySelector('.hp-title') as HTMLAnchorElement).href,
      // A docked card has no inline position of its own, so the one it will be
      // restored to is read back from where dockCard parked it.
      left: parseFloat(isDocked(card) ? (card.dataset.hpLeft ?? '') : card.style.left) || 0,
      top: parseFloat(isDocked(card) ? (card.dataset.hpTop ?? '') : card.style.top) || 0,
      docked: isDocked(card),
      title: (card.querySelector('.hp-title') as HTMLAnchorElement).textContent ?? '',
    }))
    store()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or refused: same as above, nothing breaks.
  }
}

function closeCard(card: PopoverHTMLElement): void {
  card.hidePopover?.()
  card.remove()
  const idx = pinned.indexOf(card)
  if (idx >= 0) {
    pinned.splice(idx, 1)
    savePinned()
  }
  if (current?.card === card) current = null
  card.hpLink?.setAttribute('aria-expanded', 'false')
  card.hpLink?.removeAttribute('aria-controls')
}

function markPinned(card: PopoverHTMLElement, on: boolean): void {
  card.classList.toggle('hp-pinned', on)
  const button = card.querySelector('.hp-pin')
  button?.setAttribute('aria-pressed', String(on))
  button?.setAttribute('aria-label', on ? strings.unpin : strings.pin)
}

function pinCard(card: PopoverHTMLElement): void {
  if (pinned.includes(card)) return
  const oldest = pinned[0]
  if (pinned.length >= CARD_MAX && oldest) closeCard(oldest)
  pinned.push(card)
  markPinned(card, true)
  savePinned()
}

/**
 * Unpinning leaves the card open: the reader asked for it to stop being
 * sticky, not to go away. It closes the next time the pointer leaves.
 */
function unpinCard(card: PopoverHTMLElement): void {
  const idx = pinned.indexOf(card)
  if (idx < 0) return
  pinned.splice(idx, 1)
  markPinned(card, false)
  savePinned()
}

function isDocked(card: PopoverHTMLElement): boolean {
  return card.classList.contains('hp-docked')
}

function markDocked(card: PopoverHTMLElement, on: boolean): void {
  const button = card.querySelector('.hp-min')
  button?.setAttribute('aria-pressed', String(on))
  button?.setAttribute('aria-label', on ? strings.restore : strings.minimize)
}

/**
 * Minimising pins as well: a loose card closes the next time the pointer
 * leaves, which would throw away the thing the reader just asked to keep.
 */
function dockCard(card: PopoverHTMLElement): void {
  if (isDocked(card)) return
  pinCard(card)
  // Where to put it back, since the strip takes over its position.
  card.dataset.hpLeft = card.style.left
  card.dataset.hpTop = card.style.top
  card.hidePopover?.()
  card.classList.add('hp-docked')
  card.style.left = ''
  card.style.top = ''
  ensureDock().append(card)
  markDocked(card, true)
  savePinned()
}

function undockCard(card: PopoverHTMLElement): void {
  if (!isDocked(card)) return
  card.classList.remove('hp-docked')
  document.body.append(card)
  card.style.left = card.dataset.hpLeft ?? '0px'
  card.style.top = card.dataset.hpTop ?? '0px'
  card.showPopover?.()
  markDocked(card, false)
  savePinned()
}

function scheduleClose(): void {
  clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    if (!current || pinned.includes(current.card)) return
    closeCard(current.card)
  }, CLOSE_DELAY)
}

function startDrag(event: PointerEvent, card: PopoverHTMLElement): void {
  const target = event.target as HTMLElement
  if (target.closest('.hp-close, .hp-pin, .hp-min, .hp-title')) return
  if (isDocked(card)) return
  // Touch stays a native scroll gesture inside the card (touch-action: pan-y
  // in the stylesheet): the two gestures overlap on the same axis, and
  // dragging is not essential on touch.
  if (event.pointerType === 'touch') return

  const startX = event.clientX
  const startY = event.clientY
  const rect = card.getBoundingClientRect()
  let dragging = false

  function move(moveEvent: PointerEvent): void {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY
    if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    if (!dragging) {
      dragging = true
      pinCard(card)
    }
    moveEvent.preventDefault()
    card.style.left = `${rect.left + dx}px`
    card.style.top = `${rect.top + dy}px`
  }

  function up(): void {
    removeEventListener('pointermove', move)
    removeEventListener('pointerup', up)
    removeEventListener('pointercancel', up)
    // Remember where the reader put it, not just that it was open.
    if (dragging) savePinned()
  }

  addEventListener('pointermove', move)
  addEventListener('pointerup', up)
  addEventListener('pointercancel', up)
}

function buildCard(href: string, unwritten = false): PopoverHTMLElement {
  const card = document.createElement('div') as PopoverHTMLElement
  card.id = `hp-card-${++cardSeq}`
  card.className = unwritten ? 'hp-card hp-unwritten' : 'hp-card'
  card.setAttribute('role', 'note')
  // Loading -> loaded is a content swap with no focus move, so screen reader
  // users get it announced rather than only a sighted user seeing it.
  card.setAttribute('aria-live', 'polite')
  if (canPopover) card.setAttribute('popover', 'manual')

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'hp-close'
  close.setAttribute('aria-label', strings.close)
  close.textContent = '×'
  close.addEventListener('click', () => closeCard(card))

  // Dragging pins too, so this is the discoverable way to the same result,
  // and its pressed state is what tells the reader a card is being kept.
  const pin = document.createElement('button')
  pin.type = 'button'
  pin.className = 'hp-pin'
  pin.setAttribute('aria-pressed', 'false')
  pin.setAttribute('aria-label', strings.pin)
  pin.innerHTML =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9.5 1.2 14.8 6.5l-1.1 1.1-1.3-.4-2.6 2.6.5 2.4a1 1 0 0 1-.3.9l-.6.6-3-3-3.2 3.2-.7-.7L5.5 10l-3-3 .6-.6a1 1 0 0 1 .9-.3l2.4.5 2.6-2.6-.4-1.3z"/></svg>'
  pin.addEventListener('click', () => {
    if (pinned.includes(card)) unpinCard(card)
    else pinCard(card)
  })

  // A chevron rather than a word: the row is three small square buttons and a
  // label would not fit any of them.
  const minimize = document.createElement('button')
  minimize.type = 'button'
  minimize.className = 'hp-min'
  minimize.setAttribute('aria-pressed', 'false')
  minimize.setAttribute('aria-label', strings.minimize)
  minimize.innerHTML =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 9h10v2H3z"/></svg>'
  minimize.addEventListener('click', () => {
    if (isDocked(card)) undockCard(card)
    else dockCard(card)
  })

  const title = document.createElement('a')
  title.id = `${card.id}-title`
  title.className = 'hp-title'
  title.href = href

  const desc = document.createElement('p')
  desc.className = 'hp-desc'

  const host = document.createElement('span')
  host.className = 'hp-host'

  // Dragging is the only gesture here with no other affordance. Hidden on
  // touch, where drag is off.
  const hint = document.createElement('span')
  hint.className = 'hp-hint'
  hint.textContent = strings.drag

  if (unwritten) {
    // A draft has no built page to fetch. title/desc/host stay in the DOM,
    // hidden, so savePinned()/restorePinned() keep reading .hp-title's href.
    title.hidden = true
    desc.hidden = true
    host.hidden = true
    const msg = document.createElement('p')
    msg.id = `${card.id}-msg`
    msg.className = 'hp-unwritten-msg'
    msg.textContent = strings.unwritten
    card.setAttribute('aria-labelledby', msg.id)
    card.append(pin, minimize, close, title, desc, host, msg, hint)
  } else {
    card.setAttribute('aria-labelledby', title.id)
    card.append(pin, minimize, close, title, desc, host, hint)
  }

  card.addEventListener('pointerdown', (event) => startDrag(event, card))
  card.addEventListener('pointerenter', () => clearTimeout(closeTimer))
  card.addEventListener('pointerleave', scheduleClose)
  document.body.append(card)
  return card
}

async function show(link: HTMLAnchorElement, pin: boolean): Promise<void> {
  // The live re-check attach() defers here: for most links this repeats a
  // decision already made, but for a footnote reference it catches a resize.
  if (!previewable(link)) return
  if (current?.link === link) {
    if (pin) pinCard(current.card)
    return
  }
  if (current && !pinned.includes(current.card)) closeCard(current.card)

  const href = link.href
  const unwritten = link.classList.contains('link-unwritten')
  const card = buildCard(href, unwritten)
  card.hpLink = link
  link.setAttribute('aria-expanded', 'true')
  link.setAttribute('aria-controls', card.id)
  current = { link, card }
  if (pin) pinCard(card)

  const title = card.querySelector('.hp-title') as HTMLAnchorElement
  const desc = card.querySelector('.hp-desc') as HTMLParagraphElement
  if (!unwritten) title.textContent = strings.loading

  card.style.visibility = 'hidden'
  card.showPopover?.()
  place(card, link)
  card.style.visibility = ''
  requestAnimationFrame(() => card.classList.add('hp-open'))

  if (unwritten) return

  const meta = await getMeta(href, link.textContent ?? '')
  if (current?.card !== card && !pinned.includes(card)) return

  title.textContent = meta?.title ?? link.textContent ?? href
  desc.textContent = meta?.description ?? ''
  const host = card.querySelector('.hp-host') as HTMLSpanElement
  host.textContent = meta?.host ?? ''
  place(card, link)
}

/**
 * Rebuilds the cards pinned on the previous page, at the coordinates they were
 * left at. The link they came from usually does not exist here, so place() is
 * skipped and the stored position is used as-is.
 */
async function restorePinned(): Promise<void> {
  let stored: StoredCard[]
  try {
    stored = JSON.parse(store()?.getItem(STORAGE_KEY) ?? '[]') as StoredCard[]
  } catch {
    return
  }
  if (!Array.isArray(stored) || stored.length === 0) return

  for (const entry of stored.slice(0, CARD_MAX)) {
    if (typeof entry?.href !== 'string') continue
    const stored = typeof entry.title === 'string' ? entry.title : ''
    const card = buildCard(entry.href)
    card.style.left = `${entry.left}px`
    card.style.top = `${entry.top}px`
    pinned.push(card)
    markPinned(card, true)
    if (stored !== '') (card.querySelector('.hp-title') as HTMLAnchorElement).textContent = stored
    if (entry.docked === true) {
      dockCard(card)
    } else {
      card.showPopover?.()
    }
    requestAnimationFrame(() => card.classList.add('hp-open'))

    const meta = await getMeta(entry.href, stored)
    ;(card.querySelector('.hp-title') as HTMLAnchorElement).textContent = meta?.title ?? (stored || entry.href)
    ;(card.querySelector('.hp-desc') as HTMLParagraphElement).textContent = meta?.description ?? ''
    ;(card.querySelector('.hp-host') as HTMLSpanElement).textContent = meta?.host ?? ''
  }
  savePinned()
}

function attach(link: HTMLAnchorElement): void {
  // A footnote reference's previewable() answer can change after this runs at
  // page load, so its listeners are bound regardless of the current width and
  // show() makes the live call. Every other kind of link's answer never
  // changes, so they are filtered here.
  if (!link.hasAttribute('data-footnote-ref') && !previewable(link)) return

  // Advertise the disclosure relationship up front; show()/closeCard() set
  // 'true' and aria-controls once a card exists.
  link.setAttribute('aria-expanded', 'false')

  let pressTimer = 0
  const cancelPress = () => clearTimeout(pressTimer)

  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return
    clearTimeout(openTimer)
    openTimer = window.setTimeout(() => show(link, false), HOVER_DELAY)
  })
  link.addEventListener('pointerleave', () => {
    clearTimeout(openTimer)
    scheduleClose()
  })
  link.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return
    pressTimer = window.setTimeout(() => show(link, true), LONG_PRESS_DELAY)
  })
  link.addEventListener('pointerup', cancelPress)
  link.addEventListener('pointercancel', cancelPress)
  link.addEventListener('pointermove', cancelPress)

  link.addEventListener('focus', () => {
    clearTimeout(openTimer)
    openTimer = window.setTimeout(() => show(link, false), HOVER_DELAY)
  })
  link.addEventListener('blur', () => {
    clearTimeout(openTimer)
    scheduleClose()
  })
  // Keyboard equivalent of hover. Space never scrolls while a link has focus,
  // and Enter is left alone so it still follows the link.
  link.addEventListener('keydown', (event) => {
    if (event.key !== ' ') return
    event.preventDefault()
    clearTimeout(openTimer)
    show(link, true)
  })
}

function bindPersistToggle(): void {
  const box = document.querySelector<HTMLInputElement>('#hp-persist')
  if (box === null) return
  box.checked = persistent()

  box.addEventListener('change', () => {
    // Whichever store the set was in has to be emptied, or the old copy comes
    // back the next time the preference is switched again.
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      // The key marks OFF, so keeping them (the default) removes it.
      if (box.checked) localStorage.removeItem(PERSIST_KEY)
      else localStorage.setItem(PERSIST_KEY, '0')
    } catch {
      return
    }
    savePinned()
  })
}

function init(): void {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (current) closeCard(current.card)
    for (const card of [...pinned]) closeCard(card)
  })

  /*
   * Coming back through history restores the page from the back/forward cache,
   * which means no reload and no second run of this script. The DOM comes back
   * intact, but the top layer does not: a manual popover is no longer open, and
   * the UA sheet gives a closed `[popover]` `display: none`, so every floating
   * card was still there and invisible. Docked cards were unaffected, their own
   * `display: flex` outranks that rule.
   *
   * showPopover() throws on an already-open popover, hence the check rather
   * than a bare call.
   */
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return
    for (const card of pinned) {
      if (isDocked(card)) continue
      if (card.matches(':popover-open')) continue
      card.showPopover?.()
    }
  })

  const links = document.querySelectorAll<HTMLAnchorElement>('article a[href]')
  for (const link of links) attach(link)

  bindPersistToggle()
  void restorePinned()
}

onReady(init)
