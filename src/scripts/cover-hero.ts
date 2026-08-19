// Draws a post's own cover into CoverHero.astro's empty container, from the
// exact same function scripts/cover.ts rasterises with sharp at build
// (buildCoverSvg, src/lib/cover.ts): one implementation, two callers, so the
// og:image and the on-page cover can never draw differently for one post.
//
// Draws once, plainly, on load; nothing here animates, so there is nothing
// prefers-reduced-motion needs to turn off.
//
// The empty export makes this a real module, same reason as theme-toggle.ts
// and the rest of src/scripts/: without one a script with no other import or
// export is global, not file-scoped, and would collide with them.
export {}

import { buildCoverSvg } from '../lib/cover'

function init(): void {
  const hero = document.querySelector<HTMLElement>('[data-cover-hero]')
  if (hero === null) return
  const canvas = hero.querySelector<HTMLElement>('.cover-hero-canvas')
  if (canvas === null) return

  const { slug, title, category, byline } = hero.dataset
  if (slug === undefined || title === undefined || category === undefined || byline === undefined) return

  canvas.innerHTML = buildCoverSvg({ slug, title, category, byline })
  hero.removeAttribute('hidden')
  hero.closest('article')?.setAttribute('data-cover-active', '')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
