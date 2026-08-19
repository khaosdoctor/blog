/**
 * As fontes que perderam, com o motivo de cada uma.
 *
 * Saíram de `./faces.ts` quando o corpo foi decidido:
 * Literata como padrão e Atkinson Hyperlegible como a opção sem serifa. Continuam
 * aqui porque o argumento do artigo não é a fonte escolhida, é o que foi
 * descartado e por quê. Todas seguem vendorizadas em `public/fonts/` e declaradas
 * em `./fonts.css`, que esta página importa: nada aqui
 * depende de rede.
 *
 * `pixelStep` é o passo em que a fonte fica nítida: `0` quer dizer vetorial de
 * verdade, `16` quer dizer bitmap traçado que só fecha no grid em múltiplos de 16.
 */

export interface RetiredFace {
  id: string
  stack: string
  name: string
  licence: string
  role: 'corpo' | 'título' | 'etiqueta'
  mono: boolean
  pixelStep: number
  /** Em que tamanho ela era vista na bancada, em px. */
  size: number
  /** Por que não foi escolhida. */
  reason: string
}

/** As cinco que disputaram o corpo do post de verdade e perderam. */
export const BODY_CANDIDATES: RetiredFace[] = [
  {
    id: 'plex',
    stack: "'IBM Plex Mono', ui-monospace, monospace",
    name: 'IBM Plex Mono',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    size: 17,
    reason:
      'Era a favorita até o post de verdade entrar no painel. Num blog sobre código, um parágrafo monoespaçado e um trecho de código inline deixam de ser distinguíveis: o leitor perde a única pista tipográfica que diz "isto aqui é código".',
  },
  {
    id: 'handjet',
    stack: "'Handjet', sans-serif",
    name: 'Handjet',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    size: 22,
    reason:
      'A melhor matriz de pontos para texto corrido, e ainda assim condicional: só funciona a 22px com 0,03em de entreletra. Abaixo disso a malha atropela a leitura. Uma fonte de corpo que exige um tamanho exato para ser legível não é uma fonte de corpo.',
  },
  {
    id: 'inter',
    stack: "'Inter', ui-sans-serif, sans-serif",
    name: 'Inter',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    size: 17,
    reason:
      'Lê muito bem e não erra em nada. Perdeu para a Atkinson na mesma vaga por um motivo que não é estético: a Atkinson foi desenhada para leitor de baixa visão, com cada letra feita para não se confundir com outra, e num site inteiro de fonte pixelada essa é a escolha que compensa o resto.',
  },
  {
    id: 'roboto',
    stack: "'Roboto', ui-sans-serif, sans-serif",
    name: 'Roboto',
    licence: 'Apache 2.0',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    size: 17,
    reason:
      'Mais neutra que a Inter, e é justamente o problema: onipresente ao ponto de não dizer nada. Num site que escolheu Departure Mono e um DOS de 1985, a fonte do corpo pode ser discreta, mas não pode ser anônima.',
  },
  {
    id: 'sourceserif',
    stack: "'Source Serif 4', ui-serif, Georgia, serif",
    name: 'Source Serif 4',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    size: 17,
    reason:
      'A serifa que mais lembra página impressa, e perdeu para a Literata pela razão contrária: a Literata foi desenhada para o Play Books, ou seja, para leitura longa em tela e não para papel. Numa tela OLED preta a diferença aparece no fim do segundo parágrafo.',
  },
]

/**
 * O levantamento pixel: as faces olhadas para cabeçalho, etiqueta e chrome. Não
 * disputaram o corpo, e nenhuma delas foi escolhida para nada, mas foram elas que
 * mostraram onde uma fonte de bitmap funciona e onde ela desmonta.
 */
export const PIXEL_SURVEY: RetiredFace[] = [
  {
    id: 'sharetech',
    stack: "'Share Tech Mono', ui-monospace, monospace",
    name: 'Share Tech Mono',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    size: 17,
    reason: 'Terminal sem ser pixel, e mais estreita que a Plex. Cai no mesmo problema dela: corpo monoespaçado.',
  },
  {
    id: 'vt323',
    stack: "'VT323', ui-monospace, monospace",
    name: 'VT323',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: true,
    pixelStep: 0,
    size: 20,
    reason: 'Desenhada a partir do DEC VT320. Traço fino demais: precisa de 20px e contraste alto para não sumir.',
  },
  {
    id: 'dotgothic',
    stack: "'DotGothic16', sans-serif",
    name: 'DotGothic16',
    licence: 'OFL 1.1',
    role: 'corpo',
    mono: false,
    pixelStep: 0,
    size: 18,
    reason: 'A matriz de pontos mais legível em texto corrido, e a que menos combina com o resto da página.',
  },
  {
    id: 'pixelify',
    stack: "'Pixelify Sans', sans-serif",
    name: 'Pixelify Sans',
    licence: 'OFL 1.1',
    role: 'título',
    mono: false,
    pixelStep: 0,
    size: 24,
    reason: 'Quatro pesos num eixo variável, raro em fonte pixel. Boa em título, cansativa em parágrafo.',
  },
  {
    id: 'silkscreen',
    stack: "'Silkscreen', sans-serif",
    name: 'Silkscreen',
    licence: 'OFL 1.1',
    role: 'etiqueta',
    mono: false,
    pixelStep: 0,
    size: 10,
    reason: 'Só existe em etiqueta de 10px em caixa alta. Uma frase inteira já é demais para ela.',
  },
  {
    id: 'pressstart',
    stack: "'Press Start 2P', ui-monospace, monospace",
    name: 'Press Start 2P',
    licence: 'OFL 1.1',
    role: 'etiqueta',
    mono: true,
    pixelStep: 0,
    size: 14,
    reason: 'O NES literal, e a mais larga de todas: cada caractere ocupa o dobro. Bonita em quatro palavras.',
  },
  {
    id: 'jersey',
    stack: "'Jersey 10', sans-serif",
    name: 'Jersey 10',
    licence: 'OFL 1.1',
    role: 'título',
    mono: false,
    pixelStep: 0,
    size: 32,
    reason: 'Condensada e alta, espírito de placar de estádio. Perdeu do Departure Mono, que já era a marca.',
  },
  {
    id: 'micro5',
    stack: "'Micro 5', sans-serif",
    name: 'Micro 5',
    licence: 'OFL 1.1',
    role: 'etiqueta',
    mono: false,
    pixelStep: 0,
    size: 28,
    reason: 'Desenhada em cinco pixels de altura. Enfeite grande e nada além disso: em tamanho de leitura é ruído.',
  },
]
