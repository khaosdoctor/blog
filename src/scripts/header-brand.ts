import { applyAccent } from '../lib/accent'
import { runDecode, SCRAMBLE_TICK_MS, SCRAMBLE_LOCK_TICKS, type DecodeRun } from '../lib/decode-scramble'
import { GLITCH_GLYPHS } from '../lib/logo-mark'
import {
  cursorBlinkPhaseMilliseconds as CURSOR_RATE_MS,
  cursorRampFrameCount as CURSOR_RAMP_FRAMES,
  cursorRampMilliseconds as CURSOR_RAMP_MS,
  glitchMaximumIntervalMilliseconds as GLITCH_MAX_MS,
  glitchMinimumIntervalMilliseconds as GLITCH_MIN_MS,
  glitchPulseGapMaximumMilliseconds as PULSE_GAP_MAX_MS,
  glitchPulseGapMinimumMilliseconds as PULSE_GAP_MIN_MS,
  glitchPulseMaximumMilliseconds as PULSE_MAX_MS,
  glitchPulseMinimumMilliseconds as PULSE_MIN_MS,
} from '../lib/tweaks'
import { prefersReducedMotion as reduced } from './motion'
import { onReady } from './ready'

const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#'.split('')

const STAGGER_MS = CURSOR_RAMP_MS

// sessionStorage, not localStorage: the scramble replays in a new browser
// session but not on every navigation.
const SCRAMBLE_SESSION_KEY = 'header-scramble-played'

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomGlyph(glyphs: string[]): string {
  return glyphs[Math.floor(Math.random() * glyphs.length)] ?? ''
}

// The ramp is drawn inside its phase rather than added to it, so one cycle
// stays 2x CURSOR_RATE_MS whatever the ramp frame count is.
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
  const word = wordEl
  const cursor = cursorEl
  const markChars = markCharsEl

  applyAccent()

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
    setCursorOpacity(1)
  }

  let scrambleRun: DecodeRun | null = null

  function resolveLetters(): void {
    for (const el of letterEls) el.textContent = el.dataset.ch ?? ''
  }

  function runScramble(onDone: () => void): void {
    // Lock the width before emptying the letters, or the wordmark collapses
    // for the length of the animation and the phone header reflows around it.
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

  // Every path back to waiting for the next burst goes through here and must
  // clear all three timers, or re-entering boot() mid-burst doubles the chain.
  function scheduleGlitch(): void {
    clearGlitchTimers()
    endPulse()
    glitchScheduleTimer = setTimeout(
      () => runPulses(1 + Math.floor(Math.random() * 3)),
      randomBetween(GLITCH_MIN_MS, GLITCH_MAX_MS),
    )
  }

  function freeze(): void {
    stopCursor()
    scrambleRun?.cancel()
    scrambleRun = null
    clearGlitchTimers()
    endPulse()
    resolveLetters()
  }

  function playedThisSession(): boolean {
    try {
      return sessionStorage.getItem(SCRAMBLE_SESSION_KEY) !== null
    } catch {
      return false
    }
  }

  function boot(): void {
    if (reduced()) {
      freeze()
      return
    }
    startCursor()
    if (playedThisSession()) {
      resolveLetters()
      scheduleGlitch()
      return
    }
    runScramble(() => {
      try {
        sessionStorage.setItem(SCRAMBLE_SESSION_KEY, '1')
      } catch {
        // Private mode: the scramble just replays on the next load.
      }
      scheduleGlitch()
    })
  }

  boot()

  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    if (reduced()) freeze()
    else boot()
  })

  new MutationObserver(() => {
    if (reduced()) freeze()
    else boot()
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })

  // Background timers are throttled far past a pulse's own window, so a pulse
  // in flight when the tab hides would stay painted until it returns.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearGlitchTimers()
      endPulse()
    } else if (!reduced()) {
      scheduleGlitch()
    }
  })
}

onReady(init)
