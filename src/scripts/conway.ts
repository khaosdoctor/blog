import { readStorage, writeStorage } from '../lib/storage'
import {
  conwayCellSizePixels as CELL_SIZE,
  conwayDefaultAutoFeedSeconds as DEFAULT_AUTOFEED,
  conwayDefaultDensityPercent as DEFAULT_DENSITY,
  conwayDefaultGenerationsPerSecond as DEFAULT_GPS,
  conwayDefaultOpacity as DEFAULT_OPACITY,
  conwayMaximumAutoFeedSeconds as MAX_AUTOFEED,
  conwayMaximumDensityPercent as MAX_DENSITY,
  conwayMaximumGenerationsPerSecond as MAX_GPS,
  conwayMaximumOpacity as MAX_OPACITY,
  conwayMinimumAutoFeedSeconds as MIN_AUTOFEED,
  conwayMinimumDensityPercent as MIN_DENSITY,
  conwayMinimumGenerationsPerSecond as MIN_GPS,
  conwayMinimumOpacity as MIN_OPACITY,
} from '../lib/tweaks'
import { prefersReducedMotion } from './motion'
import { THEME_ATTR } from './scheme'
import { onReady } from './ready'

const MOTION_KEY = 'motion'
const BG_LIFE_KEY = 'background-life'
const DENSITY_KEY = 'conway-density'
const GPS_KEY = 'conway-gps'
const AUTOFEED_KEY = 'conway-autofeed'
const PAUSED_KEY = 'conway-paused'
const OPACITY_KEY = 'conway-opacity'
const MOTION_ATTR = 'data-motion'
const BG_LIFE_ATTR = 'data-bg-life'

type Motion = 'reduce' | 'allow'

function isMotion(value: string): value is Motion {
  return value === 'reduce' || value === 'allow'
}

// Cells short of the edge a glider may be placed: one spawned flush against
// the boundary hits the wall and dies within a few generations.
const EDGE_MARGIN = 3
const GLIDER_BOX = 3

const GLIDER_BASE: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]

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

function shouldRun(): boolean {
  return backgroundEnabled && !prefersReducedMotion() && !manualPaused && !tabHidden
}

function indexOf(col: number, row: number): number {
  return row * cols + col
}

// Reads the canvas's resolved `color`, not `--fg` directly: an untyped custom
// property returns unresolved text that `fillStyle` cannot parse, silently turning black.
function currentFg(): string {
  if (canvas === null) return 'currentColor'
  return getComputedStyle(canvas).color || 'currentColor'
}

// Measured against `main article`, not `main`: on a listing page `main` is the
// whole post list, which would blank the middle of the screen.
function computeExclusion(): void {
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

// Conway's B3/S23: a dead cell with exactly 3 live neighbours is born, a live
// cell with 2 or 3 survives, everything else dies. Edges do not wrap, so
// out-of-bounds neighbours count as dead and the field decays inward. Excluded
// cells (behind the article) are skipped, which also makes them dead neighbours.
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

  ctx.globalAlpha = opacity
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

// Gives up after 20 tries instead of searching exhaustively, so a full viewport skips a feed instead of stalling.
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

// Reseeds so the frozen frame isn't a mid-cycle snapshot.
function syncRunning(): void {
  const reducedNow = prefersReducedMotion()
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
  density = Math.min(MAX_DENSITY, Math.max(MIN_DENSITY, pct))
  writeStorage(DENSITY_KEY, String(density))
  seed()
}

export function setGps(value: number): void {
  gps = Math.min(MAX_GPS, Math.max(MIN_GPS, value))
  writeStorage(GPS_KEY, String(gps))
}

export function setAutoFeed(seconds: number): void {
  autoFeedSeconds = Math.min(MAX_AUTOFEED, Math.max(MIN_AUTOFEED, seconds))
  writeStorage(AUTOFEED_KEY, String(autoFeedSeconds))
}

export function setOpacity(value: number): void {
  opacity = Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, value))
  writeStorage(OPACITY_KEY, String(opacity))
  draw()
}

export function reseed(): void {
  seed()
}

// Clears the keys rather than calling the setters: a setter would write the
// literal default value, and this site represents a default as nothing stored.
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

// The click listener has to be on the document, not the canvas: the canvas's
// `z-index: -1` puts it behind for hit testing too, so it never gets a click.
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

// State must be hydrated before the canvas check: other code reads stored
// settings even on pages with no field.
function init(): void {
  const storedMotion = readStorage(MOTION_KEY)
  motionOverride = storedMotion !== null && isMotion(storedMotion) ? storedMotion : null
  backgroundEnabled = readStorage(BG_LIFE_KEY) !== '0'
  manualPaused = readStorage(PAUSED_KEY) === '1'
  density = clampNumber(readStorage(DENSITY_KEY), DEFAULT_DENSITY, MIN_DENSITY, MAX_DENSITY)
  // Must clamp to the same bounds setGps does, or a stored value gets pulled
  // back to a different range on every load.
  gps = clampNumber(readStorage(GPS_KEY), DEFAULT_GPS, MIN_GPS, MAX_GPS)
  autoFeedSeconds = clampNumber(readStorage(AUTOFEED_KEY), DEFAULT_AUTOFEED, MIN_AUTOFEED, MAX_AUTOFEED)
  opacity = clampNumber(readStorage(OPACITY_KEY), DEFAULT_OPACITY, MIN_OPACITY, MAX_OPACITY)
  applyMotionAttr()
  wasReduced = prefersReducedMotion()
  applyBgLifeAttr()

  canvas = document.querySelector<HTMLCanvasElement>('.conway-field')
  if (canvas === null) return

  resizeGrid()
  window.addEventListener('resize', resizeGrid)

  const main = document.querySelector('main')
  if (main !== null) new ResizeObserver(computeExclusion).observe(main)

  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncRunning)

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
