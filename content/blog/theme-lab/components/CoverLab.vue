<script setup lang="ts">
/**
 * Seção 02: quatro capas OG/social candidatas, 1200×630, com o título assado
 * por cima (os candidatos 2 e 3 perderam a decisão e moraram para
 * content/blog/theme-lab-arquivo/). Cada uma é um `<svg viewBox="0 0 1200
 * 630">` de verdade, não canvas: o gerador real rasteriza SVG com `sharp` no
 * build, então o que está aqui entra na build sem reescrita, e a proporção
 * fica honesta enquanto a pré-visualização encolhe para caber na coluna do
 * post.
 *
 * Determinismo: nada aqui chama `Math.random()`. Cor da marca, sólido do
 * wireframe, giro dele e o campo de fogo do candidato 5 vêm todos de um
 * inteiro (o "seed"). No gerador real esse inteiro é `hashSlug(post.slug)`,
 * então o mesmo post sempre bate a mesma capa e o cache do card social não
 * estraga a cada build; aqui, sem um post de verdade para hashear, o knob
 * "semente" faz esse papel e soma-se ao hash do slug de exemplo.
 */
import { computed, reactive, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { composite, grade, mixOklab, parseHex, ratio, toHex } from './contrast'
import './fonts.css'

const CARD_W = 1200
const CARD_H = 630

const TITLE_FONT = "'Departure Mono', ui-monospace, monospace"
const LABEL_FONT = "'PxPlus IBM VGA8', ui-monospace, monospace"

const TITLES: Record<string, string> = {
  curto: 'Quando a abstração vaza',
  medio: 'O que acontece quando você chama fetch e a rede some no meio',
  longo: 'Um título de noventa caracteres existe e vai chegar aqui um dia, então ele precisa caber',
}

// As cinco cores de marca de verdade, cada uma com seu próprio knob de "%
// da marca mantida" no painel de tom (mais abaixo). `BRANDS`, logo depois de
// TITLE_INK/DIMMED_WHITE existirem, estende esta lista com branco e branco
// apagado para o hash também poder sortear os dois.
const BRAND_COLORS = [
  { id: 'vermelho', hex: '#e30613' },
  { id: 'verde', hex: '#45b384' },
  { id: 'amarelo', hex: '#f5b200' },
  { id: 'azul', hex: '#0578be' },
  { id: 'roxo', hex: '#4b15a8' },
] as const

const CATEGORIES = [
  { id: 'meta', name: 'meta' },
  { id: 'javascript', name: 'javascript' },
  { id: 'typescript', name: 'typescript' },
  { id: 'infra', name: 'infra' },
  { id: 'career', name: 'career' },
  { id: 'security', name: 'security' },
  { id: 'opinion', name: 'opinion' },
]

const TITLE_SIZE_OPTIONS = [
  { id: 'curto', name: '23 caracteres' },
  { id: 'medio', name: '58 caracteres' },
  { id: 'longo', name: '90 caracteres' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

/**
 * PRNG pequeno, determinístico e sem dependência (mulberry32, de domínio
 * público): recebe um inteiro e devolve uma função que gera números em
 * [0, 1), sempre na mesma sequência para a mesma semente. É o que faz o
 * sólido do candidato 4 e o fogo do candidato 5 nascerem do hash do slug em
 * vez de `Math.random()`: mesmo slug, mesmo inteiro, mesma sequência, sempre.
 * A diferença para o bug do plasma original não é usar "uma semente só": é
 * que cada parâmetro lê uma chamada nova do gerador, e cada chamada já mistura
 * o estado inteiro (multiplicação, xor, shift) antes de devolver o número, e
 * não uma mesma leitura escalada por constantes diferentes.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sólido gerado, não escolhido: em vez de indexar uma lista fixa de formas,
 * cada parâmetro sai de uma chamada do PRNG. Um anel de N lados empilhado M
 * vezes, com as pontas fechando em face ou em ponto, é o mesmo desenho que
 * produz um cubo (4 lados, 2 anéis, sem ponta), um prisma hexagonal (6 lados,
 * 2 anéis), um octaedro (4 lados, 1 anel, as duas pontas fechadas) ou um
 * tetraedro (3 lados, 1 anel, uma ponta fechada) só variando os números, o
 * que dá mais variedade real com menos código do que escrever cada sólido à
 * mão.
 */
type Vec3 = [number, number, number]
interface SolidParams {
  sides: number
  ringCount: number
  topClose: boolean
  bottomClose: boolean
  taper: number
  brace: boolean
  yaw: number
  pitch: number
  roll: number
}
interface GeneratedSolid {
  vertices: Vec3[]
  edges: Array<[number, number]>
  params: SolidParams
}

function generateSolidParams(rng: () => number): SolidParams {
  const sides = 3 + Math.floor(rng() * 6) // 3..8 lados por anel
  let ringCount = 1 + Math.floor(rng() * 3) // 1..3 anéis empilhados
  let topClose = rng() < 0.5
  let bottomClose = rng() < 0.5
  if (ringCount === 1 && !topClose && !bottomClose) topClose = true // nunca um anel plano sozinho
  const taper = 0.55 + rng() * 0.45 // 0.55..1.0, o quanto o topo estreita
  const brace = rng() < 0.45 // arestas cruzadas extras entre anéis
  const yaw = rng() * Math.PI * 2
  const pitch = rng() * Math.PI * 2
  const roll = rng() * Math.PI * 2
  return { sides, ringCount, topClose, bottomClose, taper, brace, yaw, pitch, roll }
}

function generateSolid(rng: () => number): GeneratedSolid {
  const params = generateSolidParams(rng)
  const { sides, ringCount, topClose, bottomClose, taper } = params

  let ringYs: number[]
  if (ringCount === 1) {
    if (topClose && bottomClose) ringYs = [0] // bipirâmide: anel no equador, ponta nos dois polos
    else if (topClose) ringYs = [-1] // pirâmide: anel na base, ponta no topo
    else ringYs = [1] // pirâmide invertida: anel no topo, ponta embaixo
  } else {
    ringYs = Array.from({ length: ringCount }, (_, i) => -1 + (2 * i) / (ringCount - 1))
  }

  const vertices: Vec3[] = []
  const edges: Array<[number, number]> = []
  const ringIndices: number[][] = []
  for (const y of ringYs) {
    const radius = 1 + (taper - 1) * ((y + 1) / 2)
    const indices: number[] = []
    for (let s = 0; s < sides; s++) {
      const angle = (s / sides) * Math.PI * 2
      indices.push(vertices.length)
      vertices.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius])
    }
    ringIndices.push(indices)
    for (let s = 0; s < sides; s++) edges.push([indices[s], indices[(s + 1) % sides]])
  }
  for (let r = 0; r < ringIndices.length - 1; r++) {
    for (let s = 0; s < sides; s++) {
      edges.push([ringIndices[r][s], ringIndices[r + 1][s]])
      if (params.brace) edges.push([ringIndices[r][s], ringIndices[r + 1][(s + 1) % sides]])
    }
  }
  if (topClose) {
    const apexIdx = vertices.length
    vertices.push([0, ringCount === 1 ? 1 : 1.3, 0])
    for (const idx of ringIndices[ringIndices.length - 1]) edges.push([apexIdx, idx])
  }
  if (bottomClose) {
    const apexIdx = vertices.length
    vertices.push([0, ringCount === 1 ? -1 : -1.3, 0])
    for (const idx of ringIndices[0]) edges.push([apexIdx, idx])
  }
  return { vertices, edges, params }
}

function rotate3(v: Vec3, yaw: number, pitch: number, roll: number): Vec3 {
  let [x, y, z] = v
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw)
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw)
  x = x1
  z = z1
  const y1 = y * Math.cos(pitch) - z * Math.sin(pitch)
  const z2 = y * Math.sin(pitch) + z * Math.cos(pitch)
  y = y1
  z = z2
  const x2 = x * Math.cos(roll) - y * Math.sin(roll)
  const y2 = x * Math.sin(roll) + y * Math.cos(roll)
  x = x2
  y = y2
  return [x, y, z]
}

/**
 * Projeção em perspectiva de verdade (não a ortográfica da tentativa
 * anterior, que ignorava a profundidade e por isso lia como um desenho 2D
 * girando, não como um sólido 3D): quanto maior o Z depois da rotação, mais
 * perto de `camDist` o ponto fica da câmera e mais o fator `camDist / (camDist
 * + z)` encolhe. `textmode.js` faz esse mesmo tipo de projeção em 3D, mas
 * dentro de um `<canvas>`/WebGL no navegador; aqui o gerador real só roda
 * `sharp` sobre um `<svg>` estático no build, sem navegador, então a projeção
 * precisa ser essa arimética pura em JS, não a biblioteca.
 */
function projectPerspective(v: Vec3, cx: number, cy: number, scale: number, camDist: number) {
  const [x, y, z] = v
  const factor = camDist / (camDist + z)
  return { x: cx + x * factor * scale, y: cy + y * factor * scale, z }
}

interface WaveParams {
  freqA: number
  freqB: number
  freqC: number
  phaseA: number
  phaseB: number
  phaseC: number
  direction: number
  levels: number
}

/**
 * Três senos, como no campo original, mas cada frequência e cada fase vêm de
 * uma chamada separada do PRNG, e o par (col, row) gira por um ângulo de
 * direção antes de entrar nos senos. É o oposto do que quebrou o plasma da
 * primeira tentativa: lá, uma fase só era escalada por três constantes fixas
 * e as três frequências cresciam juntas, então o campo inteiro colapsava numa
 * única rampa. Aqui as sete leituras do PRNG (três frequências, três fases, a
 * direção, os tons) não têm relação linear entre si, então o campo forma
 * vários focos de claro e escuro em vez de uma rampa, e a orientação das
 * bandas muda de post para post. Nasceu para o candidato 3 (plasma, o valor
 * contínuo direto), que perdeu a decisão e mora agora em
 * content/blog/theme-lab-arquivo/; o gerador ficou porque o candidato 6 ainda
 * o usa, quantizado em `levels` tons. O candidato 5 usa o fogo do Doom (mais
 * abaixo) em vez desse campo, e é por isso que os dois continuam candidatos
 * separados, não a mesma ideia duas vezes.
 */
function generateWaveParams(rng: () => number): WaveParams {
  const freqA = 0.15 + rng() * 0.35
  const freqB = 0.15 + rng() * 0.35
  const freqC = 0.15 + rng() * 0.35
  const phaseA = rng() * Math.PI * 2
  const phaseB = rng() * Math.PI * 2
  const phaseC = rng() * Math.PI * 2
  const direction = rng() * Math.PI * 2
  const levels = 3 + Math.floor(rng() * 4) // 3..6 tons, como uma paleta de máquina antiga
  return { freqA, freqB, freqC, phaseA, phaseB, phaseC, direction, levels }
}

function waveField(
  params: WaveParams,
  brandHex: string,
  bgHex: string,
  size: number,
  quantize: boolean,
): Array<{ x: number; y: number; fill: string; level: number }> {
  const cols = Math.ceil(CARD_W / size)
  const rows = Math.ceil(CARD_H / size)
  const brandRgb = parseHex(brandHex)
  const bgRgb = parseHex(bgHex)
  const cosD = Math.cos(params.direction)
  const sinD = Math.sin(params.direction)
  const cells: Array<{ x: number; y: number; fill: string; level: number }> = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const u = col * cosD - row * sinD
      const v = col * sinD + row * cosD
      const wave =
        (Math.sin(u * params.freqA + params.phaseA) +
          Math.sin(v * params.freqB + params.phaseB) +
          Math.sin((u + v) * params.freqC + params.phaseC)) /
          6 +
        0.5
      const raw = Math.max(0, Math.min(1, wave))
      // "level" é o mesmo número que antes se chamava "alpha" aqui: escolhe
      // o tom (mistura brandRgb/bgRgb). Agora ele também alimenta a
      // opacidade por célula lá embaixo em sixWaveCells, do mesmo jeito que
      // o fogo deriva seu próprio alfa da intensidade da célula (bandT ou
      // rawT): é a mesma leitura usada pra dois canais visuais diferentes,
      // não dois cálculos separados.
      const level = quantize
        ? params.levels === 1
          ? 0
          : Math.min(params.levels - 1, Math.floor(raw * params.levels)) / (params.levels - 1)
        : raw
      cells.push({ x: col * size, y: row * size, fill: toHex(composite(brandRgb, bgRgb, level)), level })
    }
  }
  return cells
}

const FIRE_MAX_INTENSITY = 36
const FIRE_EDGES = ['bottom', 'top', 'left', 'right'] as const
type FireEdge = (typeof FIRE_EDGES)[number]

interface FireField {
  values: number[][]
  edge: FireEdge
}

/**
 * O fogo do Doom de verdade, não uma impressão dele, porque é pequeno: uma
 * linha fonte presa na intensidade máxima, e cada célula acima herda o valor
 * da célula abaixo menos uma pequena queda, com um desvio horizontal de uma
 * célula ao mesmo tempo. É a queda e o desvio que dão a inclinação e os
 * fiapos da chama; sem eles o campo seria uma rampa lisa, não fogo. A borda
 * fonte pode ser qualquer uma das quatro (o hash escolhe) e a simulação roda
 * por um número fixo de iterações até assentar: o jogo original refaz esse
 * mesmo cálculo a cada quadro sobre o buffer do quadro anterior porque é uma
 * animação; aqui, como o cartão é uma imagem parada, ele roda N vezes sobre
 * si mesmo e só o resultado final é desenhado.
 */
function buildFireField(rng: () => number, cols: number, rows: number, iterations: number, decayMax: number): FireField {
  const edge = FIRE_EDGES[Math.floor(rng() * FIRE_EDGES.length)]
  let field = Array.from({ length: rows }, () => new Array(cols).fill(0))

  const pinSource = (f: number[][]) => {
    if (edge === 'bottom') for (let c = 0; c < cols; c++) f[rows - 1][c] = FIRE_MAX_INTENSITY
    if (edge === 'top') for (let c = 0; c < cols; c++) f[0][c] = FIRE_MAX_INTENSITY
    if (edge === 'left') for (let r = 0; r < rows; r++) f[r][0] = FIRE_MAX_INTENSITY
    if (edge === 'right') for (let r = 0; r < rows; r++) f[r][cols - 1] = FIRE_MAX_INTENSITY
  }
  pinSource(field)

  for (let iter = 0; iter < iterations; iter++) {
    const next = field.map((row) => row.slice())
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (edge === 'bottom' && row === rows - 1) continue
        if (edge === 'top' && row === 0) continue
        if (edge === 'left' && col === 0) continue
        if (edge === 'right' && col === cols - 1) continue

        let srcRow = row
        let srcCol = col
        if (edge === 'bottom') srcRow = row + 1
        if (edge === 'top') srcRow = row - 1
        if (edge === 'left') srcCol = col - 1
        if (edge === 'right') srcCol = col + 1

        const jitter = Math.floor(rng() * 3) - 1 // desvio de uma célula: -1, 0 ou 1
        if (edge === 'bottom' || edge === 'top') srcCol = Math.min(cols - 1, Math.max(0, srcCol + jitter))
        else srcRow = Math.min(rows - 1, Math.max(0, srcRow + jitter))

        const decay = Math.floor(rng() * decayMax)
        next[row][col] = Math.max(0, field[srcRow][srcCol] - decay)
      }
    }
    field = next
    pinSource(field)
  }
  return { values: field, edge }
}

/**
 * Hash de string pequeno o bastante para caber num comentário: só precisa
 * espalhar slugs entre as cinco cores da marca de um jeito estável, não
 * precisa ser criptográfico. Mesmo slug, mesmo número, sempre.
 */
function hashSlug(slug: string): number {
  let hash = 0
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

// No gerador real este valor seria post.slug. Aqui ele só ancora o hash a
// alguma coisa; o knob "semente" abaixo soma-se por cima para embaralhar.
const DEMO_SLUG = 'como-o-fetch-morre-no-meio-do-caminho'

const seed = ref(43)
const view = ref('todos')
const titleSize = ref('longo')
const category = ref('meta')
const cellSize = ref(36)
const cursor = ref(true)
const wireDensity = ref(12)
const wireOpacityScale = ref(100)
const fireIterations = ref(38)
const fireDecay = ref(6)
const fireHollowBands = ref(3)
const fireAlphaHot = ref(100)
const fireAlphaCold = ref(0)
// Contínuo por padrão agora: o desvanecimento liso lê melhor num cartão mais
// denso (mais iterações, mais bandas ocas, alfa frio zerado). "Escalonado"
// continua a opção para quem quiser o registro de poucos tons de uma máquina
// do período do algoritmo, que não tinha canal alfa e só ditherava.
const fireAlphaMode = ref('continuo')
// Alfa por célula das ondas, mesma ideia do fogo (alto/baixo interpolados
// pelo nível da célula) mas com knobs próprios, não os mesmos refs: fogo e
// ondas ficam em painéis lado a lado, mas continuam dois candidatos, cada
// um com seu próprio ajuste fino. Sem modo escalonado/contínuo à parte
// como o fogo tem, porque o campo de ondas já chega quantizado em
// `sixWave.levels` tons antes de qualquer alfa entrar: o próprio nível já é
// o degrau, um terceiro controle não mudaria a leitura.
const waveAlphaHigh = ref(100)
const waveAlphaLow = ref(0)

const effectiveSeed = computed(() => (hashSlug(DEMO_SLUG) + seed.value) >>> 0)
const brand = computed(() => BRANDS[effectiveSeed.value % BRANDS.length])

// Cada gerador puxa do mesmo hash, mas por uma semente derivada diferente
// (XOR com uma constante própria), para o sólido, o fogo e as ondas não
// desenharem sempre o mesmo padrão relativo entre si para o mesmo post.
const FIRE_SALT = 0x9e3779b9
const WAVES_SALT = 0xff51afd7

const wireSolid = computed(() => generateSolid(mulberry32(effectiveSeed.value)))
const sixWave = computed(() => generateWaveParams(mulberry32((effectiveSeed.value ^ WAVES_SALT) >>> 0)))

const rawTitle = computed(() => TITLES[titleSize.value])
// O cursor entra na string antes do quebra-linha, não depois: assim, se a
// última linha já está no limite, o "." e o "█" empurram a quebra em vez de
// vazar para fora do cartão.
const displayTitle = computed(() => (cursor.value ? `${rawTitle.value}.█` : rawTitle.value))
const kickerText = computed(() => `BLOG.LSANTOS.DEV / ${category.value.toUpperCase()}`)
const bylineText = 'Lucas Santos · 14 AGO 2026'

const KICKER_SIZE = 22
const BYLINE_SIZE = 20
const LINE_HEIGHT_RATIO = 1.22
const MONO_ADVANCE = 0.62 // avanço aproximado de uma fonte monoespaçada, em em
const WRAP_SAFETY = 0.92 // margem contra erro dessa estimativa

function titleFontSize(length: number): number {
  if (length <= 30) return 66
  if (length <= 65) return 50
  return 38
}

function wrapTitle(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(6, Math.floor((maxWidth * WRAP_SAFETY) / (fontSize * MONO_ADVANCE)))
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

interface Card {
  padX: number
  fontSize: number
  lines: string[]
  kickerY: number
  ruleY: number
  titleYs: number[]
  bylineY: number
}

function buildCard(padX: number, padY: number): Card {
  const fontSize = titleFontSize(rawTitle.value.length)
  const lines = wrapTitle(displayTitle.value, CARD_W - padX * 2, fontSize)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO
  const spaceAfterKicker = fontSize * 0.55
  const spaceBeforeByline = fontSize * 0.5
  const blockHeight =
    KICKER_SIZE * LINE_HEIGHT_RATIO +
    spaceAfterKicker +
    lines.length * lineHeight +
    spaceBeforeByline +
    BYLINE_SIZE * LINE_HEIGHT_RATIO
  const contentHeight = CARD_H - padY * 2
  const startY = padY + Math.max(0, (contentHeight - blockHeight) / 2)
  const kickerY = startY + KICKER_SIZE
  const titleStartY = kickerY + spaceAfterKicker + fontSize
  const titleYs = lines.map((_, index) => titleStartY + index * lineHeight)
  const bylineY = titleYs[titleYs.length - 1] + spaceBeforeByline + BYLINE_SIZE
  return { padX, fontSize, lines, kickerY, ruleY: kickerY + spaceAfterKicker * 0.5, titleYs, bylineY }
}

const dosCard = computed(() => buildCard(160, 140))

// Moldura dupla: uma borda "double" ingênua deixa 2-4px entre as duas linhas,
// que foi exatamente a reclamação da última tentativa ("apertada demais"). O
// vão aqui é sete vezes isso.
const BORDER_OUTER_INSET = 36
const BORDER_STROKE = 4
const BORDER_SPACING = 28
const BORDER_INNER_INSET = BORDER_OUTER_INSET + BORDER_STROKE + BORDER_SPACING

const outerFrame = computed(() => ({
  x: BORDER_OUTER_INSET,
  y: BORDER_OUTER_INSET,
  width: CARD_W - BORDER_OUTER_INSET * 2,
  height: CARD_H - BORDER_OUTER_INSET * 2,
}))
const innerFrame = computed(() => ({
  x: BORDER_INNER_INSET,
  y: BORDER_INNER_INSET,
  width: CARD_W - BORDER_INNER_INSET * 2,
  height: CARD_H - BORDER_INNER_INSET * 2,
}))

const DARK_BG = '#000000'
const DARK_SHADOW = '#050505'
const SHADOW_OFFSET = 3
// Fogo (5) e ondas (6) pintam atrás do texto uma textura bem mais ocupada do
// que o sólido do wireframe: a mesma sombra rígida de 3px que basta para o
// candidato 4 ainda se perdia ali. Não é um efeito novo, é o mesmo bloco
// duro, só mais largo. Os dois usavam o mesmo número (o dobro do wireframe)
// até virar reclamação: no candidato 6 esse afastamento lia como uma segunda
// cópia solta do texto, não como sombra. A diferença é o fundo por trás: o
// fogo tem fiapos e um gradiente abrupto da fonte pro topo, um campo bem
// desigual que ainda precisa do afastamento maior pra não se confundir com o
// texto; as ondas quantizam num campo mais parelho (poucos tons, sem
// fiapo), então um afastamento menor já basta pra ler como sombra. Por
// isso agora são dois valores, um por candidato, não mais um só
// compartilhado; o do fogo não muda.
const BUSY_SHADOW_OFFSET = SHADOW_OFFSET * 2 // fogo (5): fundo mais desigual, precisa do afastamento maior
const WAVES_SHADOW_OFFSET = SHADOW_OFFSET * 1.5 // ondas (6): fundo mais parelho, precisa de menos afastamento

// O título é sempre esta tinta branca fixa, nos quatro candidatos, nunca
// derivada da cor da marca; a assinatura carrega a mesma tinta, só apagada
// por opacidade, um valor só reaproveitado em vez de um número por
// candidato.
const TITLE_INK = '#e6e4e0'
const BYLINE_OPACITY = 0.75
// Branco e branco apagado são duas entradas a mais que o hash pode sortear
// pra "cor da marca", sem saturação nenhuma; sem knob de % pra nenhum dos
// dois, porque não há mistura a fazer. `DIMMED_WHITE` é TITLE_INK levado a
// BYLINE_OPACITY contra preto, a mesma dupla que já pinta a assinatura,
// achatada num hex só, pra dar num traço ou preenchimento sólido como
// qualquer outro tom de marca.
const DIMMED_WHITE = toHex(composite(parseHex(TITLE_INK), parseHex(DARK_BG), BYLINE_OPACITY))
const BRANDS = [...BRAND_COLORS, { id: 'branco', hex: TITLE_INK }, { id: 'branco-apagado', hex: DIMMED_WHITE }]

/**
 * A cor da marca crua não é garantida legível como elemento sobre um fundo
 * escuro: ela foi escolhida para outra coisa (uma barra, um traço, um fundo
 * cheio), não para ficar em cima de um efeito escuro. `--chip-ink` já resolve
 * esse mesmo problema no CSS, misturando a cor da marca em direção ao branco
 * em `oklab` (color-mix(in oklab, var(--chip-color) N%, white),
 * src/styles/chips.css); `mixOklab` em contrast.ts é a mesma conta em JS,
 * porque aqui o SVG grava um hex literal no build, não uma custom property
 * que o CSS possa recalcular. O título é sempre branco fixo agora (a mesma
 * tinta acima), então quem precisa dessa mistura são as bordas, o chapéu do
 * candidato 4 e as células de fogo/ondas dos candidatos 5 e 6: as partes que
 * continuam pintadas na cor da marca.
 *
 * Uma tentativa de piso automático (uma só razão-alvo, resolvida por busca)
 * já passou por este arquivo três vezes e o roxo sempre voltou "escuro
 * demais": 4,5:1 é a razão mínima da lei, não o tanto que lê bem contra uma
 * marca saturada. docs/theming.md já tinha encontrado o mesmo problema por
 * outro ângulo (o vermelho fecha 4.5:1 no fundo sépia com 6% de
 * escurecimento, o amarelo precisa de 48%, oito vezes mais): um ajuste só
 * nunca vale pras cinco cores. Por isso cada marca tem seu próprio knob de
 * "% da marca mantida" (o resto é branco), no painel compartilhado mais
 * abaixo, e quem decide o valor final é quem está olhando o cartão, não um
 * laço parando na primeira razão que passa.
 *
 * Cada knob começa em 100%: cor cheia da marca, sem branco misturado, porque
 * borda, chapéu, glifo e célula são acentos contra preto, e o título já é
 * branco fixo, então não sobra tinta pra clarear por padrão. Puxar o knob
 * pra baixo é a exceção que quem está olhando o cartão pode escolher, não o
 * ponto de partida.
 */
const inkMix = reactive<Record<string, number>>({
  vermelho: 100,
  verde: 100,
  amarelo: 100,
  azul: 100,
  roxo: 100,
})

function inkHexFor(brandHex: string, percent: number): string {
  return toHex(mixOklab(parseHex(brandHex), parseHex('#ffffff'), percent))
}

// Branco e branco apagado não passam pelo mix: `brand.value.hex` já é o
// valor final (TITLE_INK ou DIMMED_WHITE), fixo, sem knob por trás.
const brandIsNeutral = computed(() => brand.value.id === 'branco' || brand.value.id === 'branco-apagado')
const brandTone = computed(() =>
  brandIsNeutral.value ? brand.value.hex : inkHexFor(brand.value.hex, inkMix[brand.value.id]),
)
const brandToneContrast = computed(() => ratio(parseHex(brandTone.value), parseHex(DARK_BG)))
const dimmedWhiteContrast = computed(() => ratio(parseHex(DIMMED_WHITE), parseHex(DARK_BG)))
// Frase pronta pra citar como a marca ativa virou o tom: a fórmula oklab
// pras cinco cores de verdade, ou só o valor fixo quando é branco/branco
// apagado, porque aí não existe knob nem mistura pra descrever.
const brandToneDerivationLabel = computed(() => {
  if (brand.value.id === 'branco') return `branco fixo (${TITLE_INK}), sem mistura e sem knob`
  if (brand.value.id === 'branco-apagado') return `branco apagado fixo (${DIMMED_WHITE}), sem mistura e sem knob`
  return `color-mix(in oklab, ${brand.value.hex} ${inkMix[brand.value.id]}%, white)`
})
// Pior caso pro título (sempre branco fixo) se um glifo do wireframe ou uma
// célula de campo saturar até o tom cheio por baixo dele: usado pelo
// wireframe (4) e pelas ondas (6), que não têm um alfa próprio como o fogo.
const titleVsToneContrast = computed(() => ratio(parseHex(TITLE_INK), parseHex(brandTone.value)))

// Uma leitura por marca, independente de qual está selecionada agora: é o
// que deixa o painel mostrar o tom (não mais a tinta do título, que agora é
// fixa) contra preto para as cinco ao mesmo tempo, sem precisar trocar a
// marca ativa cinco vezes. É o número que importa pras bordas, pro chapéu do
// candidato 4 e pras células de campo do 5 e do 6, porque são eles que
// carregam esse tom agora.
const brandToneReadouts = computed(() =>
  Object.fromEntries(
    BRAND_COLORS.map((b) => {
      const hex = inkHexFor(b.hex, inkMix[b.id])
      return [b.id, { hex, vsBlack: ratio(parseHex(hex), parseHex(DARK_BG)) }]
    }),
  ),
)

// Opacidade por célula, derivada do mesmo "level" que já escolhe o tom: a
// mesma leitura que o fogo faz (alfa alto/baixo interpolados pela
// intensidade da célula), só que aqui a intensidade já chega quantizada em
// `sixWave.levels` degraus, então a opacidade sai naturalmente escalonada
// sem precisar de um modo escalonado/contínuo à parte. Célula oca continua
// só do fogo: não faz sentido pra um campo de senos, e não foi pedida aqui,
// então é essa diferença, não mais o alfa, que ainda separa os dois
// candidatos.
const sixWaveCells = computed(() =>
  waveField(sixWave.value, brandTone.value, DARK_BG, cellSize.value, true).map((c) => ({
    ...c,
    alpha: (waveAlphaLow.value + (waveAlphaHigh.value - waveAlphaLow.value) * c.level) / 100,
  })),
)

const WIRE_CENTER = { x: 900, y: 335 }
const WIRE_RADIUS = 130
const WIRE_CAM_DIST = 4.5
// Opacidade de cada glifo do sólido, escalada pela distância à câmera:
// WIRE_OPACITY_FLOOR é o piso (aresta mais longe) e WIRE_OPACITY_RANGE é
// quanto ela sobe até a aresta mais perto. A moldura não faz mais parte dessa
// escala: é o mesmo `<rect>` duplo dos candidatos 1, 5 e 6, por cima do sólido.
// O knob "opacidade do wireframe" escala esse resultado inteiro por cima
// (padrão 100%, o mesmo desenho de sempre); a queda por distância continua
// por baixo dele, não é substituída por um valor fixo.
const WIRE_OPACITY_FLOOR = 0.12
const WIRE_OPACITY_RANGE = 0.35

/**
 * Em vez de desenhar as arestas como `<line>`, cada uma é amostrada em pontos
 * e cada ponto vira um "+" preso à grade de `wireDensity` px, no espírito do
 * cubo feito só de "+": uma malha de caracteres, não um traço vetorial liso.
 * A profundidade de cada ponto (o Z depois da rotação, antes da perspectiva)
 * dá a leitura de 3D de verdade: pontos mais perto da câmera saem com glifo
 * maior e mais opaco, os mais longe saem menores e quase apagados, a mesma
 * ideia de "arestas escondidas ainda desenhadas, só que fracas" do cubo de
 * referência. Quando duas arestas caem na mesma célula da grade, fica a mais
 * perto (a de maior "closeness"), porque é ela que estaria na frente. Esse
 * desvanecimento é textura, não texto: fica como está, regulado só por
 * WIRE_OPACITY_FLOOR/WIRE_OPACITY_RANGE (a queda por distância) e pelo knob
 * de opacidade do wireframe (um multiplicador por cima, padrão 100%). O
 * glifo pinta com o mesmo tom derivado do knob de marca que a moldura e o
 * chapéu do candidato 4 usam; a moldura desenha por cima como um `<rect>`
 * fixo, fora dessa escala de opacidade.
 */
const wireCells = computed(() => {
  const solid = wireSolid.value
  const step = wireDensity.value
  const rotated = solid.vertices.map((v) => rotate3(v, solid.params.yaw, solid.params.pitch, solid.params.roll))
  const zs = rotated.map(([, , z]) => z)
  const zMin = Math.min(...zs)
  const zRange = Math.max(0.0001, Math.max(...zs) - zMin)
  const projected = rotated.map((v) => projectPerspective(v, WIRE_CENTER.x, WIRE_CENTER.y, WIRE_RADIUS, WIRE_CAM_DIST))
  const best = new Map<string, { x: number; y: number; closeness: number }>()
  for (const [a, b] of solid.edges) {
    const p1 = projected[a]
    const p2 = projected[b]
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const steps = Math.max(1, Math.round(length / step))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = p1.x + (p2.x - p1.x) * t
      const y = p1.y + (p2.y - p1.y) * t
      const z = p1.z + (p2.z - p1.z) * t
      const closeness = 1 - (z - zMin) / zRange // 1 = mais perto da câmera, 0 = mais longe
      const gx = Math.round(x / step) * step
      const gy = Math.round(y / step) * step
      const key = `${gx},${gy}`
      const existing = best.get(key)
      if (!existing || closeness > existing.closeness) best.set(key, { x: gx, y: gy, closeness })
    }
  }
  return Array.from(best.values())
})

const FIRE_BANDS = 6
const FIRE_ALPHA_MODE_OPTIONS = [
  { id: 'escalonado', name: 'escalonado (por banda)' },
  { id: 'continuo', name: 'contínuo' },
]
// Um contorno fino no mesmo alfa de um bloco cheio quase some (menos pixel
// carregando a mesma cor); este fator compensa isso só para as ocas.
const HOLLOW_ALPHA_BOOST = 1.5

const fireField = computed(() => {
  const size = cellSize.value
  const cols = Math.ceil(CARD_W / size)
  const rows = Math.ceil(CARD_H / size)
  const rng = mulberry32((effectiveSeed.value ^ FIRE_SALT) >>> 0)
  return buildFireField(rng, cols, rows, fireIterations.value, fireDecay.value)
})

/**
 * Cada célula do fogo mostra a intensidade de três jeitos, não um: cheia ou
 * oca (as bandas mais frias saem ocas, malha em vez de área sólida), o tom
 * (FIRE_BANDS degraus, como a paleta de uma máquina antiga) e agora também a
 * opacidade, que cai do lado quente pro lado frio. "Escalonado" usa os mesmos
 * degraus do tom (mesma leitura de poucos níveis); "contínuo" usa a
 * intensidade crua. Ocas recebem um alfa extra: sem isso, um contorno fino
 * no mesmo número que um bloco cheio lê como quase apagado.
 */
const dosFireCells = computed(() => {
  const size = cellSize.value
  const brandRgb = parseHex(brandTone.value)
  const bgRgb = parseHex(DARK_BG)
  const { values } = fireField.value
  const cells: Array<{ x: number; y: number; fill: string; hollow: boolean; alpha: number }> = []
  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < values[row].length; col++) {
      const rawT = values[row][col] / FIRE_MAX_INTENSITY
      const bandIdx = Math.min(FIRE_BANDS - 1, Math.floor(rawT * FIRE_BANDS))
      const bandT = bandIdx / (FIRE_BANDS - 1)
      const fill = toHex(composite(brandRgb, bgRgb, bandT))
      const hollow = bandIdx < fireHollowBands.value
      const alphaT = fireAlphaMode.value === 'continuo' ? rawT : bandT
      const baseAlpha = (fireAlphaCold.value + (fireAlphaHot.value - fireAlphaCold.value) * alphaT) / 100
      const alpha = Math.min(1, hollow ? baseAlpha * HOLLOW_ALPHA_BOOST : baseAlpha)
      cells.push({ x: col * size, y: row * size, fill, hollow, alpha })
    }
  }
  return cells
})
const fireFilledCount = computed(() => dosFireCells.value.filter((c) => !c.hollow).length)
const fireHollowCount = computed(() => dosFireCells.value.filter((c) => c.hollow).length)

// Pior caso de verdade por baixo do título: o fundo é preto puro, então uma
// célula desenhada com opacidade `a` mistura pro tom da marca × a, não pro
// tom cheio sem mistura. O pixel mais forte que o fogo consegue gerar usa o
// alfa mais quente, não 100% fixo; se esse knob descer, o pior caso melhora
// sozinho, por isso ele é recalculado aqui e não reaproveita o número dos
// candidatos 4 e 6. O título é sempre branco fixo agora, então quem entra
// nessa conta é TITLE_INK, não mais uma tinta derivada da marca.
const fireWorstBg = computed(() => toHex(composite(parseHex(brandTone.value), parseHex(DARK_BG), fireAlphaHot.value / 100)))
const titleVsFireWorstContrast = computed(() => ratio(parseHex(TITLE_INK), parseHex(fireWorstBg.value)))

const titleContrast = computed(() => ratio(parseHex(TITLE_INK), parseHex(DARK_BG)))

// Os quatro candidatos que sobraram compartilham semente, categoria,
// comprimento do título e cursor: todos entram na cor, no rótulo e no texto
// de cada um dos quatro cartões.
const sharedDecisionSettings = computed(() => [
  { label: 'categoria', value: category.value },
  { label: 'comprimento do título', value: labelFor(TITLE_SIZE_OPTIONS, titleSize.value) },
  { label: 'cor da marca', value: `${brand.value.id} (${brand.value.hex})` },
  { label: 'cursor sólido █', value: cursor.value ? 'sim' : 'não' },
  { label: 'semente', value: String(seed.value) },
])

// Nos três candidatos abaixo, o tom que pinta bordas, o chapéu (candidato 4)
// e as células de campo (candidatos 5 e 6) vem desse knob da marca ativa;
// vai junto na citação para o valor ser reproduzível.
const inkSetting = computed(() => ({
  label: 'tom da marca (oklab, % da marca mantida)',
  value: brandIsNeutral.value ? 'fixo, sem knob' : `${inkMix[brand.value.id]}%`,
}))

const wireframeDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'densidade do wireframe', value: `${wireDensity.value}px` },
  { label: 'opacidade do wireframe', value: `${wireOpacityScale.value}%` },
  {
    label: 'sólido gerado (hash)',
    value: `${wireSolid.value.params.sides} lados · ${wireSolid.value.params.ringCount} anel(is) · ${wireSolid.value.params.topClose ? 'topo fechado' : 'topo aberto'} · ${wireSolid.value.params.bottomClose ? 'base fechada' : 'base aberta'}`,
  },
  inkSetting.value,
])

const fireDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'célula da grade', value: `${cellSize.value}px` },
  { label: 'iterações do fogo', value: String(fireIterations.value) },
  { label: 'queda do fogo', value: String(fireDecay.value) },
  { label: 'bandas ocas', value: String(fireHollowBands.value) },
  { label: 'alfa quente/frio', value: `${fireAlphaHot.value}% / ${fireAlphaCold.value}%` },
  { label: 'modo do alfa', value: labelFor(FIRE_ALPHA_MODE_OPTIONS, fireAlphaMode.value) },
  { label: 'borda de origem (hash)', value: fireField.value.edge },
  inkSetting.value,
])

const sixDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'célula da grade', value: `${cellSize.value}px` },
  { label: 'tons gerados (hash)', value: String(sixWave.value.levels) },
  { label: 'alfa alto/baixo das ondas', value: `${waveAlphaHigh.value}% / ${waveAlphaLow.value}%` },
  inkSetting.value,
])

const SVG_NOTE = 'A capa é um <svg viewBox="0 0 1200 630"> de verdade (1200x630), o mesmo SVG que o gerador rasteriza com sharp no build. Cor da marca e semente derivam de hashSlug(post.slug) + semente, nunca de Math.random(), para o cache do card social não estragar a cada build.'

const dosDecisionContext = computed(
  () => `${SVG_NOTE} Título ${titleContrast.value.toFixed(2)}:1 sobre #000000 (${grade(titleContrast.value)}).`,
)

const wireframeDecisionContext = computed(
  () =>
    `${SVG_NOTE} Sólido e giro nascem do hash do slug via um PRNG pequeno (mulberry32), não de Math.random() nem de uma lista fixa de formas; a projeção é perspectiva pura em JS (sem canvas, sem WebGL, sem textmode.js), porque o gerador real só roda sharp sobre SVG estático no build. A moldura voltou a ser o mesmo retângulo duplo de traço liso dos candidatos 1, 5 e 6, por cima do sólido, não mais a malha de "+" do wireframe; o glifo fica só por dentro dela, e agora sua opacidade também escala por um knob (padrão 100%, a mesma queda por distância de sempre por baixo: piso ${WIRE_OPACITY_FLOOR}, alcance ${WIRE_OPACITY_RANGE}). O chapéu "blog.lsantos.dev / ${category.value}", a moldura e o glifo do sólido pintam agora com o tom derivado do knob de marca, não mais a cor crua: ${brandToneDerivationLabel.value} = ${brandTone.value}, ${brandToneContrast.value.toFixed(2)}:1 sobre ${DARK_BG} (${grade(brandToneContrast.value)}); o roxo já voltou "escuro demais" três vezes com um piso automático de 4,5:1, então continua um knob por marca na bancada, não um laço decidindo sozinho. O título é sempre branco fixo (${TITLE_INK}), não mais derivado desse knob: ${titleContrast.value.toFixed(2)}:1 sobre ${DARK_BG} (${grade(titleContrast.value)}); a assinatura carrega a mesma tinta, só 75% de opacidade, e o pior caso, se o glifo mais perto da câmera cobrir a letra, é ${titleVsToneContrast.value.toFixed(2)}:1 (${grade(titleVsToneContrast.value)}). O título também carrega uma sombra rígida de ${SHADOW_OFFSET}px.`,
)

const fireDecisionContext = computed(
  () =>
    `${SVG_NOTE} Mesma moldura dupla do candidato 1, fundo preto, e o algoritmo de fogo do Doom de verdade (fonte numa borda escolhida pelo hash, queda e desvio horizontal também do hash, ${fireIterations.value} iterações), clipado por dentro da moldura interna, não vazando pro resto do cartão; ${FIRE_BANDS} bandas de tom, as ${fireHollowBands.value} mais frias ocas, alfa ${fireAlphaMode.value} entre ${fireAlphaCold.value}% e ${fireAlphaHot.value}%. As células e a moldura pintam com o tom derivado do knob de marca, não a cor crua: ${brandToneDerivationLabel.value} = ${brandTone.value}, ${brandToneContrast.value.toFixed(2)}:1 sobre ${DARK_BG} (${grade(brandToneContrast.value)}). Chapéu, título e assinatura são sempre brancos (${TITLE_INK}), não mais dessa mistura: ${titleContrast.value.toFixed(2)}:1 sobre ${DARK_BG} no melhor caso (${grade(titleContrast.value)}); pior caso real, recalculado com o alfa quente do fogo sobre o tom (não a cor cheia da marca), ${titleVsFireWorstContrast.value.toFixed(2)}:1 sobre ${fireWorstBg.value} (${grade(titleVsFireWorstContrast.value)}); por isso o título, o chapéu e a assinatura carregam uma sombra rígida maior contra esse fundo mais ocupado, de ${BUSY_SHADOW_OFFSET}px (o dobro do candidato 4).`,
)

const sixDecisionContext = computed(
  () =>
    `${SVG_NOTE} Mesma moldura dupla do candidato 1, fundo preto, e o campo de senos que nasceu para o candidato 3 (plasma, arquivado), quantizado em ${sixWave.value.levels} tons (como uma paleta de máquina antiga), clipado por dentro da moldura interna do mesmo jeito que o fogo do candidato 5, não vazando pro resto do cartão. Cada célula agora também carrega opacidade própria, derivada do mesmo nível que já escolhe o tom, entre ${waveAlphaLow.value}% e ${waveAlphaHigh.value}% (a mesma leitura do alfa do fogo, sem modo escalonado/contínuo à parte porque o campo já chega quantizado nesses ${sixWave.value.levels} tons). Célula oca continua só do fogo: é essa diferença, não mais o alfa por célula, que mantém os dois candidatos separados, não a mesma ideia duas vezes. As células e a moldura pintam com o tom derivado do knob de marca, não a cor crua: ${brandToneDerivationLabel.value} = ${brandTone.value}, ${brandToneContrast.value.toFixed(2)}:1 sobre ${DARK_BG} (${grade(brandToneContrast.value)}). Chapéu, título e assinatura são sempre brancos (${TITLE_INK}), não mais dessa mistura: ${titleContrast.value.toFixed(2)}:1 sobre ${DARK_BG} no melhor caso (${grade(titleContrast.value)}); pior caso real ${titleVsToneContrast.value.toFixed(2)}:1 sobre ${brandTone.value} (${grade(titleVsToneContrast.value)}), quando o campo satura no tom da marca; por isso o título, o chapéu e a assinatura carregam uma sombra rígida própria de ${WAVES_SHADOW_OFFSET}px contra esse fundo ocupado, menor que a do candidato 5 porque o campo de ondas é mais parelho que o fogo.`,
)
</script>

<template>
  <div :class="$style.demo">
    <Panel label="candidato">
      <Pick
        v-model="view"
        label="ver"
        :options="[
          { id: 'todos', name: 'os quatro empilhados' },
          { id: 'dos', name: '1 · janela DOS' },
          { id: 'wireframe', name: '4 · wireframe 3D' },
          { id: 'fogo', name: '5 · janela DOS + fogo' },
          { id: 'ondas', name: '6 · janela DOS + ondas' },
        ]"
      />
    </Panel>

    <Panel label="conteúdo do cartão">
      <Knob v-model="seed" label="semente" :min="0" :max="200" />
      <Pick v-model="titleSize" label="comprimento do título" :options="TITLE_SIZE_OPTIONS" />
      <Pick v-model="category" label="categoria" :options="CATEGORIES" />
      <Toggle v-model="cursor" label="cursor sólido █" />
    </Panel>

    <Panel label="candidatos 4 · 5 · 6 (sólido, giro, fogo e ondas vêm do hash)">
      <Knob v-model="cellSize" label="célula da grade (fogo/ondas)" :min="16" :max="48" :step="2" unit="px" />
      <Knob v-model="wireDensity" label="densidade do wireframe" :min="5" :max="32" :step="1" unit="px" />
      <Knob v-model="wireOpacityScale" label="opacidade do wireframe" :min="0" :max="200" :step="5" unit="%" />
      <Knob v-model="fireIterations" label="iterações do fogo" :min="4" :max="60" :step="2" />
      <Knob v-model="fireDecay" label="queda do fogo" :min="1" :max="20" :step="1" />
      <Knob v-model="fireHollowBands" label="bandas ocas do fogo" :min="0" :max="5" :step="1" />
      <Knob v-model="fireAlphaHot" label="alfa quente do fogo" :min="10" :max="100" :step="5" unit="%" />
      <Knob v-model="fireAlphaCold" label="alfa frio do fogo" :min="0" :max="90" :step="5" unit="%" />
      <Pick v-model="fireAlphaMode" label="modo do alfa do fogo" :options="FIRE_ALPHA_MODE_OPTIONS" />
      <Knob v-model="waveAlphaHigh" label="alfa alto das ondas" :min="10" :max="100" :step="5" unit="%" />
      <Knob v-model="waveAlphaLow" label="alfa baixo das ondas" :min="0" :max="90" :step="5" unit="%" />
    </Panel>

    <Panel label="tom da marca (oklab, compartilhado entre 4 · 5 · 6): bordas, chapéu e campo">
      <div v-for="b in BRAND_COLORS" :key="b.id" :class="$style.inkRow">
        <Knob v-model="inkMix[b.id]" :label="`${b.id} · % da marca mantida`" :min="0" :max="100" :step="1" unit="%" />
        <p :class="$style.tiny">
          {{ brandToneReadouts[b.id].hex }} · {{ brandToneReadouts[b.id].vsBlack.toFixed(2) }}:1 sobre preto
          ({{ grade(brandToneReadouts[b.id].vsBlack) }})
        </p>
      </div>
      <!-- Branco e branco apagado: mais duas entradas que o hash pode
           sortear pra "cor da marca", sem knob (não há % pra ajustar), só o
           número contra preto, do mesmo jeito que as cinco cores acima. -->
      <div :class="$style.inkRow">
        <p :class="$style.tiny">
          branco (sem knob) · {{ TITLE_INK }} · {{ titleContrast.toFixed(2) }}:1 sobre preto
          ({{ grade(titleContrast) }})
        </p>
      </div>
      <div :class="$style.inkRow">
        <p :class="$style.tiny">
          branco apagado (sem knob) · {{ DIMMED_WHITE }} · {{ dimmedWhiteContrast.toFixed(2) }}:1 sobre preto
          ({{ grade(dimmedWhiteContrast) }})
        </p>
      </div>
    </Panel>

    <div :class="$style.grid">
      <div v-if="view === 'todos' || view === 'dos'" :class="$style.candidate">
        <p :class="$style.label">Candidato 1 · janela DOS</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, janela DOS, categoria ${category}`"
          >
            <rect width="1200" height="630" fill="#000000" />
            <rect v-bind="outerFrame" fill="none" :stroke="brandTone" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brandTone" stroke-width="3" />
            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="TITLE_INK"
              opacity="0.75"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="i"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="TITLE_INK"
            >{{ line }}</text>
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="TITLE_INK"
              :opacity="BYLINE_OPACITY"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">título {{ titleContrast.toFixed(2) }}:1 sobre #000000 · {{ grade(titleContrast) }}</p>
        <DecisionCopy
          lab="capa · janela DOS"
          component="CoverLab.vue"
          :settings="sharedDecisionSettings"
          :context="dosDecisionContext"
        />
      </div>

      <div v-if="view === 'todos' || view === 'wireframe'" :class="$style.candidate">
        <p :class="$style.label">Candidato 4 · wireframe 3D</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, wireframe 3D, categoria ${category}`"
          >
            <rect width="1200" height="630" :fill="DARK_BG" />
            <text
              v-for="(c, i) in wireCells"
              :key="i"
              :x="c.x"
              :y="c.y"
              text-anchor="middle"
              dominant-baseline="central"
              :font-family="LABEL_FONT"
              :font-size="8 + c.closeness * wireDensity"
              :fill="brandTone"
              :opacity="Math.min(1, (WIRE_OPACITY_FLOOR + c.closeness * WIRE_OPACITY_RANGE) * (wireOpacityScale / 100))"
            >+</text>
            <rect v-bind="outerFrame" fill="none" :stroke="brandTone" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brandTone" stroke-width="3" />

            <text
              :x="dosCard.padX + SHADOW_OFFSET"
              :y="dosCard.kickerY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_SHADOW"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`s${i}`"
              :x="dosCard.padX + SHADOW_OFFSET"
              :y="dosCard.titleYs[i] + SHADOW_OFFSET"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="DARK_SHADOW"
            >{{ line }}</text>
            <text
              :x="dosCard.padX + SHADOW_OFFSET"
              :y="dosCard.bylineY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="DARK_SHADOW"
            >{{ bylineText }}</text>

            <!-- Chapéu com cor própria (o tom derivado do knob de marca), não
                 a tinta do título: o objetivo é ele ler como uma camada
                 diferente do título, não a mesma tinta repetida três vezes. -->
            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="brandTone"
            >{{ kickerText }}</text>

            <!-- Régua tracejada entre o chapéu e o título: mesmo traço do
                 `--qc-rule-image` de src/styles/variants/quotes.css
                 (repeating-linear-gradient de marca 10px on / 6px off),
                 traduzido para stroke-dasharray. -->
            <line
              :x1="dosCard.padX"
              :y1="dosCard.ruleY"
              :x2="CARD_W - dosCard.padX"
              :y2="dosCard.ruleY"
              :stroke="brandTone"
              stroke-width="2"
              stroke-dasharray="10 6"
              opacity="0.7"
            />

            <text
              v-for="(line, i) in dosCard.lines"
              :key="`m${i}`"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="TITLE_INK"
            >{{ line }}</text>
            <!-- Assinatura um degrau mais fraca que o título: ainda a mesma
                 tinta branca fixa, só apagada por opacidade, pra abrir uma
                 hierarquia entre título, chapéu (tom da marca) e assinatura
                 (mais discreta). -->
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="TITLE_INK"
              :opacity="BYLINE_OPACITY"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          {{ wireSolid.params.sides }} lados · {{ wireSolid.params.ringCount }} anel(is) · tom {{ brandTone }} ·
          {{ brandToneContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} ({{ grade(brandToneContrast) }}) · título fixo
          {{ TITLE_INK }} · {{ titleContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} ({{ grade(titleContrast) }}) · pior
          caso, se o glifo mais perto cobrir a letra, {{ titleVsToneContrast.toFixed(2) }}:1
          ({{ grade(titleVsToneContrast) }})
        </p>
        <DecisionCopy
          lab="capa · wireframe 3D"
          component="CoverLab.vue"
          :settings="wireframeDecisionSettings"
          :context="wireframeDecisionContext"
        />
      </div>

      <div v-if="view === 'todos' || view === 'fogo'" :class="$style.candidate">
        <p :class="$style.label">Candidato 5 · janela DOS + fogo</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, janela DOS com fogo, categoria ${category}`"
          >
            <defs>
              <clipPath id="cover-lab-fire-clip">
                <rect v-bind="innerFrame" />
              </clipPath>
            </defs>
            <rect width="1200" height="630" :fill="DARK_BG" />
            <g clip-path="url(#cover-lab-fire-clip)">
              <rect
                v-for="(c, i) in dosFireCells"
                :key="i"
                :x="c.x"
                :y="c.y"
                :width="cellSize"
                :height="cellSize"
                :fill="c.hollow ? 'none' : c.fill"
                :stroke="c.hollow ? c.fill : 'none'"
                :stroke-width="c.hollow ? 1.5 : 0"
                :opacity="c.alpha"
              />
            </g>
            <rect v-bind="outerFrame" fill="none" :stroke="brandTone" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brandTone" stroke-width="3" />

            <!-- Sombra maior que a do candidato 4 (BUSY_SHADOW_OFFSET, o
                 dobro): o fogo por trás é uma textura bem mais ocupada, e o
                 offset rígido de sempre se perdia nela. -->
            <text
              :x="dosCard.padX + BUSY_SHADOW_OFFSET"
              :y="dosCard.kickerY + BUSY_SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_SHADOW"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`s${i}`"
              :x="dosCard.padX + BUSY_SHADOW_OFFSET"
              :y="dosCard.titleYs[i] + BUSY_SHADOW_OFFSET"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="DARK_SHADOW"
            >{{ line }}</text>
            <text
              :x="dosCard.padX + BUSY_SHADOW_OFFSET"
              :y="dosCard.bylineY + BUSY_SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="DARK_SHADOW"
            >{{ bylineText }}</text>

            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="TITLE_INK"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`m${i}`"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="TITLE_INK"
            >{{ line }}</text>
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="TITLE_INK"
              :opacity="BYLINE_OPACITY"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          fogo da borda "{{ fireField.edge }}" · {{ fireFilledCount }} células cheias · {{ fireHollowCount }} ocas ·
          alfa {{ fireAlphaMode }} {{ fireAlphaCold }}%–{{ fireAlphaHot }}% · tom {{ brandTone }} ·
          {{ brandToneContrast.toFixed(2) }}:1 sobre preto ({{ grade(brandToneContrast) }}) · título fixo
          {{ titleContrast.toFixed(2) }}:1 sobre preto ({{ grade(titleContrast) }}) · pior caso real (recalculado com
          o alfa quente sobre o tom) {{ titleVsFireWorstContrast.toFixed(2) }}:1 sobre {{ fireWorstBg }}
          ({{ grade(titleVsFireWorstContrast) }})
        </p>
        <DecisionCopy
          lab="capa · janela DOS + fogo"
          component="CoverLab.vue"
          :settings="fireDecisionSettings"
          :context="fireDecisionContext"
        />
      </div>

      <div v-if="view === 'todos' || view === 'ondas'" :class="$style.candidate">
        <p :class="$style.label">Candidato 6 · janela DOS + ondas</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, janela DOS com ondas quantizadas, categoria ${category}`"
          >
            <defs>
              <clipPath id="cover-lab-waves-clip">
                <rect v-bind="innerFrame" />
              </clipPath>
            </defs>
            <rect width="1200" height="630" :fill="DARK_BG" />
            <!-- Mesmo mecanismo de recorte do candidato 5 (fogo): um
                 clipPath preso à moldura interna, reaproveitado aqui em vez
                 de escrito de novo, porque uma janela DOS de verdade também
                 não deixaria o campo de ondas passar por cima da moldura. -->
            <g clip-path="url(#cover-lab-waves-clip)">
              <rect
                v-for="(c, i) in sixWaveCells"
                :key="i"
                :x="c.x"
                :y="c.y"
                :width="cellSize"
                :height="cellSize"
                :fill="c.fill"
                :opacity="c.alpha"
              />
            </g>
            <rect v-bind="outerFrame" fill="none" :stroke="brandTone" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brandTone" stroke-width="3" />

            <!-- Sombra própria do candidato 6 (WAVES_SHADOW_OFFSET): mais
                 perto do texto que a do fogo (candidato 5), porque o campo
                 de ondas por trás é mais parelho e não precisa do mesmo
                 afastamento pra não se confundir com uma cópia do texto. -->
            <text
              :x="dosCard.padX + WAVES_SHADOW_OFFSET"
              :y="dosCard.kickerY + WAVES_SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_SHADOW"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`s${i}`"
              :x="dosCard.padX + WAVES_SHADOW_OFFSET"
              :y="dosCard.titleYs[i] + WAVES_SHADOW_OFFSET"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="DARK_SHADOW"
            >{{ line }}</text>
            <text
              :x="dosCard.padX + WAVES_SHADOW_OFFSET"
              :y="dosCard.bylineY + WAVES_SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="DARK_SHADOW"
            >{{ bylineText }}</text>

            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="TITLE_INK"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`m${i}`"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="TITLE_INK"
            >{{ line }}</text>
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="TITLE_INK"
              :opacity="BYLINE_OPACITY"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          {{ sixWave.levels }} tons · alfa {{ waveAlphaLow }}%–{{ waveAlphaHigh }}% · tom {{ brandTone }} ·
          {{ brandToneContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} ({{ grade(brandToneContrast) }}) · título fixo
          {{ titleContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} ({{ grade(titleContrast) }}) · pior caso real
          {{ titleVsToneContrast.toFixed(2) }}:1 sobre {{ brandTone }} ({{ grade(titleVsToneContrast) }})
        </p>
        <DecisionCopy
          lab="capa · janela DOS + ondas"
          component="CoverLab.vue"
          :settings="sixDecisionSettings"
          :context="sixDecisionContext"
        />
      </div>
    </div>

    <p :class="$style.readout">
      O título é sempre a mesma tinta branca fixa nos quatro candidatos, {{ TITLE_INK }}, nunca mais derivada da cor
      da marca: {{ titleContrast.toFixed(2) }}:1 sobre preto ({{ grade(titleContrast) }}), a mesma razão pros quatro,
      qualquer marca, qualquer knob. Quem ainda usa a mistura em direção ao branco em oklab, color-mix(in oklab,
      marca N%, white), são as bordas dos quatro candidatos, o chapéu do wireframe (4) e as células de campo do fogo
      (5) e das ondas (6): um knob por cor de marca no painel acima decide o N, porque um só ajuste nunca valeu pras
      cinco ao mesmo tempo (o roxo voltou escuro demais três vezes tentando). No valor de partida de cada knob, esse
      tom fica em {{ brandToneContrast.toFixed(2) }}:1 ({{ grade(brandToneContrast) }}) sobre preto para a marca
      ativa. A alegação antiga, de que verde e amarelo não fechavam 4.5:1 nem no branco puro contra a própria versão
      saturada deles, era sobre a tinta do título contra o campo saturado na cor crua da marca; ela não vale mais do
      jeito que estava, porque o título não deriva mais da marca e o campo agora satura no tom do knob, não na cor
      crua. O que sobrou de risco mudou de forma: no valor de partida de cada knob, o tom fica claro demais perto do
      próprio branco do título, e é aí que mora o pior caso agora, pras cinco cores, não só duas. Pior caso do
      wireframe e das ondas, se o glifo mais perto da câmera ou o campo saturarem por baixo do título,
      {{ titleVsToneContrast.toFixed(2) }}:1 ({{ grade(titleVsToneContrast) }}) contra {{ brandTone }}; o do fogo é
      recalculado com o próprio alfa quente do knob sobre esse mesmo tom,
      {{ titleVsFireWorstContrast.toFixed(2) }}:1 ({{ grade(titleVsFireWorstContrast) }}) sobre {{ fireWorstBg }},
      porque uma célula do fogo nunca pinta a cor cheia sem mistura. O wireframe carrega a sombra rígida original de
      {{ SHADOW_OFFSET }}px; o fogo, contra um fundo bem mais desigual, carrega o dobro, {{ BUSY_SHADOW_OFFSET }}px; as
      ondas, contra um campo mais parelho que o fogo, precisam de menos afastamento, {{ WAVES_SHADOW_OFFSET }}px. No
      wireframe, a opacidade do sólido agora também escala por um knob (padrão 100%, o mesmo desenho de sempre), por
      cima da queda por distância de sempre; a própria moldura continua mais vibrante que o sólido atrás dela, pra
      ler como duas camadas. O fogo (5) e as ondas (6) são efeitos diferentes de propósito (simulação de fogo contra
      campo de senos quantizado), e os dois agora variam a opacidade por célula, derivada da própria intensidade da
      célula em cada um; célula oca continua só do fogo, pra não virarem a mesma leitura duas vezes.
    </p>
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.grid {
  display: grid;
  margin-block-start: 1rem;
}

.grid > * + * {
  margin-block-start: 1.6rem;
}

.candidate {
  display: grid;
}

.candidate > * + * {
  margin-block-start: 0.5rem;
}

.label {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.stage {
  position: relative;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
}

.stage svg {
  display: block;
  inline-size: 100%;
  block-size: auto;
}

.tiny {
  margin: 0;
  color: var(--muted);
  font-size: 0.7rem;
}

.inkRow {
  display: grid;
}

.inkRow > * + * {
  margin-block-start: 0.2rem;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
