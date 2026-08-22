// 133ms is a quarter of the header cursor's 530ms blink phase, so every decode
// effect on the page reads as one tempo family.
export const SCRAMBLE_TICK_MS = 133
export const SCRAMBLE_LOCK_TICKS = 4

interface DecodeItem {
  start: number
  scramble: () => void
  /** Must be idempotent: called again on every tick after the item locks. */
  lock: () => void
}

interface DecodeTiming {
  tickMs: number
  lockTicks: number
}

export interface DecodeRun {
  cancel: () => void
}

// One interval drives every item: each scrambles from its own `start` offset for `lockTicks` ticks,
// then locks; `onDone` fires on the first tick where all have locked.
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
