/**
 * Shared shape for the six character-art logo candidates, read by
 * `LogoMark.vue` and offered as a picker by both `ChromeHeader.vue` and
 * `LogoLab.vue`. One shape in one file means the header bench and the logo
 * bench show the same mark instead of two hand-copied grids drifting apart.
 *
 * The silhouette below is the same 8x8 hand trace of the five rectangles in
 * `public/favicon.svg` (viewBox 64, so a cell is 8 units) that the earlier,
 * colour-only candidates used. What changed is not the shape, it is that
 * every candidate now draws it out of characters and cells instead of
 * colouring or clipping a picture.
 */

export const MARK_CANDIDATES = [
  { id: 'fio', name: 'wireframe Elite' },
  { id: 'lattice', name: 'grade de +' },
  { id: 'mesh', name: 'malha ciano' },
  { id: 'ramp', name: 'retrato em ramp' },
  { id: 'dither', name: 'dither de dois tons' },
  { id: 'glitch', name: 'pixel glitched' },
] as const

export type MarkCandidateId = (typeof MARK_CANDIDATES)[number]['id']

export function labelForMark(id: string): string {
  return MARK_CANDIDATES.find((candidate) => candidate.id === id)?.name ?? id
}

/**
 * Um caractere por célula tem um piso de tamanho que um vetor não tem: abaixo
 * dele o glifo encolhe para uma mancha, porque a fonte para de conseguir
 * desenhar o traço em vez de só ficar menor. O piso aqui é o tamanho total da
 * marca (px por lado) necessário para cada célula da grade ter px suficiente
 * para o olho distinguir o glifo, medido pela distinção mais fina que aquele
 * candidato pede: um contorno de caixa precisa diferenciar canto de linha
 * reta, um retrato em ramp precisa diferenciar oito níveis de densidade, um
 * "+" sozinho ou um bloco cheio não precisam de quase nada disso.
 *
 * `glitch` é vetor (SVG de verdade), então a silhueta em si não tem este
 * piso; o número aqui é o tamanho abaixo do qual a franja cromática (dois
 * pixels de deslocamento num viewBox de 64 unidades) vira sub-pixel e some,
 * o que faz o candidato voltar a ler como a marca antiga, plana e colorida.
 */
export const MARK_MIN_PX: Record<MarkCandidateId, number> = {
  fio: 72, // grade 8x8, ~9px/célula: precisa diferenciar canto de linha reta
  lattice: 64, // grade 8x8, ~8px/célula: um "+" sozinho não tem forma ambígua
  mesh: 80, // grade 8x8 mais dois anéis de SVG por cima, ~10px/célula
  ramp: 88, // grade 8x8, ~11px/célula: oito níveis de densidade para distinguir
  dither: 40, // grade 4x4, ~10px/célula, só duas densidades
  glitch: 32, // vetor: a silhueta lê bem menor, mas a franja de 2 unidades vira sub-pixel abaixo disto
}

/** Lado da grade de cada candidato, só para o relatório: `glitch` é vetor, não tem grade. */
export const MARK_GRID_SIDE: Record<MarkCandidateId, number | null> = {
  fio: 8,
  lattice: 8,
  mesh: 8,
  ramp: 8,
  dither: 4,
  glitch: null,
}

/** O tamanho pedido, nunca menor que o piso de legibilidade do candidato atual. */
export function effectiveMarkPx(candidate: MarkCandidateId, desiredPx: number): number {
  return Math.max(desiredPx, MARK_MIN_PX[candidate])
}

/**
 * O tamanho de partida ao trocar de candidato pelo seletor: 96px cobre o piso
 * dos cinco candidatos em grade sem sobra nenhuma. `glitch` é o único vetor
 * dos seis, o de piso mais baixo (32px), então ele tem espaço de sobra para
 * começar menor, o que o dono pediu depois de ver o candidato pela primeira
 * vez grande demais.
 */
export const MARK_DEFAULT_PX: Record<MarkCandidateId, number> = {
  fio: 96,
  lattice: 96,
  mesh: 96,
  ramp: 96,
  dither: 96,
  glitch: 48,
}

/** Glifos do glitch, usados tanto pelo wordmark (`LogoLab.vue`) quanto pela marca (`LogoMark.vue`), o mesmo vocabulário nos dois lugares. */
export const GLITCH_GLYPHS = ['#', '%', '&', '$', '@', '?', '~']

/** `R` a haste do L, `G`/`Y`/`B` os três acentos, `.` o vão entre eles. */
export const SHAPE: string[] = ['RR.GGGGG', 'RR.GGGGG', 'RR.GGGGG', 'RR......', 'RRRRR.YY', 'RRRRR.YY', '........', '.BBBBBBB']

export const ROLE_TOKEN: Record<string, string> = {
  R: 'var(--brand-red)',
  G: 'var(--brand-green)',
  Y: 'var(--brand-yellow)',
  B: 'var(--brand-blue)',
}

/** As cinco formas originais, para o candidato "glitch", que ainda desenha retângulos de verdade. */
export const MARK_RECTS = [
  { role: 'R', x: 0, y: 0, w: 14, h: 31 },
  { role: 'R', x: 0, y: 31, w: 37, h: 15 },
  { role: 'G', x: 26, y: 5, w: 38, h: 14 },
  { role: 'Y', x: 53, y: 31, w: 11, h: 15 },
  { role: 'B', x: 11, y: 59, w: 53, h: 5 },
] as const

const ROWS = SHAPE.length
const COLS = SHAPE[0].length

function filledAt(row: number, col: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false
  return SHAPE[row][col] !== '.'
}

export function roleAt(row: number, col: number): string {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return '.'
  return SHAPE[row][col]
}

/**
 * Um glifo de desenho de caixa por célula, segundo as bordas expostas dela: um
 * wireframe lê pelo lugar onde a forma termina, não pelo lugar onde ela
 * preenche, então uma célula interior, sem nenhuma borda exposta, fica vazia
 * de propósito. É a mesma ideia da referência Elite (1984): contorno vetorial,
 * sem preenchimento, poucos polígonos.
 */
export function wireGlyph(row: number, col: number): string {
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

const RAMP = [' ', '.', ':', '+', '*', '▒', '▓', '█']

/**
 * Uma luz vinda do canto superior esquerdo: as células mais perto dele usam
 * glifo esparso (luz), as mais longe usam glifo denso (sombra), a mesma
 * convenção de um retrato ASCII, só que aplicada à marca em vez de a um rosto.
 */
export function rampGlyph(row: number, col: number): string {
  if (!filledAt(row, col)) return ' '
  const distance = (row + col) / (ROWS + COLS - 2)
  const index = Math.min(RAMP.length - 1, Math.floor(distance * RAMP.length))
  return RAMP[index]
}

export interface DitherBlock {
  glyph: string
  tone: string
}

/**
 * A marca reamostrada numa grade 4x4 (blocos de 2x2 da grade original), célula
 * bem maior, só duas densidades alternando em xadrez. É a técnica das peças
 * 3D em ASCII de célula grande: o olho lê a alternância como curva, não como
 * dois tons planos.
 */
export function ditherBlockAt(row: number, col: number): DitherBlock | null {
  const r0 = row * 2
  const c0 = col * 2
  const filled = filledAt(r0, c0) || filledAt(r0, c0 + 1) || filledAt(r0 + 1, c0) || filledAt(r0 + 1, c0 + 1)
  if (!filled) return null
  const dark = (row + col) % 2 === 0
  return dark ? { glyph: '█', tone: 'var(--fg)' } : { glyph: '▒', tone: 'var(--muted)' }
}
