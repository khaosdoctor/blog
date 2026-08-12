// Gwern/Quartz-style draggable hover previews. Progressive enhancement only:
// links keep working with JS off, this just adds a floating preview card on
// top. No build-time data pipeline: the target page's already-built HTML is
// fetched and parsed for <title> + meta description at hover time.

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
}

/**
 * The popover methods are in the DOM types as required, but a browser without
 * the API does not have them, which is why every call site uses `?.()`. Only
 * the link back to the anchor needs declaring.
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

// Labels for the runtime-built cards, from data attributes on .hp-settings (see
// HoverPreviews.astro). The fallbacks only matter if that element is missing.
const strings = {
  ...{ loading: 'Carregando…', close: 'Fechar prévia', pin: 'Fixar', unpin: 'Soltar', drag: 'arraste para mover' },
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

let current: { link: HTMLAnchorElement; card: PopoverHTMLElement } | null = null
let openTimer = 0
let closeTimer = 0
let cardSeq = 0

function samePath(a: URL, b: URL): boolean {
  return a.pathname.replace(/\/?$/, '/') === b.pathname.replace(/\/?$/, '/')
}

function previewable(link: HTMLAnchorElement): boolean {
  if (!link.href || link.closest('.hp-card')) return false
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
 * A card for a link to another site. The page itself cannot be read, CORS
 * stops that, and no proxy is worth putting a third party between the reader
 * and every link, so this uses the metadata Ghost cached for its bookmark
 * cards, and falls back to the link's own text plus the hostname.
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

async function getMeta(href: string, linkText: string): Promise<Meta | null> {
  const cached = cache.get(href)
  if (cached !== undefined) return cached

  if (new URL(href).origin !== location.origin) {
    return remember(href, await getExternalMeta(href, linkText))
  }

  inflight.get(href)?.abort()
  const controller = new AbortController()
  inflight.set(href, controller)

  try {
    // redirect: 'manual' keeps a same-origin-checked href from silently
    // following a redirect to a cross-origin page (hosting-level rewrite,
    // open-redirect endpoint, etc). An opaque redirect response has ok:
    // false, so it falls into the failure branch below like any other bad
    // response instead of having its body parsed.
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
    // Aborted because a newer call for the same href superseded this one
    // (see inflight.get(href)?.abort() above): the replacement fetch is
    // still running, so don't cache a false failure over it. Any other
    // error (network down, DNS failure, etc) is a real failure and gets
    // cached so a broken link doesn't get refetched on every hover.
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
 * Pinned cards are the reader's own working set: links they deliberately kept
 * open while reading. Navigating to another post used to throw all of it away,
 * so the set is mirrored into storage and restored on the next page.
 *
 * sessionStorage by default: this is one reading session's scratch space and it
 * should not still be there next week. A reader who disagrees can tick the
 * checkbox, which moves the same data to localStorage. The preference itself
 * always lives in localStorage, since a session-scoped one could never be read
 * back on the visit it was meant to affect.
 */
function persistent(): boolean {
  try {
    return localStorage.getItem(PERSIST_KEY) === '1'
  } catch {
    return false
  }
}

function store(): Storage | null {
  try {
    return persistent() ? localStorage : sessionStorage
  } catch {
    // Private mode, storage disabled: previews still work, they just do not
    // survive navigation.
    return null
  }
}

function savePinned(): void {
  try {
    const state: StoredCard[] = pinned.map((card) => ({
      href: (card.querySelector('.hp-title') as HTMLAnchorElement).href,
      left: parseFloat(card.style.left) || 0,
      top: parseFloat(card.style.top) || 0,
    }))
    store()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or otherwise refused: same as above, nothing breaks.
  }
  showSettings()
}

/**
 * The checkbox is pointless before anything is pinned, so it stays hidden until
 * the first card is kept, and stays visible afterwards for as long as the
 * preference is on (that is when a reader would go looking to turn it off).
 */
function showSettings(): void {
  const box = document.querySelector('.hp-settings')
  if (box === null) return
  const relevant = pinned.length > 0 || persistent()
  box.toggleAttribute('hidden', !relevant)
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
 * Unpinning leaves the card open rather than closing it: the reader asked for it
 * to stop being sticky, not to go away. It closes on its own the next time the
 * pointer leaves.
 */
function unpinCard(card: PopoverHTMLElement): void {
  const idx = pinned.indexOf(card)
  if (idx < 0) return
  pinned.splice(idx, 1)
  markPinned(card, false)
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
  if (target.closest('.hp-close, .hp-pin, .hp-title')) return
  // Touch stays a native scroll gesture inside the card (see touch-action:
  // pan-y in the stylesheet) rather than a drag: the two gestures overlap
  // on the same axis and dragging isn't essential on touch.
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

function buildCard(href: string): PopoverHTMLElement {
  const card = document.createElement('div') as PopoverHTMLElement
  card.id = `hp-card-${++cardSeq}`
  card.className = 'hp-card'
  card.setAttribute('role', 'note')
  // Loading -> loaded is a content swap with no visible focus move, so
  // screen reader users get it announced instead of only a sighted user
  // seeing the title/description appear.
  card.setAttribute('aria-live', 'polite')
  if (canPopover) card.setAttribute('popover', 'manual')

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'hp-close'
  close.setAttribute('aria-label', strings.close)
  close.textContent = '×'
  close.addEventListener('click', () => closeCard(card))

  // Dragging pins too, so this is the discoverable way to get the same result,
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

  const title = document.createElement('a')
  title.id = `${card.id}-title`
  title.className = 'hp-title'
  title.href = href
  card.setAttribute('aria-labelledby', title.id)

  const desc = document.createElement('p')
  desc.className = 'hp-desc'

  const host = document.createElement('span')
  host.className = 'hp-host'

  // Dragging is not obvious from a card that looks static, and it is the only
  // gesture here with no other affordance. Hidden on touch, where drag is off.
  const hint = document.createElement('span')
  hint.className = 'hp-hint'
  hint.textContent = strings.drag

  card.append(pin, close, title, desc, host, hint)
  card.addEventListener('pointerdown', (event) => startDrag(event, card))
  card.addEventListener('pointerenter', () => clearTimeout(closeTimer))
  card.addEventListener('pointerleave', scheduleClose)
  document.body.append(card)
  return card
}

async function show(link: HTMLAnchorElement, pin: boolean): Promise<void> {
  if (current?.link === link) {
    if (pin) pinCard(current.card)
    return
  }
  if (current && !pinned.includes(current.card)) closeCard(current.card)

  const href = link.href
  const card = buildCard(href)
  card.hpLink = link
  link.setAttribute('aria-expanded', 'true')
  link.setAttribute('aria-controls', card.id)
  current = { link, card }
  if (pin) pinCard(card)

  const title = card.querySelector('.hp-title') as HTMLAnchorElement
  const desc = card.querySelector('.hp-desc') as HTMLParagraphElement
  title.textContent = strings.loading

  card.style.visibility = 'hidden'
  card.showPopover?.()
  place(card, link)
  card.style.visibility = ''
  requestAnimationFrame(() => card.classList.add('hp-open'))

  const meta = await getMeta(href, link.textContent ?? '')
  if (current?.card !== card && !pinned.includes(card)) return

  title.textContent = meta?.title ?? link.textContent ?? href
  desc.textContent = meta?.description ?? ''
  const host = card.querySelector('.hp-host') as HTMLSpanElement
  host.textContent = meta?.host ?? ''
  place(card, link)
}

/**
 * Rebuilds the cards that were pinned on the previous page, at the coordinates
 * they were left at. They are not anchored to a link here, the link they came
 * from usually does not exist on this page, so place() is skipped and the
 * stored position is used as-is.
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
    const card = buildCard(entry.href)
    card.style.left = `${entry.left}px`
    card.style.top = `${entry.top}px`
    pinned.push(card)
    markPinned(card, true)
    card.showPopover?.()
    requestAnimationFrame(() => card.classList.add('hp-open'))

    const meta = await getMeta(entry.href, '')
    ;(card.querySelector('.hp-title') as HTMLAnchorElement).textContent = meta?.title ?? entry.href
    ;(card.querySelector('.hp-desc') as HTMLParagraphElement).textContent = meta?.description ?? ''
    ;(card.querySelector('.hp-host') as HTMLSpanElement).textContent = meta?.host ?? ''
  }
  savePinned()
}

function attach(link: HTMLAnchorElement): void {
  if (!previewable(link)) return

  // Advertise the disclosure relationship up front; show()/closeCard() change
  // this to 'true' and set aria-controls once a card actually exists.
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
  // Keyboard equivalent of hover: focus a link, press Space to pin the
  // preview open immediately (Space never scrolls while a link has focus,
  // and Enter is left alone so it still follows the link as expected).
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
    // Whichever store the set was in has to be emptied, or the old copy would
    // come back the next time the preference is switched again.
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      if (box.checked) localStorage.setItem(PERSIST_KEY, '1')
      else localStorage.removeItem(PERSIST_KEY)
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

  const links = document.querySelectorAll<HTMLAnchorElement>('article a[href]')
  for (const link of links) attach(link)

  bindPersistToggle()
  showSettings()
  void restorePinned()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
