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

export function chipColor(label: string): string {
  let sum = 0
  for (const char of label) sum += char.codePointAt(0) ?? 0
  return CHIP_COLORS[sum % CHIP_COLORS.length]
}
