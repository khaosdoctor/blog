/**
 * The wireframe Elite mark ("fio" in the lab), the candidate the owner kept
 * from content/blog/theme-lab/components/logoMarks.ts. That file still holds
 * both survivors (this one and the "+" lattice) plus the picker machinery a
 * bench needs; this module only ports the one candidate the real header
 * actually renders, so the site never imports Vue-bench code, and only what
 * the decided header uses lives in `src/`.
 *
 * The silhouette is the same 8x8 hand trace of the five rectangles in
 * public/favicon.svg (viewBox 64, so a cell is 8 units) the lab used.
 */

/** `R` the haste of the L, `G`/`Y`/`B` the three accents, `.` the empty cell between them. */
const SHAPE: string[] = ['RR.GGGGG', 'RR.GGGGG', 'RR.GGGGG', 'RR......', 'RRRRR.YY', 'RRRRR.YY', '........', '.BBBBBBB']

export const ROLE_TOKEN: Record<string, string> = {
  R: 'var(--brand-red)',
  G: 'var(--brand-green)',
  Y: 'var(--brand-yellow)',
  B: 'var(--brand-blue)',
}

/** The five shapes, coloured for real: what the hover reveal swaps to, traced from public/favicon.svg. */
export const MARK_RECTS = [
  { role: 'R', x: 0, y: 0, w: 14, h: 31 },
  { role: 'R', x: 0, y: 31, w: 37, h: 15 },
  { role: 'G', x: 26, y: 5, w: 38, h: 14 },
  { role: 'Y', x: 53, y: 31, w: 11, h: 15 },
  { role: 'B', x: 11, y: 59, w: 53, h: 5 },
] as const

/** Glyphs the mark's own occasional glitch swaps a cell to, the same vocabulary the wordmark's glitch uses. */
export const GLITCH_GLYPHS = ['#', '%', '&', '$', '@', '?', '~']

const ROWS = SHAPE.length
const COLS = SHAPE[0].length

function filledAt(row: number, col: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false
  return SHAPE[row][col] !== '.'
}

function roleAt(row: number, col: number): string {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return '.'
  return SHAPE[row][col]
}

/**
 * The role of an 8x8 cell when the mark's colour is "all four": its centre,
 * projected into the same 64-unit space `MARK_RECTS` uses (8 units per cell),
 * decides which of the five rectangles it falls in. A cell whose centre falls
 * in none of them, the common case on a border between two or an overlap,
 * falls back to the role `SHAPE` already traced by hand for that position,
 * which is never undefined for a filled cell.
 */
function rectRoleAt(row: number, col: number): string {
  const cx = col * 8 + 4
  const cy = row * 8 + 4
  const hit = MARK_RECTS.find((rect) => cx >= rect.x && cx < rect.x + rect.w && cy >= rect.y && cy < rect.y + rect.h)
  return hit ? hit.role : roleAt(row, col)
}

/**
 * A box-drawing glyph per cell, by which edges of it are exposed: a wireframe
 * reads by where the shape ends, not by where it fills, so an interior cell
 * with no exposed edge stays blank on purpose. The same idea the Elite (1984)
 * reference draws with: vector outline, no fill, few polygons.
 */
function wireGlyph(row: number, col: number): string {
  if (!filledAt(row, col)) return ' '
  const top = !filledAt(row - 1, col)
  const bottom = !filledAt(row + 1, col)
  const left = !filledAt(row, col - 1)
  const right = !filledAt(row, col + 1)
  if (top && left) return '┌'
  if (top && right) return '┐'
  if (bottom && left) return '└'
  if (bottom && right) return '┘'
  if (top || bottom) return '─'
  if (left || right) return '│'
  return ' '
}

export interface MarkCell {
  row: number
  col: number
  glyph: string
  color: string
}

/** Every cell of the 8x8 grid, in row-major order, ready for the Astro template to render. */
export function markCells(): MarkCell[] {
  const cells: MarkCell[] = []
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      cells.push({ row, col, glyph: wireGlyph(row, col), color: ROLE_TOKEN[rectRoleAt(row, col)] ?? 'var(--rule)' })
    }
  }
  return cells
}

