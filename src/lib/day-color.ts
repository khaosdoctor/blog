import { brandPool, type ChipColorOptions, hashString } from './chip-color'

// Local calendar day, not UTC: this runs client-side, so the day that matters
// is the reader's own. `toISOString` would give the UTC day instead.
function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Uses hashString, not chipColor's character-sum: consecutive dates differ by only a few in one digit,
// so against a small pool the sums collide on a cycle.
export function dayColor(date: Date = new Date(), options: ChipColorOptions = {}): string {
  const pool = brandPool(options)
  return pool[hashString(dayKey(date)) % pool.length]
}
