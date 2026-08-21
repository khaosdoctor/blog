// BrandHeader's wordmark and mark: the accent, the once-per-session scramble,
// the terminal-rate cursor, and the glitch burst on both.
//
// A plain script rather than an island: this runs on every page and every value
// below is fixed rather than reader-adjustable, so there is no state for a
// component tree to hold.
import { applyAccent } from '../lib/accent'
import { runDecode, SCRAMBLE_TICK_MS, SCRAMBLE_LOCK_TICKS, type DecodeRun } from '../lib/decode-scramble'
import { GLITCH_GLYPHS } from '../lib/logo-mark'

const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#'.split('')

// Terminal rate, 530ms a phase. The crossing between phases is 2 hard opacity
// steps of 90ms rather than a CSS transition, which would smooth the
// low-frame-rate read into a fade.
const CURSOR_RATE_MS = 530
const CURSOR_RAMP_MS = 90
const CURSOR_RAMP_FRAMES = 2

/*
 * The scramble's per-letter stagger shares the cursor's own 90ms clock, so the
 * two read as one tempo rather than two unrelated ones. The tick and lock
 * timings live in lib/decode-scramble, shared with the reading progress.
 */
const STAGGER_MS = CURSOR_RAMP_MS

// A burst of 1-3 pulses, 4-20s apart, on the wordmark and the mark together.
const GLITCH_MIN_MS = 4000
const GLITCH_MAX_MS = 20000
const PULSE_MIN_MS = 80
const PULSE_MAX_MS = 150
const PULSE_GAP_MIN_MS = 60
const PULSE_GAP_MAX_MS = 160

// sessionStorage, not localStorage: the scramble should play again in a new
// browser session but never while clicking around the site in one sitting.
// Astro ships static HTML, so "once per page load" would mean once per
// navigation.
const SCRAMBLE_SESSION_KEY = 'header-scramble-played'

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomGlyph(glyphs: string[]): string {
  return glyphs[Math.floor(Math.random() * glyphs.length)] ?? ''
}

/* The same convention conway.ts reads: an explicit `data-motion` wins in both
   directions, and the OS query decides when it is absent. */
function motionOverride(): 'reduce' | 'allow' | null {
  const attr = document.documentElement.getAttribute('data-motion')
  return attr === 'reduce' || attr === 'allow' ? attr : null
}

function osReduced(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

function reduced(): boolean {
  const override = motionOverride()
  if (override === 'reduce') return true
  if (override === 'allow') return false
  return osReduced()
}

/**
 * One full cycle of the cursor's opacity, lit then unlit: each phase holds,
 * then ramps to the next over its last frames. The ramp lives inside the phase
 * rather than adding to it, so the cycle stays 2x CURSOR_RATE_MS however many
 * ramp frames it carries.
 */
function buildCursorFrames(): number[] {
  const perPhase = Math.max(CURSOR_RAMP_FRAMES + 1, Math.round(CURSOR_RATE_MS / CURSOR_RAMP_MS))
  const hold = perPhase - CURSOR_RAMP_FRAMES
  const frames: number[] = []
  for (const [from, to] of [
    [1, 0],
    [0, 1],
  ]) {
    for (let i = 0; i < hold; i += 1) frames.push(from)
    for (let i = 1; i <= CURSOR_RAMP_FRAMES; i += 1) frames.push(from + ((to - from) * i) / (CURSOR_RAMP_FRAMES + 1))
  }
  return frames
}
function init(): void {
  const header = document.querySelector<HTMLElement>('.shell')
  if (header === null) return

  const wordEl = header.querySelector<HTMLElement>('.word')
  const letterEls = Array.from(header.querySelectorAll<HTMLElement>('.letter'))
  const cursorEl = header.querySelector<HTMLElement>('.cursor')
  const markCharsEl = header.querySelector<HTMLElement>('.mark-chars')
  const cellEls = Array.from(header.querySelectorAll<HTMLElement>('.mark-cell'))
  if (wordEl === null || cursorEl === null || markCharsEl === null) return
  // TS narrows the originals after the guard, but not inside the closures
  // below, so the rest of this scope reads these aliases instead.
  const word = wordEl
  const cursor = cursorEl
  const markChars = markCharsEl

  // Today's colour unless the reader pinned one. lib/accent.ts owns that, and
  // its own try/catch means this never blocks the rest of the header.
  applyAccent()

  // --- the cursor ---
  const cursorFrames = buildCursorFrames()
  let cursorFrame = 0
  let cursorTimer: ReturnType<typeof setInterval> | null = null

  function setCursorOpacity(value: number): void {
    cursor.style.opacity = String(value)
  }

  function startCursor(): void {
    if (cursorTimer !== null) clearInterval(cursorTimer)
    cursorTimer = setInterval(() => {
      cursorFrame = (cursorFrame + 1) % cursorFrames.length
      setCursorOpacity(cursorFrames[cursorFrame] ?? 1)
    }, CURSOR_RAMP_MS)
  }

  function stopCursor(): void {
    if (cursorTimer !== null) clearInterval(cursorTimer)
    cursorTimer = null
    cursorFrame = 0
    setCursorOpacity(1) // rest frame: solid, never a mid-ramp value
  }

  // --- the scramble, once per session ---
  let scrambleRun: DecodeRun | null = null

  function resolveLetters(): void {
    for (const el of letterEls) el.textContent = el.dataset.ch ?? ''
  }

  function runScramble(onDone: () => void): void {
    // Locked to the resolved text's width before the letters empty out:
    // without this the wordmark narrows to its min for the whole animation,
    // the wrapped phone header re-flows around it and the page shifts
    // (measured CLS 0.10 on every post).
    word.style.minInlineSize = `${word.getBoundingClientRect().width}px`
    for (const el of letterEls) el.textContent = ''
    const items = letterEls.map((el, i) => {
      const ch = el.dataset.ch ?? ''
      const start = i * STAGGER_MS + randomBetween(150, 350)
      return {
        start,
        scramble: (): void => {
          el.textContent = randomGlyph(SCRAMBLE_GLYPHS)
        },
        lock: (): void => {
          el.textContent = ch
        },
      }
    })
    scrambleRun = runDecode(items, { tickMs: SCRAMBLE_TICK_MS, lockTicks: SCRAMBLE_LOCK_TICKS }, () => {
      scrambleRun = null
      onDone()
    })
  }

  // --- the glitch ---
  let glitchScheduleTimer: ReturnType<typeof setTimeout> | null = null
  let glitchPulseTimer: ReturnType<typeof setTimeout> | null = null
  let glitchGapTimer: ReturnType<typeof setTimeout> | null = null

  function clearGlitchTimers(): void {
    if (glitchScheduleTimer !== null) clearTimeout(glitchScheduleTimer)
    if (glitchPulseTimer !== null) clearTimeout(glitchPulseTimer)
    if (glitchGapTimer !== null) clearTimeout(glitchGapTimer)
    glitchScheduleTimer = null
    glitchPulseTimer = null
    glitchGapTimer = null
  }

  function endPulse(): void {
    word.removeAttribute('data-glitch')
    for (const cell of cellEls) {
      cell.textContent = cell.dataset.glyph ?? ''
      cell.classList.remove('torn')
    }
    markChars.style.transform = ''
  }

  function pulseWordmark(): void {
    word.style.setProperty('--glitch-a', `${(Math.random() * 4 - 2).toFixed(1)}px`)
    word.style.setProperty('--glitch-b', `${(Math.random() * 4 - 2).toFixed(1)}px`)
    word.style.setProperty('--glitch-band', `inset(${Math.floor(Math.random() * 60)}% 0 ${Math.floor(Math.random() * 30)}% 0)`)
    word.setAttribute('data-glitch', 'true')
  }

  function pulseMark(): void {
    const kind = Math.floor(Math.random() * 3)
    if (kind === 0 && cellEls.length > 0) {
      const cell = cellEls[Math.floor(Math.random() * cellEls.length)]
      if (cell !== undefined) cell.textContent = randomGlyph(GLITCH_GLYPHS)
    } else if (kind === 1) {
      const col = String(Math.floor(Math.random() * 8))
      for (const cell of cellEls) if (cell.dataset.col === col) cell.classList.add('torn')
    } else {
      const direction = Math.random() < 0.5 ? -1 : 1
      markChars.style.transform = `translateX(${(4.5 * direction).toFixed(2)}px)`
    }
  }

  function runPulses(remaining: number): void {
    if (remaining <= 0 || reduced()) {
      scheduleGlitch()
      return
    }
    pulseWordmark()
    pulseMark()
    glitchPulseTimer = setTimeout(() => {
      endPulse()
      glitchGapTimer = setTimeout(() => runPulses(remaining - 1), randomBetween(PULSE_GAP_MIN_MS, PULSE_GAP_MAX_MS))
    }, randomBetween(PULSE_MIN_MS, PULSE_MAX_MS))
  }

  /*
   * Every path back to "waiting for the next burst" goes through here, and it
   * clears all three timers plus the pulse itself.
   *
   * It used to clear only its own schedule timer, so re-entering boot() during
   * a burst left the old pulse chain running: nothing stayed visible forever,
   * but two schedules ticked at once and the 4-20s cadence stopped holding.
   */
  function scheduleGlitch(): void {
    clearGlitchTimers()
    endPulse()
    glitchScheduleTimer = setTimeout(
      () => runPulses(1 + Math.floor(Math.random() * 3)),
      randomBetween(GLITCH_MIN_MS, GLITCH_MAX_MS),
    )
  }

  // --- boot and freeze ---
  function freeze(): void {
    stopCursor()
    scrambleRun?.cancel()
    scrambleRun = null
    clearGlitchTimers()
    endPulse()
    resolveLetters() // rest frame: the whole name, no mid-scramble glyph left behind
  }

  function boot(): void {
    if (reduced()) {
      freeze()
      return
    }
    startCursor()
    if (sessionStorage.getItem(SCRAMBLE_SESSION_KEY) !== null) {
      resolveLetters()
      scheduleGlitch()
      return
    }
    runScramble(() => {
      try {
        sessionStorage.setItem(SCRAMBLE_SESSION_KEY, '1')
      } catch {
        // Private mode: the scramble replays next load, a small cost next to
        // the animation still running this one.
      }
      scheduleGlitch()
    })
  }

  boot()

  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    if (reduced()) freeze()
    else boot()
  })

  // The settings panel writes `data-motion` on <html>, the same attribute
  // conway.ts writes. An observer notices it without the two importing each
  // other.
  new MutationObserver(() => {
    if (reduced()) freeze()
    else boot()
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })

  /*
   * A pulse in flight when the tab is backgrounded is the one case the two
   * above cannot cover: background timers are throttled well past this pulse's
   * own 80-150ms window, so the coloured ghosts stay painted for as long as the
   * tab is hidden and a reader switching back can catch that stale frame.
   * Clearing on hide guarantees the resting state at that instant.
   */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearGlitchTimers()
      endPulse()
    } else if (!reduced()) {
      scheduleGlitch()
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
