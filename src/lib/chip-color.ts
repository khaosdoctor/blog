const CHIP_COLORS = [
  'var(--brand-blue)',
  'var(--brand-green)',
  'var(--brand-yellow)',
  'var(--brand-red)',
  'var(--brand-purple)',
]

export interface ChipColorOptions {
  // Narrows the pool before hashing rather than rejecting a purple result
  // after it, so the hash still decides the colour in one step.
  excludePurple?: boolean
}

export function brandPool(options: ChipColorOptions = {}): string[] {
  return options.excludePurple ? CHIP_COLORS.filter((color) => color !== 'var(--brand-purple)') : CHIP_COLORS
}

// Multiplying by 31 before adding each character carries a change in any position up into the high bits,
// so near-identical inputs end up far apart; `>>> 0` keeps the hash an unsigned 32-bit int so `%` stays non-negative.
export function hashString(value: string): number {
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

export function chipColor(label: string, options: ChipColorOptions = {}): string {
  const pool = brandPool(options)
  let sum = 0
  for (const char of label) sum += char.codePointAt(0) ?? 0
  return pool[sum % pool.length]
}
