// `drawMeta: false` leaves that slot for the page's real `.meta` row below.
import { buildCoverSvg, coverOverlay } from '../lib/cover'
import { onReady } from './ready'

function init(): void {
  const hero = document.querySelector<HTMLElement>('[data-cover-hero]')
  if (hero === null) return
  const canvas = hero.querySelector<HTMLElement>('.cover-hero-canvas')
  if (canvas === null) return

  const { slug, title, category, byline } = hero.dataset
  if (slug === undefined || title === undefined || category === undefined || byline === undefined) return

  canvas.innerHTML = buildCoverSvg({ slug, title, category, byline, drawMeta: false })

  const overlay = coverOverlay(title, category)
  hero.style.setProperty('--cover-meta-x', String(overlay.x))
  hero.style.setProperty('--cover-meta-y', String(overlay.centerY))
  hero.style.setProperty('--cover-meta-size', String(overlay.size))
  hero.style.setProperty('--cover-chip-size', String(overlay.chipSize))
  hero.style.setProperty('--cover-chip-ink', overlay.chipInk)
  hero.style.setProperty('--cover-meta-ink', overlay.textInk)

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
