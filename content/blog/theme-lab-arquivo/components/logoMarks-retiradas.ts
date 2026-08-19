/**
 * Os quatro candidatos de marca que perderam, com o motivo de cada um.
 *
 * Saíram de `../../theme-lab/components/logoMarks.ts` quando o dono decidiu
 * ficar só com o wireframe ("fio") e a grade de `+` ("lattice"). A silhueta,
 * `filledAt` e `roleAt` continuam vindo de lá: a forma nunca mudou, só o
 * número de jeitos de desenhá-la.
 */

import { GLITCH_GLYPHS, MARK_RECTS, ROLE_TOKEN, SHAPE, filledAt, wireGlyph } from '../../theme-lab/components/logoMarks'

export interface RetiredMark {
  id: 'mesh' | 'ramp' | 'dither' | 'glitch'
  name: string
  reason: string
}

export const RETIRED_MARKS: RetiredMark[] = [
  {
    id: 'mesh',
    name: 'malha ciano',
    reason:
      'Precisava de um fundo azulado por trás da grade e dois anéis de SVG cruzando por cima, mais peças que qualquer outro candidato só para sugerir "wireframe 3D". Lia como uma imagem com um efeito por cima dela, não como uma marca desenhada em caractere.',
  },
  {
    id: 'ramp',
    name: 'retrato em ramp',
    reason:
      'Pede oito níveis de densidade (o gradiente de luz vindo do canto superior esquerdo) para o olho distinguir, numa marca de 8x8 células. É a mesma técnica de um retrato ASCII aplicada a uma forma pequena demais para carregá-la: de longe vira uma mancha cinza, não um L.',
  },
  {
    id: 'dither',
    name: 'dither de dois tons',
    reason:
      'Reamostra a marca numa grade 4x4, um quarto da resolução do fio e do lattice. A geometria real do L com os três acentos não sobrevive a essa reamostragem, então o que sobra é um xadrez que só lê como "algo ali", não como o logo.',
  },
  {
    id: 'glitch',
    name: 'pixel glitched',
    reason:
      'É, sem disfarce, os cinco retângulos originais do favicon com uma franja cromática e três pixels soltos por cima. De todos os seis, é o que menos abandona a marca antiga que este redesenho inteiro existe para substituir: ainda lê como imagem colorida, não como algo desenhado para um terminal.',
  },
]

export { ROLE_TOKEN, SHAPE, filledAt, wireGlyph, MARK_RECTS, GLITCH_GLYPHS }

const ROWS = SHAPE.length
const COLS = SHAPE[0].length
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

