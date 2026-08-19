/**
 * A brand colour, derived from a string.
 *
 * The same tag is always the same colour, on every page, with no table to keep
 * in step with the content and nothing to add when a new tag appears. A sum of
 * character codes is a weak hash and that is fine here: the only cost of a
 * collision is two labels sharing a colour.
 *
 * This lives in its own file, rather than in taxonomy.ts where it used to,
 * for the same reason slugify does: taxonomy.ts imports ./posts, which imports
 * `astro:content`, and that module only exists on the server. Any client script
 * that reached chipColor through taxonomy.ts dragged the whole content layer
 * into the browser bundle and failed at runtime with "The astro:content module
 * is only available server-side". day-color.ts hit exactly that. Nothing here
 * imports anything, so a client script, a server page and a plain node script
 * can all use it.
 *
 * taxonomy.ts re-exports it, so the pages that already import it from there
 * keep working unchanged.
 */
const CHIP_COLORS = [
  'var(--brand-blue)',
  'var(--brand-green)',
  'var(--brand-yellow)',
  'var(--brand-red)',
  'var(--brand-purple)',
]

export interface ChipColorOptions {
  /**
   * Drops purple from the pool before hashing, rather than hashing into the
   * full five and rejecting a purple result: the header's day-hash accent
   * (day-color.ts, chosen for the real-site header) needs the pool itself
   * narrowed, since the owner asked for purple out of the accent rotation
   * for good, not out of one specific day. One hash mechanism still decides
   * the colour; this only changes which tokens it can resolve to.
   */
  excludePurple?: boolean
}

/** The tokens a hash can resolve to, narrowed by the options above. */
export function brandPool(options: ChipColorOptions = {}): string[] {
  return options.excludePurple ? CHIP_COLORS.filter((color) => color !== 'var(--brand-purple)') : CHIP_COLORS
}

/**
 * A hash that actually mixes, for callers whose inputs are near-identical.
 *
 * `chipColor` below sums character codes, which is fine for tag labels: those
 * differ wildly from each other, and a collision only costs two labels the
 * same colour. It is the wrong tool for a run of dates. Consecutive days
 * differ by a few in one or two digit positions, so the sums differ by a few
 * too, and against a pool of four (purple excluded) any difference that is a
 * multiple of four resolves to the same colour. `2026-08-19` to `2026-08-20`
 * moves the sum by exactly -8, which is why 19 and 20 drew the same colour;
 * every other decade rollover (9 to 10, 29 to 30) collides the same way.
 *
 * Multiplying by 31 before adding each character carries every digit's change
 * into the high bits instead of leaving it in the low ones, so neighbouring
 * inputs come out far apart. `>>> 0` keeps it an unsigned 32-bit integer
 * rather than letting it go negative, which would make `%` return a negative
 * index.
 *
 * This is the same arithmetic cover.ts already used for a post's slug, moved
 * here so the two cannot drift: `hashSlug` there is now this function.
 */
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
