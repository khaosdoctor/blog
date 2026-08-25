import { readStorage } from '../lib/storage'
import {
  hoverPreviewCacheEntryLimit as CACHE_MAX,
  hoverPreviewCloseDelayMilliseconds as CLOSE_DELAY,
  hoverPreviewDragThresholdPixels as DRAG_THRESHOLD,
  hoverPreviewFootnoteCharacterLimit as FOOTNOTE_TEXT_MAX,
  hoverPreviewOpenDelayMilliseconds as HOVER_DELAY,
  hoverPreviewPinnedCardLimit as CARD_MAX,
  hoverPreviewViewportMarginPixels as VIEWPORT_MARGIN,
} from '../lib/tweaks'
import { ALIGN, canPopover, clampAxis, placeNear } from './popover-menu'
import { onReady } from './ready'

interface Meta {
  title: string
  description: string
  host?: string
}

interface StoredCard {
  href: string
  left: number
  top: number
  docked?: boolean
  title?: string
}

interface PopoverHTMLElement extends HTMLElement {
  hpLink?: HTMLAnchorElement
}

const STORAGE_KEY = 'hp-pinned'
const PERSIST_KEY = 'hp-persist'
const FOOTNOTES_KEY = 'hp-footnotes'

const strings: DOMStringMap = document.querySelector<HTMLElement>('.hp-settings')?.dataset ?? {}

const cache = new Map<string, Meta | null>()
const inflight = new Map<string, AbortController>()
const pinned: PopoverHTMLElement[] = []

let externalMeta: Promise<Record<string, { title?: string; description?: string; publisher?: string }>> | null = null

function loadExternalMeta(): NonNullable<typeof externalMeta> {
  externalMeta ??= fetch('/link-metadata.json')
    .then((res) => (res.ok ? res.json() : {}))
    .catch(() => ({}))
  return externalMeta
}

// An open popover lays out against the viewport whatever its parent is, so a
// card must be hidePopover()'d before the dock's flex layout applies to it.
let dock: HTMLElement | null = null

function ensureDock(): HTMLElement {
  if (dock !== null) return dock
  dock = document.createElement('div')
  dock.className = 'hp-dock'
  document.body.append(dock)
  return dock
}

// The feature never starts on touch: the opening gesture would collide with the
// browser's own link menu, and a pinned card cannot be moved out of the way.
const hoverPointerMedia = matchMedia('(hover: hover) and (pointer: fine)')

// Kept live so previewable() answers correctly after a resize.
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

// Read on every hover, so the settings panel's checkbox takes effect at once.
function footnotePreviews(): boolean {
  return readStorage(FOOTNOTES_KEY) === '1'
}

function previewable(link: HTMLAnchorElement): boolean {
  if (!link.href || link.closest('.hp-card') || link.closest('.bookmark') || link.closest('.no-preview')) return false
  if (link.classList.contains('link-unwritten')) return true
  if (link.hasAttribute('data-footnote-ref')) return footnotePreviews() && footnoteWideMedia.matches
  let url: URL
  try {
    url = new URL(link.href)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
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
    // redirect: 'manual' keeps a same-origin-checked href from following a
    // redirect to a cross-origin page; an opaque redirect has ok: false.
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
    // An abort means a newer call is still running: do not cache over it.
    if (err instanceof DOMException && err.name === 'AbortError') return null
    return remember(href, null)
  } finally {
    if (inflight.get(href) === controller) inflight.delete(href)
  }
}

function place(card: HTMLElement, anchor: HTMLElement): void {
  placeNear(card, anchor, { margin: VIEWPORT_MARGIN, align: ALIGN.start })
}

// Every write of left/top that does not go through place() goes through this:
// a position stored on a wider viewport is unreachable on a narrower one.
function clampToViewport(card: HTMLElement): void {
  const inset = VIEWPORT_MARGIN
  const cw = card.offsetWidth
  const ch = card.offsetHeight
  const left = parseFloat(card.style.left) || 0
  const top = parseFloat(card.style.top) || 0
  card.style.left = `${clampAxis(left, cw, innerWidth, inset)}px`
  card.style.top = `${clampAxis(top, ch, innerHeight, inset)}px`
}

function persistent(): boolean {
  return readStorage(PERSIST_KEY) !== '0'
}

function store(): Storage | null {
  try {
    return persistent() ? localStorage : sessionStorage
  } catch {
    return null
  }
}

function savePinned(): void {
  try {
    const state: StoredCard[] = pinned.map((card) => ({
      href: (card.querySelector('.hp-title') as HTMLAnchorElement).href,
      left: parseFloat(isDocked(card) ? (card.dataset.hpLeft ?? '') : card.style.left) || 0,
      top: parseFloat(isDocked(card) ? (card.dataset.hpTop ?? '') : card.style.top) || 0,
      docked: isDocked(card),
      title: (card.querySelector('.hp-title') as HTMLAnchorElement).textContent ?? '',
    }))
    store()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
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
  button?.setAttribute('aria-label', (on ? strings.unpin : strings.pin) ?? '')
}

function pinCard(card: PopoverHTMLElement): void {
  if (pinned.includes(card)) return
  const oldest = pinned[0]
  if (pinned.length >= CARD_MAX && oldest) closeCard(oldest)
  pinned.push(card)
  markPinned(card, true)
  savePinned()
}

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
  button?.setAttribute('aria-label', (on ? strings.restore : strings.minimize) ?? '')
}

function dockCard(card: PopoverHTMLElement): void {
  if (isDocked(card)) return
  pinCard(card)
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
  clampToViewport(card)
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
  card.setAttribute('aria-live', 'polite')
  if (canPopover) card.setAttribute('popover', 'manual')

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'hp-close'
  close.setAttribute('aria-label', strings.close ?? '')
  close.textContent = '×'
  close.addEventListener('click', () => closeCard(card))

  const pin = document.createElement('button')
  pin.type = 'button'
  pin.className = 'hp-pin'
  pin.setAttribute('aria-pressed', 'false')
  pin.setAttribute('aria-label', strings.pin ?? '')
  pin.innerHTML =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9.5 1.2 14.8 6.5l-1.1 1.1-1.3-.4-2.6 2.6.5 2.4a1 1 0 0 1-.3.9l-.6.6-3-3-3.2 3.2-.7-.7L5.5 10l-3-3 .6-.6a1 1 0 0 1 .9-.3l2.4.5 2.6-2.6-.4-1.3z"/></svg>'
  pin.addEventListener('click', () => {
    if (pinned.includes(card)) unpinCard(card)
    else pinCard(card)
  })

  const minimize = document.createElement('button')
  minimize.type = 'button'
  minimize.className = 'hp-min'
  minimize.setAttribute('aria-pressed', 'false')
  minimize.setAttribute('aria-label', strings.minimize ?? '')
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

  const hint = document.createElement('span')
  hint.className = 'hp-hint'
  hint.textContent = strings.drag ?? ''

  if (unwritten) {
    // Hidden, not removed: savePinned()/restorePinned() read .hp-title's href.
    title.hidden = true
    desc.hidden = true
    host.hidden = true
    const msg = document.createElement('p')
    msg.id = `${card.id}-msg`
    msg.className = 'hp-unwritten-msg'
    msg.textContent = strings.unwritten ?? ''
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
  if (!unwritten) title.textContent = strings.loading ?? ''

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
      clampToViewport(card)
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
  // A footnote reference's previewable() answer changes with the viewport
  // width, so it binds regardless and show() re-checks live.
  if (!link.hasAttribute('data-footnote-ref') && !previewable(link)) return

  link.setAttribute('aria-expanded', 'false')

  const openSoon = (): void => {
    clearTimeout(openTimer)
    openTimer = window.setTimeout(() => show(link, false), HOVER_DELAY)
  }
  const closeSoon = (): void => {
    clearTimeout(openTimer)
    scheduleClose()
  }

  link.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return
    openSoon()
  })
  link.addEventListener('pointerleave', closeSoon)
  link.addEventListener('focus', openSoon)
  link.addEventListener('blur', closeSoon)
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
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      if (box.checked) localStorage.removeItem(PERSIST_KEY)
      else localStorage.setItem(PERSIST_KEY, '0')
    } catch {
      return
    }
    savePinned()
  })
}

function init(): void {
  if (!hoverPointerMedia.matches) return

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (current) closeCard(current.card)
    for (const card of [...pinned]) closeCard(card)
  })

  // A bfcache restore brings the DOM back but not the top layer, so a floating
  // card returns closed and invisible with no second run of this script.
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return
    for (const card of pinned) {
      if (isDocked(card)) continue
      if (card.matches(':popover-open')) continue
      card.showPopover?.()
    }
  })

  addEventListener('resize', () => {
    for (const card of pinned) {
      if (!isDocked(card)) clampToViewport(card)
    }
  })

  const links = document.querySelectorAll<HTMLAnchorElement>('article a[href]')
  for (const link of links) attach(link)

  bindPersistToggle()
  void restorePinned()
}

onReady(init)
