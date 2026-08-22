// An 8x8 hand trace of public/favicon.svg (viewBox 64, so a cell is 8 units).
// `R` is the L, `G`/`Y`/`B` the accents. Must match MARK_RECTS below.
const SHAPE: string[] = ['RR.GGGGG', 'RR.GGGGG', 'RR.GGGGG', 'RR......', 'RRRRR.YY', 'RRRRR.YY', '........', '.BBBBBBB']

export const ROLE_TOKEN: Record<string, string> = {
  R: 'var(--brand-red)',
  G: 'var(--brand-green)',
  Y: 'var(--brand-yellow)',
  B: 'var(--brand-blue)',
}

export const MARK_RECTS = [
  { role: 'R', x: 0, y: 0, w: 14, h: 31 },
  { role: 'R', x: 0, y: 31, w: 37, h: 15 },
  { role: 'G', x: 26, y: 5, w: 38, h: 14 },
  { role: 'Y', x: 53, y: 31, w: 11, h: 15 },
  { role: 'B', x: 11, y: 59, w: 53, h: 5 },
] as const

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

// Projects the cell's centre into MARK_RECTS' 64-unit space to find its
// rectangle. A centre inside none of them uses SHAPE's hand-traced role.
function rectRoleAt(row: number, col: number): string {
  const cx = col * 8 + 4
  const cy = row * 8 + 4
  const hit = MARK_RECTS.find((rect) => cx >= rect.x && cx < rect.x + rect.w && cy >= rect.y && cy < rect.y + rect.h)
  return hit ? hit.role : roleAt(row, col)
}

// A box-drawing glyph per cell, chosen by which of its four edges are exposed.
// A wireframe reads by where the shape ends, so an interior cell is blank.
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

interface MarkCell {
  row: number
  col: number
  glyph: string
  color: string
}

export function markCells(): MarkCell[] {
  const cells: MarkCell[] = []
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      cells.push({ row, col, glyph: wireGlyph(row, col), color: ROLE_TOKEN[rectRoleAt(row, col)] ?? 'var(--rule)' })
    }
  }
  return cells
}

