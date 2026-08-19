// Drives BrandHeader.astro's wordmark and mark: the day-hash accent, the
// once-per-session scramble, the terminal-rate cursor and the occasional
// glitch burst on both the wordmark and the mark. Plain script, the same
// register as conway.ts and search-palette.ts, not a Vue island: this runs on
// every page through BaseLayout, and every value below is fixed rather than
// reader-adjustable, so there is no picker for a component tree to hold state
// for.
import { applyAccent } from '../lib/accent'
import { runDecode, SCRAMBLE_TICK_MS, SCRAMBLE_LOCK_TICKS, type DecodeRun } from '../lib/decode-scramble'
import { GLITCH_GLYPHS } from '../lib/logo-mark'

const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#'.split('')

// The decided cursor: terminal rate, 530ms per phase. Ramp mechanics ported
// from the bench (logoMarks.ts CURSOR_RAMP_MS/CURSOR_RAMP_FRAMES): the
// crossing between phases takes 2 opacity frames of 90ms each, a hard step
// every frame rather than a CSS transition, which would smooth the low-
// frame-rate read into a fade.
const CURSOR_RATE_MS = 530
const CURSOR_RAMP_MS = 90
const CURSOR_RAMP_FRAMES = 2

/*
 * The scramble, slowed to read as the same tempo family as the cursor
 * instead of a much faster, unrelated flicker. The bench's own tick was
 * 28ms (Doom's, borrowed for no reason specific to this animation); this is
 * 530 / 4, a quarter of the cursor's own phase, so four scramble ticks fall
 * inside one cursor half-blink. The per-letter stagger, the "typing" cadence
 * the scramble cascades through left to right, shares the cursor's own 90ms
 * ramp clock for the same reason: one shared clock rather than two unrelated
 * ones.
 *
 * The tick/lock timing itself (`SCRAMBLE_TICK_MS`/`SCRAMBLE_LOCK_TICKS`) now
 * lives in `../lib/decode-scramble`, the shared loop this and the reading
 * progress bar's own leading-edge decode both drive, so the tempo decided
 * here is the one both read rather than two copies that could drift apart.
 */
const STAGGER_MS = CURSOR_RAMP_MS

/*
 * The glitch: a burst of 1-3 pulses, a random 4-20s apart, on both the
 * wordmark and the mark together. Replaces the bench's continuous "falha"
 * animation and the mark's own fixed 2.2-4s glitch cadence, both retired in
 * favour of this single shared schedule.
 */
const GLITCH_MIN_MS = 4000
const GLITCH_MAX_MS = 20000
const PULSE_MIN_MS = 80
const PULSE_MAX_MS = 150
const PULSE_GAP_MIN_MS = 60
const PULSE_GAP_MAX_MS = 160

// sessionStorage, not localStorage: the scramble plays again on the next
// browser session (a new tab, or the same tab after the browser closes), but
// never again while clicking around the site in one sitting, since Astro
// ships static HTML and "once per page load" is otherwise once per
// navigation, which would replay it on every single click through the site.
const SCRAMBLE_SESSION_KEY = 'header-scramble-played'

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomGlyph(glyphs: string[]): string {
  return glyphs[Math.floor(Math.random() * glyphs.length)] ?? ''
}

/*
 * Reduced motion: the same convention conway.ts already reads, an explicit
 * `data-motion` override (written by settings-panel.ts) wins in both
 * directions, and the OS query decides when it is absent.
 */
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
 * The cursor's own opacity table for one full cycle (two phases, lit then
 * unlit): each phase holds at its own value for most of `CURSOR_RATE_MS`,
 * then ramps to the next phase's value over the last `CURSOR_RAMP_FRAMES`
 * frames. The ramp lives inside the phase rather than adding to it, so the
 * cycle stays at 2x `CURSOR_RATE_MS` regardless of how many ramp frames it
 * carries.
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
  const header = document.querySelector<HTMLElement>('.chrome')
  if (header === null) return

  const wordEl = header.querySelector<HTMLElement>('.word')
  const letterEls = Array.from(header.querySelectorAll<HTMLElement>('.letter'))
  const cursorEl = header.querySelector<HTMLElement>('.cursor')
  const markCharsEl = header.querySelector<HTMLElement>('.mark-chars')
  const cellEls = Array.from(header.querySelectorAll<HTMLElement>('.mark-cell'))
  if (wordEl === null || cursorEl === null || markCharsEl === null) return
  // Non-null aliases: TS narrows `wordEl`/`cursorEl`/`markCharsEl` themselves
  // right after the guard above, but not inside the function declarations
  // below that close over them, so the rest of this scope reads these three
  // instead.
  const word = wordEl
  const cursor = cursorEl
  const markChars = markCharsEl

  // Today's colour unless the reader has picked one in the settings panel;
  // lib/accent.ts owns that decision now, and its own try/catch means this
  // never blocks the rest of the header.
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

  // --- the glitch: a burst of 1-3 pulses, both wordmark and mark, 4-20s apart ---
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
   * The one place every path back to "waiting for the next burst" passes
   * through: `runPulses`'s own `remaining <= 0` exit calls this, and so does
   * `boot()` directly, on both of its own re-entry paths (the reduced-motion
   * media query change and the settings panel's own motion override). Before
   * this cleared only its own `glitchScheduleTimer`, so a `boot()` re-entry
   * while a pulse's `glitchPulseTimer`/`glitchGapTimer` were still pending
   * (mid-burst) left that old chain running: it would still call its own
   * `endPulse()` on its own timer, so nothing stayed visible forever, but two
   * independent glitch schedules end up ticking at once, which can pulse the
   * wordmark and the mark out of the 4-20s cadence this is meant to keep to.
   * `clearGlitchTimers()` now cancels all three, and `endPulse()` runs
   * unconditionally, so a re-entry here always starts from a clean, fully
   * cleared state rather than trusting whatever the previous chain was
   * mid-way through. Every road into "schedule the next one" now also
   * clears the current one first, guaranteeing the clear by construction
   * rather than by timing.
   */
  function scheduleGlitch(): void {
    clearGlitchTimers()
    endPulse()
    glitchScheduleTimer = setTimeout(
      () => runPulses(1 + Math.floor(Math.random() * 3)),
      randomBetween(GLITCH_MIN_MS, GLITCH_MAX_MS),
    )
  }

  // --- boot / freeze, prefers-reduced-motion and the settings panel's own override ---
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
        // Private mode, or storage disabled: the scramble replays next load,
        // a small cost next to the animation still running this load.
      }
      scheduleGlitch()
    })
  }

  boot()

  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    if (reduced()) freeze()
    else boot()
  })

  // The settings panel writes `data-motion` straight onto <html> (the same
  // attribute conway.ts's own setMotion writes); a MutationObserver is the
  // plain platform way to notice that without the two modules importing
  // each other.
  new MutationObserver(() => {
    if (reduced()) freeze()
    else boot()
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })

  /*
   * A pulse mid-flight (data-glitch already true, glitchPulseTimer already
   * pending) when the tab is backgrounded is the one exit `freeze()` and
   * `scheduleGlitch()` cannot already cover on their own: background tabs
   * get their timers throttled, often clamped to run far less often than
   * this pulse's own 80-150ms window, so the coloured ghosts stay painted
   * for however long the tab stays hidden, and a reader who switches back
   * and looks immediately can catch that stale frame before the delayed
   * timer gets around to firing endPulse(). Clearing the moment the tab
   * goes hidden removes the wait entirely: the resting state is guaranteed
   * at that instant rather than whenever the browser's own throttling
   * schedule happens to resume it. Coming back only re-arms the schedule
   * (scheduleGlitch, which already clears+endPulse()s defensively on its
   * own) rather than replaying the cursor or the scramble, neither of which
   * this is about.
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
