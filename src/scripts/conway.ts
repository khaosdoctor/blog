// The Conway "game of life" background, ported from the bench
// (content/blog/theme-lab/components/GameOfLife.vue) onto the real site. Same
// mechanism, four differences: this canvas covers the whole viewport instead
// of a bench "stage" div, the excluded region is the real reading column
// (`main`, see BaseLayout) rather than a simulated article box, the settings
// this file does not own (cell size, per-ground fade, click mode, the bench's
// simulated column width) are fixed at the owner's decided values instead of
// reader-adjustable knobs, and this module exports a small control surface
// (setMotion, setBackgroundEnabled, setPaused, setDensity, setGps, setAutoFeed,
// reseed, getSettings) that SettingsPanel.astro's script calls directly rather
// than the bench's own Vue knobs.
//
// The empty export makes this a real module, same reason as theme-toggle.ts
// and code-theme.ts: a script with no other import or export is global rather
// than file-scoped, and its names would otherwise collide with theirs.
export {}

const MOTION_KEY = 'motion'
const BG_LIFE_KEY = 'background-life'
const DENSITY_KEY = 'conway-density'
const GPS_KEY = 'conway-gps'
const AUTOFEED_KEY = 'conway-autofeed'
const PAUSED_KEY = 'conway-paused'
const OPACITY_KEY = 'conway-opacity'
const THEME_ATTR = 'data-theme'
const MOTION_ATTR = 'data-motion'
const BG_LIFE_ATTR = 'data-bg-life'

type Motion = 'reduce' | 'allow'

function isMotion(value: string): value is Motion {
  return value === 'reduce' || value === 'allow'
}

/*
 * Decided configuration (docs/design.md, docs/decisions-log.md). Cell size,
 * click-adds-a-glider and the two per-ground fades are the owner's own
 * values, fixed here rather than reader knobs; density, generations per
 * second and the auto-feed interval are the same numbers as *defaults*, but
 * the settings panel can move all three (see the exported setters below).
 */
const CELL_SIZE = 12
const DEFAULT_DENSITY = 10
const DEFAULT_GPS = 8
const DEFAULT_AUTOFEED = 4
/*
 * Cell opacity, now one reader-adjustable value rather than two fixed ones.
 *
 * This went through three positions worth recording, because the last one
 * looks like a regression from the second and is not. It started as a fixed
 * pair, 16% on the dark ground and 3% on the sepia one, chosen so each would
 * read as the same faint texture from opposite ends of the lightness scale.
 * Then the field proved to have been invisible the whole time for an unrelated
 * reason (the fill resolved to black on black, see `currentFg()`), so no one
 * had ever actually judged those numbers against a drawn field. With it
 * finally visible the owner asked for 5% off, then decided the value should be
 * a knob in the settings panel instead, at 0.08 to open on.
 *
 * So the per-ground split is gone from here: one knob cannot mean two numbers,
 * and a knob whose meaning changes with the theme is worse than one that holds
 * still. **The consequence is that the light ground now draws at whatever the
 * dark ground draws at**, and 8% on sepia is stronger than the 3% that ground
 * was given when the two were separate. That is a real change in how the light
 * page reads, and it is reported rather than hidden behind a scale factor.
 *
 * Measured lit-cell contrast stays around 1.05:1, a deliberate failure of the
 * 3:1 non-text-contrast criterion: this draws texture, not content.
 */
const DEFAULT_OPACITY = 0.08
const MIN_OPACITY = 0
const MAX_OPACITY = 0.5
/* Cells of slack around a glider so it does not spawn already touching the
   viewport edge and die within a few generations. */
const EDGE_MARGIN = 3
const GLIDER_BOX = 3

/** Offsets of the classic glider from the clicked/seeded cell, in a 3x3 box. */
const GLIDER_BASE: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]

/** Rotates a shape 90 degrees inside a `size`x`size` box, so every glider does not travel the same diagonal. */
function rotate90(cells: Array<[number, number]>, size: number): Array<[number, number]> {
  return cells.map(([c, r]) => [size - 1 - r, c])
}

const GLIDER_ORIENTATIONS: Array<Array<[number, number]>> = [GLIDER_BASE]
for (let i = 0; i < 3; i++) GLIDER_ORIENTATIONS.push(rotate90(GLIDER_ORIENTATIONS[GLIDER_ORIENTATIONS.length - 1], GLIDER_BOX))

function clampNumber(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode, or storage disabled: the choice still applies for this page.
  }
}

// Mutable simulation state. Kept as plain module-level variables rather than
// anything reactive: a cell is read and written thousands of times per
// generation, and this is a canvas loop, not a component tree.
let motionOverride: Motion | null = null
let backgroundEnabled = true
let manualPaused = false
let density = DEFAULT_DENSITY
let gps = DEFAULT_GPS
let autoFeedSeconds = DEFAULT_AUTOFEED
let opacity = DEFAULT_OPACITY
let tabHidden = false
let wasReduced = false
let isRunning = false

let canvas: HTMLCanvasElement | null = null
let cols = 0
let rows = 0
let grid = new Uint8Array(0)
let excluded = new Uint8Array(0)

function osReduced(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

/*
 * The master switch overrides the OS setting in both directions: an explicit
 * "reduce" wins even when the OS has no preference, and an explicit "allow"
 * wins even when the OS asks for less motion. Absent, today's behaviour is
 * exactly the OS query, unchanged.
 */
function effectiveReduced(): boolean {
  if (motionOverride === 'reduce') return true
  if (motionOverride === 'allow') return false
  return osReduced()
}

function shouldRun(): boolean {
  return backgroundEnabled && !effectiveReduced() && !manualPaused && !tabHidden
}

function indexOf(col: number, row: number): number {
  return row * cols + col
}

function currentFade(): number {
  return opacity
}

/*
 * The page's own ink, read off the canvas element's own resolved `color`
 * rather than the `--fg` custom property directly. This is not a stylistic
 * preference: `getComputedStyle(html).getPropertyValue('--fg')` returns the
 * *specified* value of a custom property, which for an untyped property is
 * the literal text `light-dark(#14120e, #f3f1ee)`, unresolved, because
 * custom properties carry a raw token stream and only get resolved when
 * actually consumed by a real, typed property. Handing that literal string
 * to `ctx.fillStyle` asks the canvas to resolve `light-dark()` outside any
 * element's used `color-scheme`, which is not guaranteed to work, and a
 * fillStyle the canvas cannot parse is silently left at its default, black.
 * Black cells at 16% alpha over the dark ground's own black page read as
 * nothing, which matches the report exactly.
 *
 * `body` already sets `color: var(--fg)`, a real property, and this canvas
 * inherits it (no `color` of its own). Reading `.color` off the canvas
 * itself asks the browser for that property's *computed* value, which by
 * definition is always a resolved colour (rgb()/color()), never a bare
 * function call, so it still follows a palette change for free, the same
 * as before, without depending on light-dark() being resolvable outside a
 * styled element.
 */
function currentFg(): string {
  if (canvas === null) return 'currentColor'
  return getComputedStyle(canvas).color || 'currentColor'
}

/*
 * The reading column, measured for real off `main` (BaseLayout gives it
 * `max-width: var(--measure)`), with a cell of slack around it: the same
 * technique PostToc.astro uses for its own outline, applied here as a cell
 * mask instead of a pixel position. Any live cell the mask starts covering
 * is cleared immediately, so a reflow never leaves one stuck behind the text.
 */
function computeExclusion(): void {
  /*
   * The article, not `main`. The mask exists so the field never draws behind
   * the text of a post, and only a post has one: `main` on a listing page is
   * the post list, the pagination and nothing a reader is reading through, so
   * measuring against it blanked the middle of the page and left the field
   * confined to the margins. With no article on the page there is nothing to
   * keep clear, so the field takes the whole viewport.
   */
  const article = document.querySelector('main article')
  if (canvas === null || cols === 0 || rows === 0) return
  if (article === null) {
    excluded.fill(0)
    return
  }

  const canvasBox = canvas.getBoundingClientRect()
  const mainBox = article.getBoundingClientRect()
  const pad = CELL_SIZE

  const colStart = Math.max(0, Math.floor((mainBox.left - canvasBox.left - pad) / CELL_SIZE))
  const colEnd = Math.min(cols - 1, Math.ceil((mainBox.right - canvasBox.left + pad) / CELL_SIZE))
  const rowStart = Math.max(0, Math.floor((mainBox.top - canvasBox.top - pad) / CELL_SIZE))
  const rowEnd = Math.min(rows - 1, Math.ceil((mainBox.bottom - canvasBox.top + pad) / CELL_SIZE))

  excluded.fill(0)
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const idx = indexOf(col, row)
      excluded[idx] = 1
      grid[idx] = 0
    }
  }
  draw()
}

function seed(): void {
  const total = cols * rows
  for (let i = 0; i < total; i++) grid[i] = excluded[i] === 1 ? 0 : Math.random() < density / 100 ? 1 : 0
  draw()
}

function resizeGrid(): void {
  if (canvas === null) return
  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

  cols = Math.max(1, Math.floor(width / CELL_SIZE))
  rows = Math.max(1, Math.floor(height / CELL_SIZE))
  grid = new Uint8Array(cols * rows)
  excluded = new Uint8Array(cols * rows)
  computeExclusion()
  seed()
}

function step(): void {
  const c = cols
  const r = rows
  const next = new Uint8Array(c * r)
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      const idx = row * c + col
      if (excluded[idx] === 1) continue
      let neighbours = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = row + dr
          const cc = col + dc
          if (rr < 0 || rr >= r || cc < 0 || cc >= c) continue
          neighbours += grid[rr * c + cc]
        }
      }
      const alive = grid[idx] === 1
      next[idx] = alive ? (neighbours === 2 || neighbours === 3 ? 1 : 0) : neighbours === 3 ? 1 : 0
    }
  }
  grid = next
}

function draw(): void {
  if (canvas === null) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = window.innerWidth
  const height = window.innerHeight
  ctx.clearRect(0, 0, width, height)

  ctx.globalAlpha = currentFade()
  ctx.fillStyle = currentFg()
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[indexOf(col, row)] === 1) ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    }
  }
  ctx.globalAlpha = 1
}

function placeGlider(col: number, row: number, orientation: Array<[number, number]> = GLIDER_BASE): void {
  for (const [dc, dr] of orientation) {
    const c = col + dc
    const r = row + dr
    if (c < 0 || c >= cols || r < 0 || r >= rows) continue
    const idx = indexOf(c, r)
    if (excluded[idx] === 1) continue
    grid[idx] = 1
  }
}

function boxOverlapsExclusion(col: number, row: number): boolean {
  for (let dr = 0; dr < GLIDER_BOX; dr++) {
    for (let dc = 0; dc < GLIDER_BOX; dc++) {
      if (excluded[indexOf(col + dc, row + dr)] === 1) return true
    }
  }
  return false
}

/** `Math.random()` here is live-effect decoration (a glider's position and
 * rotation), not the deterministic seed a build-time image would need. */
function feedGlider(): void {
  const c = cols
  const r = rows
  const colSpan = c - EDGE_MARGIN * 2 - GLIDER_BOX
  const rowSpan = r - EDGE_MARGIN * 2 - GLIDER_BOX
  if (colSpan < 0 || rowSpan < 0) return

  for (let attempt = 0; attempt < 20; attempt++) {
    const col = EDGE_MARGIN + Math.floor(Math.random() * (colSpan + 1))
    const row = EDGE_MARGIN + Math.floor(Math.random() * (rowSpan + 1))
    if (boxOverlapsExclusion(col, row)) continue
    const orientation = GLIDER_ORIENTATIONS[Math.floor(Math.random() * GLIDER_ORIENTATIONS.length)]
    placeGlider(col, row, orientation)
    draw()
    return
  }
}

let rafId: number | null = null
let lastStep = 0
let lastAutoSeed = 0

function tick(timestamp: number): void {
  rafId = requestAnimationFrame(tick)

  if (autoFeedSeconds > 0 && timestamp - lastAutoSeed >= autoFeedSeconds * 1000) {
    lastAutoSeed = timestamp
    feedGlider()
  }

  const interval = 1000 / gps
  if (timestamp - lastStep < interval) return
  lastStep = timestamp
  step()
  draw()
}

function startLoop(): void {
  if (rafId !== null) return
  lastStep = 0
  lastAutoSeed = 0
  rafId = requestAnimationFrame(tick)
}

function stopLoop(): void {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
}

/*
 * The strong rule for reduced motion: never start the loop rather than
 * starting it and pausing partway. Whenever the effective state crosses into
 * "reduced", the loop stops and the field reseeds once, so what stays on
 * screen is a fresh static frame rather than whatever instant the loop
 * happened to be cut at. Anything else that stops the loop (manual pause,
 * the reader's own toggle, a hidden tab) leaves the current frame exactly as
 * it was.
 */
function syncRunning(): void {
  const reducedNow = effectiveReduced()
  if (reducedNow && !wasReduced) {
    stopLoop()
    seed()
  }
  wasReduced = reducedNow

  const next = shouldRun()
  if (next === isRunning) return
  isRunning = next
  if (next) startLoop()
  else stopLoop()
}

function applyMotionAttr(): void {
  if (motionOverride === null) document.documentElement.removeAttribute(MOTION_ATTR)
  else document.documentElement.setAttribute(MOTION_ATTR, motionOverride)
}

function applyBgLifeAttr(): void {
  if (backgroundEnabled) document.documentElement.removeAttribute(BG_LIFE_ATTR)
  else document.documentElement.setAttribute(BG_LIFE_ATTR, 'off')
}

// --- Public control surface, called directly by settings-panel.ts. Plain
// exported functions rather than a custom event bus: both modules are ES
// modules bundled together, so a direct import is the simplest way for the
// panel to reach the field it controls. ---

export function setMotion(value: Motion | null): void {
  motionOverride = value
  writeStorage(MOTION_KEY, value)
  applyMotionAttr()
  syncRunning()
}

export function setBackgroundEnabled(enabled: boolean): void {
  backgroundEnabled = enabled
  writeStorage(BG_LIFE_KEY, enabled ? null : '0')
  applyBgLifeAttr()
  syncRunning()
}

export function setPaused(paused: boolean): void {
  manualPaused = paused
  writeStorage(PAUSED_KEY, paused ? '1' : null)
  syncRunning()
}

export function setDensity(pct: number): void {
  density = Math.min(20, Math.max(1, pct))
  writeStorage(DENSITY_KEY, String(density))
  seed()
}

export function setGps(value: number): void {
  gps = Math.min(8, Math.max(0.5, value))
  writeStorage(GPS_KEY, String(gps))
}

export function setAutoFeed(seconds: number): void {
  autoFeedSeconds = Math.min(20, Math.max(0, seconds))
  writeStorage(AUTOFEED_KEY, String(autoFeedSeconds))
}

/** Redraws immediately rather than waiting for the next generation: the reader
    is dragging a slider and needs to see the result while dragging it. */
export function setOpacity(value: number): void {
  opacity = Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, value))
  writeStorage(OPACITY_KEY, String(opacity))
  draw()
}

export function reseed(): void {
  seed()
}

export function getSettings(): {
  motion: Motion | null
  backgroundEnabled: boolean
  paused: boolean
  density: number
  gps: number
  autoFeedSeconds: number
  opacity: number
} {
  return { motion: motionOverride, backgroundEnabled, paused: manualPaused, density, gps, autoFeedSeconds, opacity }
}

/*
 * Listened for on the document, not on the canvas, and that is the whole
 * reason clicking used to do nothing.
 *
 * The canvas is `position: fixed; z-index: -1` so the header, main and footer
 * paint over it as ordinary in-flow boxes. But a negative z-index element is
 * not just painted behind them, it is behind them for hit testing too, and
 * `body` covers the entire viewport: it is the topmost element under the
 * pointer everywhere the page's own content is not, including the gutters.
 * So the canvas never received a click anywhere, and the component's comment
 * claiming clicks reach it "in the gutters" was wrong.
 *
 * Listening on the document avoids stacking altogether, at the cost of having
 * to decide what a click means. Two rules do that:
 *
 * A click on something interactive or selectable belongs to the page, never to
 * the field. `closest()` on an anchor, button, input, label, summary or any
 * focusable thing bails out, so a link still navigates and a caption is still
 * selectable. A drag that selected text is also not a click on the background,
 * which is what the collapsed-selection check is for.
 *
 * A click inside the reading column is already excluded by the mask, so it
 * needs no separate rule: `excluded[idx]` covers it, the same as before.
 */
const CLICK_THROUGH = 'a, button, input, select, textarea, label, summary, details, [role="button"], [tabindex]'

function onDocumentClick(event: MouseEvent): void {
  if (canvas === null || cols === 0) return
  if (event.defaultPrevented || event.button !== 0) return

  const target = event.target
  if (target instanceof Element && target.closest(CLICK_THROUGH) !== null) return

  // A click that ends a text selection is a drag, not a tap on the background.
  const selection = document.getSelection()
  if (selection !== null && !selection.isCollapsed) return

  const box = canvas.getBoundingClientRect()
  const col = Math.floor((event.clientX - box.left) / CELL_SIZE)
  const row = Math.floor((event.clientY - box.top) / CELL_SIZE)
  if (col < 0 || col >= cols || row < 0 || row >= rows) return
  const idx = indexOf(col, row)
  if (excluded[idx] === 1) return
  placeGlider(col, row)
  draw()
}

/*
 * State hydration and attribute application happen before the canvas check
 * below, not after: SettingsPanel.astro's script imports this module and
 * calls getSettings() regardless of whether the field itself is on the
 * current page, and it needs the real stored values rather than this
 * module's hardcoded defaults on a page where `.conway-field` is somehow
 * missing.
 */
function init(): void {
  const storedMotion = readStorage(MOTION_KEY)
  motionOverride = storedMotion !== null && isMotion(storedMotion) ? storedMotion : null
  backgroundEnabled = readStorage(BG_LIFE_KEY) !== '0'
  manualPaused = readStorage(PAUSED_KEY) === '1'
  density = clampNumber(readStorage(DENSITY_KEY), DEFAULT_DENSITY, 1, 20)
  gps = clampNumber(readStorage(GPS_KEY), DEFAULT_GPS, 0.5, 8)
  autoFeedSeconds = clampNumber(readStorage(AUTOFEED_KEY), DEFAULT_AUTOFEED, 0, 20)
  opacity = clampNumber(readStorage(OPACITY_KEY), DEFAULT_OPACITY, MIN_OPACITY, MAX_OPACITY)
  wasReduced = effectiveReduced()
  applyMotionAttr()
  applyBgLifeAttr()

  canvas = document.querySelector<HTMLCanvasElement>('.conway-field')
  if (canvas === null) return

  resizeGrid()
  window.addEventListener('resize', resizeGrid)

  const main = document.querySelector('main')
  if (main !== null) new ResizeObserver(computeExclusion).observe(main)

  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncRunning)

  // theme-toggle.ts owns data-theme and does not dispatch anything when it
  // changes it; a MutationObserver is the plain platform way to notice a
  // change made by a script this one has no other reason to import.
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: [THEME_ATTR] })

  document.addEventListener('visibilitychange', () => {
    tabHidden = document.hidden
    syncRunning()
  })

  document.addEventListener('click', onDocumentClick)

  if (shouldRun()) {
    isRunning = true
    startLoop()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
