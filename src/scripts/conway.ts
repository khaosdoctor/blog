// The Conway "game of life" background.
//
// Ported from the theme lab's bench with four differences: the canvas covers
// the viewport rather than a bench div, the excluded region is the real article
// rather than a simulated one, the values Lucas decided are fixed rather than
// knobs, and this module exports a control surface settings-panel.ts calls.
//
import { readStorage, writeStorage } from '../lib/storage'
import { onReady } from './ready'

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

// Cell size and click-adds-a-glider are fixed. Density, generations per second,
// the auto-feed interval and opacity are defaults the settings panel can move.
const CELL_SIZE = 12
const DEFAULT_DENSITY = 10
const DEFAULT_GPS = 6
const DEFAULT_AUTOFEED = 3
const MIN_GPS = 1
const MAX_GPS = 25
/*
 * One value for both grounds, which is a real trade: the light page now draws
 * at whatever the dark page does, and 9% on sepia is stronger than the 3% that
 * ground had when the two were separate. A knob whose meaning changes with the
 * theme is worse than one that holds still.
 *
 * Lit-cell contrast is around 1.05:1, a deliberate failure of the 3:1
 * non-text-contrast criterion: this draws texture, not content.
 */
const DEFAULT_OPACITY = 0.04
const MIN_OPACITY = 0
const MAX_OPACITY = 0.5
/* Slack around a glider so it does not spawn touching the viewport edge and die
   within a few generations. */
const EDGE_MARGIN = 3
const GLIDER_BOX = 3

/** The classic glider, as offsets from the seeded cell in a 3x3 box. */
const GLIDER_BASE: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]

/** Rotates a shape 90 degrees, so every glider does not travel one diagonal. */
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

// Plain module-level variables rather than anything reactive: a cell is read
// and written thousands of times per generation, and this is a canvas loop.
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

/* The override wins in BOTH directions: an explicit "allow" beats an OS that
   asks for less motion, as well as the other way round. */
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
 * Read off the canvas's own resolved `color`, NOT the `--fg` custom property.
 * This is the fix for the field being invisible for weeks.
 *
 * `getPropertyValue('--fg')` returns the SPECIFIED value of a custom property,
 * which for an untyped one is the literal text `light-dark(#14120e, #f3f1ee)`:
 * custom properties carry a raw token stream and only resolve when consumed by
 * a real typed property. Handing that to `fillStyle` asks the canvas to resolve
 * `light-dark()` outside any element's used `color-scheme`, and a fillStyle it
 * cannot parse is silently left at its default, black. Black cells on the black
 * page read as nothing.
 *
 * `body` sets `color: var(--fg)` and this canvas inherits it, so reading
 * `.color` gets the COMPUTED value, which is always a resolved colour.
 */
function currentFg(): string {
  if (canvas === null) return 'currentColor'
  return getComputedStyle(canvas).color || 'currentColor'
}

/*
 * The mask that keeps the field off the text, measured with a cell of slack.
 * Any live cell the mask starts covering is cleared, so a reflow never leaves
 * one stuck behind the words.
 */
function computeExclusion(): void {
  /*
   * The article, not `main`. Only a post has one: `main` on a listing page is
   * the post list and the pagination, so measuring against it blanked the
   * middle of the page and confined the field to the margins. With no article
   * there is nothing to keep clear, so the field takes the whole viewport.
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

/** `Math.random()` here is live decoration, not the deterministic seed a
 * build-time image would need. */
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
 * Reduced motion never starts the loop rather than pausing it partway: crossing
 * into "reduced" stops and reseeds, so what stays on screen is a fresh static
 * frame rather than whatever instant the loop was cut at. Every other reason to
 * stop (manual pause, the reader's toggle, a hidden tab) leaves the frame as it
 * was.
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

// --- The control surface settings-panel.ts calls. Plain exports rather than an
// event bus: both are ES modules bundled together. ---

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
  gps = Math.min(MAX_GPS, Math.max(MIN_GPS, value))
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

/*
 * Every key this module owns, back to default, for reset-all.
 *
 * One call rather than seven setters, because the setters are the wrong shape:
 * `setDensity(10)` writes the literal "10", a stored value that happens to
 * equal the default, where this site stores a default as nothing stored.
 *
 * It re-applies as well as clearing, so the screen matches what is now stored.
 * `seed()` and `syncRunning()` are both safe on a page with no canvas.
 */
export function resetSettings(): void {
  motionOverride = null
  backgroundEnabled = true
  manualPaused = false
  density = DEFAULT_DENSITY
  gps = DEFAULT_GPS
  autoFeedSeconds = DEFAULT_AUTOFEED
  opacity = DEFAULT_OPACITY
  for (const key of [MOTION_KEY, BG_LIFE_KEY, DENSITY_KEY, GPS_KEY, AUTOFEED_KEY, PAUSED_KEY, OPACITY_KEY]) writeStorage(key, null)
  applyMotionAttr()
  applyBgLifeAttr()
  seed()
  syncRunning()
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
 * On the document, not the canvas, and that is why clicking used to do nothing.
 *
 * The canvas is `z-index: -1`, and a negative-z-index element is behind for HIT
 * TESTING as well as painting. `body` covers the viewport, so it is the topmost
 * element under the pointer everywhere the content is not, including the
 * gutters: the canvas never received a click anywhere.
 *
 * Listening on the document means deciding what a click means. Anything
 * interactive or selectable belongs to the page, so `closest()` bails out and a
 * link still navigates. A drag that selected text is not a click either, which
 * is what the collapsed-selection check is for. A click inside the reading
 * column needs no rule: the mask already covers it.
 */
const CLICK_THROUGH = 'a, button, input, select, textarea, label, summary, details, [role="button"], [tabindex]'

function onDocumentClick(event: MouseEvent): void {
  if (canvas === null || cols === 0) return
  if (event.defaultPrevented || event.button !== 0) return

  const target = event.target
  if (target instanceof Element && target.closest(CLICK_THROUGH) !== null) return

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
 * State is hydrated before the canvas check, not after: settings-panel.ts
 * imports this module and calls getSettings() whether or not the field is on
 * the current page, and it needs the stored values rather than these defaults.
 */
function init(): void {
  const storedMotion = readStorage(MOTION_KEY)
  motionOverride = storedMotion !== null && isMotion(storedMotion) ? storedMotion : null
  backgroundEnabled = readStorage(BG_LIFE_KEY) !== '0'
  manualPaused = readStorage(PAUSED_KEY) === '1'
  density = clampNumber(readStorage(DENSITY_KEY), DEFAULT_DENSITY, 1, 20)
  // The same bounds setGps clamps to. They drifted apart once, when the range
  // moved from 0.5-8 to 1-25 and only the setter was updated: a stored 20 was
  // then pulled back to 8 on every load.
  gps = clampNumber(readStorage(GPS_KEY), DEFAULT_GPS, MIN_GPS, MAX_GPS)
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

  // theme-toggle.ts owns data-theme and dispatches nothing when it changes it,
  // so an observer is the plain way to notice a change made by a script this
  // one has no other reason to import.
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

onReady(init)
