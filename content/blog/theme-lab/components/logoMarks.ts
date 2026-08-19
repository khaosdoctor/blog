/**
 * Shared shape for the two surviving character-art logo candidates, read by
 * `LogoMark.vue` and offered as a picker by `ChromeHeader.vue`. One shape in
 * one file means the header bench and the mark inside it never drift apart.
 *
 * The silhouette below is the same 8x8 hand trace of the five rectangles in
 * `public/favicon.svg` (viewBox 64, so a cell is 8 units) that the earlier,
 * colour-only candidates used, and that `MARK_RECTS` below still draws in
 * full colour for the hover reveal in `LogoMark.vue`.
 *
 * Four other candidates (malha ciano, retrato em ramp, dither de dois tons,
 * pixel glitched) were tried and lost: the owner kept only this wireframe and
 * the `+` lattice. They are not gone, `content/blog/theme-lab-arquivo/components/logoMarks-retiradas.ts`
 * and `RetiredLogoMarks.vue` still render them, importing `SHAPE`, `roleAt` and
 * `filledAt` from here rather than re-tracing the silhouette a second time.
 */

export const MARK_CANDIDATES = [
  { id: 'fio', name: 'wireframe Elite' },
  { id: 'lattice', name: 'grade de +' },
] as const

export type MarkCandidateId = (typeof MARK_CANDIDATES)[number]['id']

export function labelForMark(id: string): string {
  return MARK_CANDIDATES.find((candidate) => candidate.id === id)?.name ?? id
}

/**
 * Um caractere por célula tem um piso de tamanho que um vetor não tem: abaixo
 * dele o glifo encolhe para uma mancha, porque a fonte para de conseguir
 * desenhar o traço em vez de só ficar menor. Isto já foi um teto rígido no
 * slider (nunca deixava o tamanho descer abaixo dele); o dono pediu o slider
 * de 0 a 300px inteiro, então agora é só informativo: o piso aparece no
 * relatório e no aviso da bancada, e o tamanho escolhido pode ficar abaixo
 * dele se for isso que se quer ver.
 */
export const MARK_MIN_PX: Record<MarkCandidateId, number> = {
  fio: 72, // grade 8x8, ~9px/célula: precisa diferenciar canto de linha reta
  lattice: 64, // grade 8x8, ~8px/célula: um "+" sozinho não tem forma ambígua
}

/** Lado da grade de cada candidato, só para o relatório. */
export const MARK_GRID_SIDE: Record<MarkCandidateId, number> = {
  fio: 8,
  lattice: 8,
}

/** O tamanho de partida ao trocar de candidato pelo seletor. */
export const MARK_DEFAULT_PX: Record<MarkCandidateId, number> = {
  fio: 96,
  lattice: 96,
}

/**
 * A cor da marca, a mesma ideia do seletor "destaque" que `ChromeHeader.vue`
 * já usa para o resto do cabeçalho: um só acento por vez, nunca um arco-íris
 * por célula. O dono pediu os dois sobreviventes coloridos; verde é o acento
 * único recomendado em `docs/theming.md` seção 11, então é o padrão daqui.
 */
export const MARK_ACCENTS: Record<string, string> = {
  verde: 'var(--brand-green)',
  amarelo: 'var(--brand-yellow)',
  azul: 'var(--brand-blue)',
  vermelho: 'var(--brand-red)',
  roxo: 'var(--brand-purple)',
  traço: 'var(--fg)',
}

export const MARK_DEFAULT_ACCENT = 'verde'

/**
 * Taxa do cursor de bloco, o efeito composável que qualquer candidato de
 * cabeçalho pode ligar (`docs/theming.md` seção 3 para a proveniência).
 * `doom` é o tique do menu do Doom, 8 tiques a 35 tiques/s, de `m_menu.c`.
 * `vga` é o hardware puro: o VGA em modo texto pisca o cursor a cada 16
 * quadros verticais, 1,875Hz, sem ajuste por software num PC de verdade
 * (https://www.osdever.net/FreeVGA/vga/textcur.htm). As duas taxas são reais,
 * próximas mas não iguais, e o ponto de ter as duas nomeadas é justamente
 * esse: nenhuma delas é a "certa", são dois hardwares diferentes.
 */
export const CURSOR_RATES: Record<string, number> = {
  doom: 228.6,
  vga: 266.7,
}

export const CURSOR_RATE_OPTIONS = [
  { id: 'doom', name: 'Doom (228,6ms, menu M_SKULL)' },
  { id: 'vga', name: 'VGA (266,7ms, hardware)' },
]

/** Glifos do glitch, usados pelo wordmark e pela marca "fio", o mesmo vocabulário nos dois lugares. */
export const GLITCH_GLYPHS = ['#', '%', '&', '$', '@', '?', '~']

/** `R` a haste do L, `G`/`Y`/`B` os três acentos, `.` o vão entre eles. */
export const SHAPE: string[] = ['RR.GGGGG', 'RR.GGGGG', 'RR.GGGGG', 'RR......', 'RRRRR.YY', 'RRRRR.YY', '........', '.BBBBBBB']

export const ROLE_TOKEN: Record<string, string> = {
  R: 'var(--brand-red)',
  G: 'var(--brand-green)',
  Y: 'var(--brand-yellow)',
  B: 'var(--brand-blue)',
}

/** As cinco formas originais, coloridas de verdade: o que o hover revela em `LogoMark.vue`. */
export const MARK_RECTS = [
  { role: 'R', x: 0, y: 0, w: 14, h: 31 },
  { role: 'R', x: 0, y: 31, w: 37, h: 15 },
  { role: 'G', x: 26, y: 5, w: 38, h: 14 },
  { role: 'Y', x: 53, y: 31, w: 11, h: 15 },
  { role: 'B', x: 11, y: 59, w: 53, h: 5 },
] as const

const ROWS = SHAPE.length
const COLS = SHAPE[0].length

/** Exportado para os candidatos aposentados (`logoMarks-retiradas.ts`), que precisam da mesma silhueta. */
export function filledAt(row: number, col: number): boolean {
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
