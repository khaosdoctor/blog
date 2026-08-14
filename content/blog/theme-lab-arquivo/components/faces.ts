/**
 * As duas fontes de corpo decididas, que é tudo que sobrou nesta bancada.
 *
 * A Literata é o padrão e a Atkinson Hyperlegible é a opção sem serifa; o menu de
 * preferências troca entre as duas, e cada uma carrega as medidas com que foi
 * escolhida (tamanho, entrelinha e entreletra diferentes, ver
 * `src/styles/theme.css`). O painel continua aqui porque ajustar essas medidas
 * depois é mais fácil vendo o post de verdade mudar do que editando um token no
 * escuro.
 *
 * As candidatas recusadas não foram apagadas: estão em
 * `../../theme-lab-arquivo/components/faces-retiradas.ts`, com o motivo de cada
 * uma, porque é isso que o artigo sobre o redesenho vai contar.
 *
 * `pixelStep` é o passo em que a fonte fica nítida: `0` quer dizer que ela é
 * vetorial de verdade e escala em qualquer tamanho.
 */

export interface Face {
  id: string
  /** O que vai em `font-family`. */
  stack: string
  name: string
  licence: string
  /** Onde ela aguenta: corpo de texto, título, ou só etiqueta. */
  role: 'corpo' | 'título' | 'etiqueta'
  mono: boolean
  pixelStep: number
  note: string
  /** As medidas escolhidas para ela, que são o padrão quando ela é selecionada. */
  metrics: { size: number; leading: number; tracking: number; words: number }
}

export const FACES: Face[] = [
  {
    id: 'literata',
    stack: "'Literata', ui-serif, Georgia, serif",
    name: 'Literata',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Decidida como padrão do corpo. Desenhada pelo Google para o Play Books, ou seja, para leitura longa em tela e não para papel, o que aparece no fim do segundo parágrafo num fundo preto.',
    metrics: { size: 18, leading: 163, tracking: 5, words: 15 },
  },
  {
    id: 'atkinson',
    stack: "'Atkinson Hyperlegible', ui-sans-serif, sans-serif",
    name: 'Atkinson Hyperlegible',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Decidida como a opção sem serifa. Encomendada pelo Braille Institute para leitores de baixa visão: cada letra desenhada para não se confundir com nenhuma outra. Precisa de 20px e menos entrelinha que a Literata para ler no mesmo tamanho aparente.',
    metrics: { size: 20, leading: 153, tracking: 0, words: 15 },
  },
]

export const BODY_FACE_OPTIONS = FACES.map((face) => ({
  id: face.id,
  name: `${face.name} · ${face.licence}`,
}))

export function faceById(id: string): Face {
  return FACES.find((face) => face.id === id) ?? FACES[0]
}
