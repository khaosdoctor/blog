// Draws a post's cover into CoverHero.astro's empty container from the same
// buildCoverSvg the og:image rasterises with, so the two can never differ.
// `drawMeta: false` because the chip and the reading time are real, working
// controls on the page: the SVG leaves that slot empty and this script moves
// the page's own `.meta` row into the overlay, placed by coverOverlay.
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

  // The card's own coordinates, handed to CSS as plain numbers. The container
  // is `aspect-ratio: 1200 / 630` and a container query, so the stylesheet
  // turns each of these into a length by scaling against the card's rendered
  // width, and the row tracks the card at every viewport with nothing to
  // recompute on resize.
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

  // Moved (not copied) last, once the card is visibly on the page: a `.meta`
  // put into a still-hidden container would be a chip and a reading time
  // nobody can see. Its <time> is hidden sr-only by the stylesheet, since the
  // byline over the rule now draws that date.
  const meta = article?.querySelector<HTMLElement>('.meta') ?? null
  const slot = hero.querySelector<HTMLElement>('.cover-hero-meta')
  if (meta === null || slot === null) return
  slot.append(meta)
}

onReady(init)
