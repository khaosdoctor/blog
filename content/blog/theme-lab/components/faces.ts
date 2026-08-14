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
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    note: 'Pixel de verdade e vetorial, então escala em qualquer tamanho. Altura-x baixa: em 16px o texto corrido parece menor do que é.',
  },
  {
    id: 'ibmvga',
    stack: "'PxPlus IBM VGA8', ui-monospace, monospace",
    name: 'PxPlus IBM VGA 9x16',
    licence: 'CC BY-SA 4.0',
    role: 'título',
    mono: true,
    pixelStep: 16,
    note: 'O DOS literal. Bitmap traçado: nítido em 16, 32 e 48px, borrado em qualquer valor no meio. Share-alike, então exige atribuição.',
  },
  {
    id: 'plex',
    stack: "'IBM Plex Mono', ui-monospace, monospace",
    name: 'IBM Plex Mono',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    note: 'A saída segura. Não é pixelada, é quadrada e industrial. Aguenta três mil palavras sem discussão.',
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
    role: 'título',
    mono: false,
    pixelStep: 0,
    note: 'Variável com eixos de grade e de forma do elemento: dá para transformar o mesmo texto de matriz de pontos em blocos quadrados com um slider.',
  },
]

export const FACE_OPTIONS = FACES.map((face) => ({ id: face.id, name: `${face.name} (${face.role})` }))

export function faceById(id: string): Face {
  return FACES.find((face) => face.id === id) ?? FACES[0]
}
