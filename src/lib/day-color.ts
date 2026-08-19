/**
 * A brand colour, deterministic for a given day: the same calendar day always
 * hashes to the same one of the five brand tokens (theme.css), and it holds
 * until the calendar rolls over. General on purpose, per the owner's own note
 * when he asked for the search palette's block cursor colour: "keep this
 * general because we will use this generated color later on." Nothing about
 * the palette lives here; this module only knows how to turn a date into a
 * colour, so any later feature that wants "today's colour" imports this
 * directly instead of copying the palette's own logic.
 *
 * Reads the same brand pool chip-color.ts hands every other "pick a colour
 * from a string" caller (tag chips, a post's own cover tone), rather than
 * keeping a private list of hexes, so all of them agree on one palette.
 *
 * It does NOT use chipColor's own sum-of-character-codes hash, which is the
 * one thing here that differs from a tag chip. That sum is fine for labels
 * that differ wildly and useless for a run of dates: `2026-08-19` and
 * `2026-08-20` sum eight apart, and against a four-token pool an eight
 * resolves to the same index, so those two days drew the same colour, as did
 * every other decade rollover. `hashString` mixes properly; its own comment
 * in chip-color.ts has the full derivation.
 *
 * Imported from ./chip-color rather than from taxonomy.ts, which re-exports
 * it: taxonomy.ts imports ./posts, which imports `astro:content`, and that
 * module only exists on the server. Reaching chipColor through taxonomy.ts
 * pulled the whole content layer into the browser bundle and threw "The
 * astro:content module is only available server-side" at runtime.
 */
import { brandPool, hashString, type ChipColorOptions } from './chip-color'

/**
 * `YYYY-MM-DD` for whatever calendar day `date` falls on, in local time. This
 * only ever runs client-side (the one caller today is a client script), so
 * "the current day" means the reader's own clock, not the server's or UTC's:
 * a date built from `getFullYear`/`getMonth`/`getDate` reads the local
 * calendar day the way `toISOString`'s UTC-based day would not.
 */
function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Today's brand colour, as a `var(--brand-*)` string ready to drop straight
 * into a `style.background` (or any other) assignment. Takes `date` only so a
 * caller near midnight, or a future test, can pass one in explicitly; every
 * real caller just calls `dayColor()`.
 *
 * `options` passes straight through to `chipColor`: the header's own wordmark
 * accent (header-brand.ts) calls this with `{ excludePurple: true }`, since
 * the owner asked purple out of that rotation. The search palette's cursor,
 * the original caller, still calls this with no options and keeps seeing all
 * five.
 */
export function dayColor(date: Date = new Date(), options: ChipColorOptions = {}): string {
  const pool = brandPool(options)
  return pool[hashString(dayKey(date)) % pool.length]
}
