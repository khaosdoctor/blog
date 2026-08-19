/**
 * The decode/scramble mechanism the header wordmark introduced
 * (header-brand.ts's own `runScramble`): a queue of items, each starting at
 * its own offset, that step through a caller-supplied "still scrambling"
 * callback once per tick for a fixed number of ticks, then lock to a
 * caller-supplied final callback. header-brand.ts (the wordmark's letters)
 * and ReadingProgress.astro (the progress bar's leading edge) both drive it
 * now, through this one loop rather than each keeping its own copy.
 *
 * Timing is the caller's own: `SCRAMBLE_TICK_MS`/`SCRAMBLE_LOCK_TICKS` below
 * are the wordmark's own decided tempo (133ms/tick, a quarter of the header
 * cursor's 530ms phase, so it reads as one tempo family; 4 ticks to lock),
 * exported so a second caller can match it exactly rather than inventing a
 * slightly different one that reads as an unrelated animation. A caller with
 * its own reason to run at a different tempo still can: both are arguments
 * to `runDecode`, never constants baked into the loop. This is the same
 * shape the header's own glitch schedule was rebuilt into after the bench
 * ran the mark and wordmark glitches on two separate clocks; nothing here
 * should grow a second, parallel scramble loop the same way.
 */

export const SCRAMBLE_TICK_MS = 133
export const SCRAMBLE_LOCK_TICKS = 4

export interface DecodeItem {
  /** ms after the run starts before this item begins scrambling. */
  start: number
  /** Called once per tick while the item is still scrambling. */
  scramble: () => void
  /**
   * Called once the item has locked. Kept simple like the wordmark's own
   * original loop: called again on every later tick too (idempotent), not
   * just the first time it locks.
   */
  lock: () => void
}

export interface DecodeTiming {
  tickMs: number
  lockTicks: number
}

export interface DecodeRun {
  /** Stops the run immediately, without calling any item's `lock` or `onDone`. */
  cancel: () => void
}

/**
 * Steps every item's `scramble` once per tick from its own `start` onward,
 * for `timing.lockTicks` ticks, then calls `lock`. Calls `onDone` once every
 * item has locked, and returns a handle to cancel the run early (a
 * reduced-motion toggle mid-run, or a new run superseding this one).
 */
export function runDecode(items: DecodeItem[], timing: DecodeTiming, onDone: () => void): DecodeRun {
  const queue = items.map((item) => ({ ...item, end: item.start + timing.lockTicks * timing.tickMs }))
  let frame = 0
  let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
    frame += timing.tickMs
    let allLocked = true
    for (const item of queue) {
      if (frame < item.start) {
        allLocked = false
      } else if (frame < item.end) {
        item.scramble()
        allLocked = false
      } else {
        item.lock()
      }
    }
    if (allLocked) {
      if (timer !== null) clearInterval(timer)
      timer = null
      onDone()
    }
  }, timing.tickMs)

  return {
    cancel(): void {
      if (timer !== null) clearInterval(timer)
      timer = null
    },
  }
}
