/**
 * Todo tipo que o laboratório carrega, com a licença e o veredito de bancada
 * junto. `pixelStep` é o passo em que a fonte fica nítida: `0` quer dizer que ela
 * é vetorial de verdade e escala em qualquer tamanho; `16` quer dizer que ela é
 * um bitmap traçado e só fecha no grid em múltiplos de 16.
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
}

export const FACES: Face[] = [
  {
    id: 'departure',
    stack: "'Departure Mono', ui-monospace, monospace",
    name: 'Departure Mono',
    licence: 'OFL 1.1',
    role: 'título',
    mono: true,
    pixelStep: 0,
    note: 'Decidida para título. Pixel de verdade e vetorial, então escala em qualquer tamanho. Altura-x baixa: em 16px o texto corrido parece menor do que é.',
  },
  {
    id: 'ibmvga',
    stack: "'PxPlus IBM VGA8', ui-monospace, monospace",
    name: 'PxPlus IBM VGA 9x16',
    licence: 'CC BY-SA 4.0',
    role: 'título',
    mono: true,
    pixelStep: 16,
    note: 'Decidida para subtítulo. O DOS literal. Bitmap traçado: nítido em 16, 32 e 48px, borrado em qualquer valor no meio. Share-alike, então exige atribuição.',
  },
  {
    id: 'plex',
    stack: "'IBM Plex Mono', ui-monospace, monospace",
    name: 'IBM Plex Mono',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    note: 'Lê bem e aguenta três mil palavras sem discussão. A dúvida é outra: por ser monoespaçada, um parágrafo inteiro nela pode se confundir com trecho de código no meio do post.',
  },
  {
    id: 'sharetech',
    stack: "'Share Tech Mono', ui-monospace, monospace",
    name: 'Share Tech Mono',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    note: 'Terminal sem ser pixel. Mais estreita que a Plex, cabe mais coluna na mesma medida.',
  },
  {
    id: 'vt323',
    stack: "'VT323', ui-monospace, monospace",
    name: 'VT323',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    note: 'Desenhada a partir do terminal DEC VT320. Traço fino e altura grande: precisa de 20px para cima e de contraste alto.',
  },
  {
    id: 'dotgothic',
    stack: "'DotGothic16', sans-serif",
    name: 'DotGothic16',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Matriz de pontos japonesa, proporcional. A que mais parece um Game Boy sem ficar ilegível em texto corrido.',
  },
  {
    id: 'pixelify',
    stack: "'Pixelify Sans', sans-serif",
    name: 'Pixelify Sans',
    licence: 'OFL 1.1',
    role: 'título',
    mono: false,
    pixelStep: 0,
    note: 'Quatro pesos em um eixo variável, o que é raro em fonte pixel. Boa em título, cansativa em parágrafo.',
  },
  {
    id: 'silkscreen',
    stack: "'Silkscreen', sans-serif",
    name: 'Silkscreen',
    licence: 'OFL 1.1',
    role: 'etiqueta',
    mono: false,
    pixelStep: 0,
    note: 'Minúscula por natureza. Funciona em etiqueta de 10px em caixa alta e falha em qualquer coisa maior que uma frase.',
  },
  {
    id: 'pressstart',
    stack: "'Press Start 2P', ui-monospace, monospace",
    name: 'Press Start 2P',
    licence: 'OFL 1.1',
    role: 'etiqueta',
    mono: true,
    pixelStep: 0,
    note: 'O NES literal, e a fonte mais larga daqui: cada caractere ocupa o dobro. Bonita em quatro palavras, impossível em quarenta.',
  },
  {
    id: 'jersey',
    stack: "'Jersey 10', sans-serif",
    name: 'Jersey 10',
    licence: 'OFL 1.1',
    role: 'título',
    mono: false,
    pixelStep: 0,
    note: 'Condensada e alta, no espírito de placar de estádio. Título de post gigante em uma linha só.',
  },
  {
    id: 'micro5',
    stack: "'Micro 5', sans-serif",
    name: 'Micro 5',
    licence: 'OFL 1.1',
    role: 'etiqueta',
    mono: false,
    pixelStep: 0,
    note: 'Desenhada em cinco pixels de altura. Só existe como enfeite grande; em tamanho de leitura vira ruído.',
  },
  {
    id: 'handjet',
    stack: "'Handjet', sans-serif",
    name: 'Handjet',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'A segunda melhor opção de matriz de pontos para corpo, mas só nesse tamanho e espaçamento: abaixo disso a malha de pontos atropela a leitura.',
  },
  {
    id: 'inter',
    stack: "'Inter', ui-sans-serif, sans-serif",
    name: 'Inter',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Sem serifa desenhada para tela desde o início: altura-x grande, contraste baixo entre traços. O padrão de fato para interface, e um contraponto justo aos pixel fonts.',
  },
  {
    id: 'roboto',
    stack: "'Roboto', ui-sans-serif, sans-serif",
    name: 'Roboto',
    licence: 'Apache 2.0',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'A geométrica do Android, quase onipresente. Mais neutra que a Inter, com menos personalidade própria.',
  },
  {
    id: 'sourceserif',
    stack: "'Source Serif 4', ui-serif, Georgia, serif",
    name: 'Source Serif 4',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Serifa de livro, irmã da Source Sans. A opção que mais lembra tipografia impressa entre as fontes aqui.',
  },
  {
    id: 'literata',
    stack: "'Literata', ui-serif, Georgia, serif",
    name: 'Literata',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Desenhada pelo Google para o Play Books: serifa pensada especificamente para leitura longa em tela.',
  },
  {
    id: 'atkinson',
    stack: "'Atkinson Hyperlegible', ui-sans-serif, sans-serif",
    name: 'Atkinson Hyperlegible',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    note: 'Encomendada pelo Braille Institute para leitores de baixa visão: cada letra desenhada para não se confundir com nenhuma outra. O oposto do risco que um pixel font corre.',
  },
]

/** Faces decididas: título e subtítulo não têm mais candidato em disputa. */
export const TITLE_FACE = faceById('departure')
export const SUBHEAD_FACE = faceById('ibmvga')

/** A única variável aberta: qual fonte aguenta o corpo de um post inteiro. */
const BODY_FACE_IDS = ['plex', 'handjet', 'inter', 'roboto', 'sourceserif', 'literata', 'atkinson']

export const BODY_FACE_OPTIONS = BODY_FACE_IDS.map((id) => faceById(id)).map((face) => ({
  id: face.id,
  name: `${face.name} · ${face.licence}`,
}))

export function faceById(id: string): Face {
  return FACES.find((face) => face.id === id) ?? FACES[0]
}
