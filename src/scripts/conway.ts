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
 * One fade per ground, not one shared value: 16% reads as the same faint
 * texture on true black that 3% reads on the sepia page, because the two
 * grounds start from opposite ends of the lightness scale. Measured lit-cell
 * contrast against its own ground is 1.05:1 either way, a deliberate failure
 * of the 3:1 non-text-contrast criterion: it reads as texture rather than
 * content, on purpose.
 */
const FADE_DARK = 0.16
const FADE_LIGHT = 0.03
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

function activeIsDark(): boolean {
  const attr = document.documentElement.getAttribute(THEME_ATTR)
  if (attr === 'light') return false
  if (attr === 'dark') return true
  return matchMedia('(prefers-color-scheme: dark)').matches
}

function currentFade(): number {
  return activeIsDark() ? FADE_DARK : FADE_LIGHT
}

/*
 * The page's own ink, read off the resolved custom property rather than a
 * hex kept here: --fg already carries the light-dark() pair theme.css
 * declares, so this follows a palette change for free instead of drifting
 * from it the way a copied value would.
 */
function currentFg(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || 'currentColor'
}

/*
 * The reading column, measured for real off `main` (BaseLayout gives it
 * `max-width: var(--measure)`), with a cell of slack around it: the same
 * technique PostToc.astro uses for its own outline, applied here as a cell
 * mask instead of a pixel position. Any live cell the mask starts covering
 * is cleared immediately, so a reflow never leaves one stuck behind the text.
 */
function computeExclusion(): void {
  const main = document.querySelector('main')
  if (canvas === null || main === null || cols === 0 || rows === 0) return

  const canvasBox = canvas.getBoundingClientRect()
  const mainBox = main.getBoundingClientRect()
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
} {
  return { motion: motionOverride, backgroundEnabled, paused: manualPaused, density, gps, autoFeedSeconds }
}

function onCanvasClick(event: MouseEvent): void {
  if (canvas === null || cols === 0) return
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

  canvas.addEventListener('click', onCanvasClick)

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
