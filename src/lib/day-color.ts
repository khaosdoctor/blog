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
 * Reuses chipColor's own hash-a-string-into-one-of-five-brand-tokens mechanism
 * (taxonomy.ts, the same one that colours tag chips and a post's own accent
 * stripe, see [...slug].astro) rather than inventing a second hash or a
 * private list of hexes: the string handed to it here is the day's own key
 * instead of a slug or a tag label, so every "pick a brand colour
 * deterministically from a string" caller in the codebase agrees on one
 * mechanism and one palette.
 */
import { chipColor } from './taxonomy'

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
 */
export function dayColor(date: Date = new Date()): string {
  return chipColor(dayKey(date))
}
