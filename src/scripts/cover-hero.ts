// `drawMeta: false` leaves that slot for the page's real `.meta` row below.
import { buildCoverSvg, type CoverScheme, coverOverlay } from '../lib/cover'
import { onReady } from './ready'
import { pageScheme, THEME_ATTR } from './scheme'

const darkMedia = matchMedia('(prefers-color-scheme: dark)')

function heroScheme(): CoverScheme {
  return pageScheme() ?? (darkMedia.matches ? 'dark' : 'light')
}

function init(): void {
  const heroEl = document.querySelector<HTMLElement>('[data-cover-hero]')
  if (heroEl === null) return
  const canvasEl = heroEl.querySelector<HTMLElement>('.cover-hero-canvas')
  if (canvasEl === null) return
  const hero = heroEl
  const canvas = canvasEl

  const { slug, title, category, byline } = hero.dataset
  if (slug === undefined || title === undefined || category === undefined || byline === undefined) return
  const card = { slug, title, category, byline }

  function paint(): void {
    const scheme = heroScheme()
    canvas.innerHTML = buildCoverSvg({ ...card, drawMeta: false, scheme })

    const overlay = coverOverlay(card.title, card.category, scheme)
    hero.style.setProperty('--cover-meta-x', String(overlay.x))
    hero.style.setProperty('--cover-meta-y', String(overlay.centerY))
    hero.style.setProperty('--cover-meta-size', String(overlay.size))
    hero.style.setProperty('--cover-chip-size', String(overlay.chipSize))
    hero.style.setProperty('--cover-chip-ink', overlay.chipInk)
    hero.style.setProperty('--cover-meta-ink', overlay.textInk)
  }

  paint()

  // The theme attribute fires no event, and a system change never writes one.
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: [THEME_ATTR] })
  darkMedia.addEventListener('change', paint)

  const article = hero.closest('article')
  hero.removeAttribute('hidden')
  article?.setAttribute('data-cover-active', '')

  // Must run after the card is unhidden above, or the moved controls stay invisible.
  const meta = article?.querySelector<HTMLElement>('.meta') ?? null
  const slot = hero.querySelector<HTMLElement>('.cover-hero-meta')
  if (meta === null || slot === null) return
  slot.append(meta)
}

onReady(init)
