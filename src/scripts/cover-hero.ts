// Draws a post's own cover into CoverHero.astro's empty container, from the
// exact same function scripts/cover.ts rasterises with sharp at build
// (buildCoverSvg, src/lib/cover.ts): one implementation, two callers, so the
// og:image and the on-page cover can never draw differently for one post.
//
// With one exception, and it is the reason `drawMeta: false` is passed below.
// The card's last line is the category chip and the reading time, and both are
// real, working things on the page: the chip is a link to the category and the
// reading time is a hover control with its own popup (ReadingTime.astro,
// scripts/reading-time-hover.ts). Painting those as SVG text and hiding the
// originals would leave a picture of a link. So the SVG leaves that slot
// empty, this script moves the page's own `.meta` row into the card's overlay
// slot, and `coverOverlay` (the same layout the drawing itself reads) says
// where and in what inks it goes.
//
// Draws once, plainly, on load; nothing here animates, so there is nothing
// prefers-reduced-motion needs to turn off.
//
// The empty export makes this a real module, same reason as theme-toggle.ts
// and the rest of src/scripts/: without one a script with no other import or
// export is global, not file-scoped, and would collide with them.
export {}

import { buildCoverSvg, coverOverlay } from '../lib/cover'

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
  hero.style.setProperty('--cover-chip-ink', overlay.chipInk)
  hero.style.setProperty('--cover-meta-ink', overlay.textInk)

  const article = hero.closest('article')
  hero.removeAttribute('hidden')
  article?.setAttribute('data-cover-active', '')

  // Last, and deliberately so: everything above can be undone by the reader
  // reloading, but a `.meta` moved into a container that never had its
  // `hidden` taken off would be a chip and a reading time nobody can see. Move
  // it once the card is already on the page and there is somewhere visible to
  // put it.
  //
  // Moved, not copied: the same `<a>` with the same href, the same span the
  // reading-time script upgrades into a button, the same everything. The
  // `<time>` inside it and the separator glued to it are hidden the sr-only
  // way by the stylesheet, since the byline over the rule now draws that date.
  const meta = article?.querySelector<HTMLElement>('.meta') ?? null
  const slot = hero.querySelector<HTMLElement>('.cover-hero-meta')
  if (meta === null || slot === null) return
  slot.append(meta)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
