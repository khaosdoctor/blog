<script setup lang="ts">
/**
 * Seção 02: cinco capas OG/social candidatas, 1200×630, com o título assado por
 * cima. Cada uma é um `<svg viewBox="0 0 1200 630">` de verdade, não canvas: o
 * gerador real rasteriza SVG com `sharp` no build, então o que está aqui entra
 * na build sem reescrita, e a proporção fica honesta enquanto a pré-visualização
 * encolhe para caber na coluna do post.
 *
 * Determinismo: nada aqui chama `Math.random()`. Cor da marca, sólido do
 * wireframe, giro dele e o campo de ondas vêm todos de um inteiro (o "seed").
 * No gerador real esse inteiro é `hashSlug(post.slug)`, então o mesmo post
 * sempre bate a mesma capa e o cache do card social não estraga a cada build;
 * aqui, sem um post de verdade para hashear, o knob "semente" faz esse papel e
 * soma-se ao hash do slug de exemplo.
 */
import { computed, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { composite, grade, parseHex, ratio, toHex } from './contrast'
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

const BRANDS = [
  { id: 'vermelho', hex: '#e30613' },
  { id: 'verde', hex: '#45b384' },
  { id: 'amarelo', hex: '#f5b200' },
  { id: 'azul', hex: '#0578be' },
  { id: 'roxo', hex: '#4b15a8' },
] as const

// O amarelo é claro demais para texto claro por cima: só ele pede tinta escura.
const INK_ON_BRAND: Record<string, string> = {
  vermelho: '#f5f4f0',
  verde: '#f5f4f0',
  azul: '#f5f4f0',
  roxo: '#f5f4f0',
  amarelo: '#14161a',
}

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
 * sólido do candidato 4 e o campo do candidato 5 nascerem do hash do slug em
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
 * direção) não têm relação linear entre si, então o campo forma vários focos
 * de claro e escuro em vez de uma rampa, e a orientação das bandas muda de
 * post para post.
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

/**
 * Campo compartilhado pelos candidatos 3 e 5: mesma matemática, dois usos.
 * `quantize=false` (candidato 3) deixa o valor contínuo, então o plasma tem
 * dez, vinte tons de transição; `quantize=true` (candidato 5) arredonda para
 * `levels` degraus só, que é o efeito de "poucos tons" pedido para a janela
 * DOS: bandas com aresta dura, não gradiente suave.
 */
function waveField(
  params: WaveParams,
  brandHex: string,
  bgHex: string,
  size: number,
  quantize: boolean,
): Array<{ x: number; y: number; fill: string }> {
  const cols = Math.ceil(CARD_W / size)
  const rows = Math.ceil(CARD_H / size)
  const brandRgb = parseHex(brandHex)
  const bgRgb = parseHex(bgHex)
  const cosD = Math.cos(params.direction)
  const sinD = Math.sin(params.direction)
  const cells: Array<{ x: number; y: number; fill: string }> = []
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
      const alpha = quantize
        ? params.levels === 1
          ? 0
          : Math.min(params.levels - 1, Math.floor(raw * params.levels)) / (params.levels - 1)
        : raw
      cells.push({ x: col * size, y: row * size, fill: toHex(composite(brandRgb, bgRgb, alpha)) })
    }
  }
  return cells
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

const seed = ref(9)
const view = ref('todos')
const titleSize = ref('curto')
const category = ref('meta')
const cellSize = ref(28)
const cursor = ref(true)
const wireDensity = ref(22)
const plasmaStrength = ref(55)

const effectiveSeed = computed(() => (hashSlug(DEMO_SLUG) + seed.value) >>> 0)
const brand = computed(() => BRANDS[effectiveSeed.value % BRANDS.length])
const bleedInk = computed(() => INK_ON_BRAND[brand.value.id])

// Cada gerador puxa do mesmo hash, mas por uma semente derivada diferente
// (XOR com uma constante própria), para o sólido do candidato 4 e as ondas
// dos candidatos 3 e 5 não desenharem sempre o mesmo padrão relativo entre si
// para o mesmo post.
const PLASMA_WAVE_SALT = 0x1000193
const DOS_WAVE_SALT = 0x9e3779b9

const wireSolid = computed(() => generateSolid(mulberry32(effectiveSeed.value)))
const plasmaWave = computed(() => generateWaveParams(mulberry32((effectiveSeed.value ^ PLASMA_WAVE_SALT) >>> 0)))
const dosWave = computed(() => generateWaveParams(mulberry32((effectiveSeed.value ^ DOS_WAVE_SALT) >>> 0)))

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
const bleedCard = computed(() => buildCard(90, 110))
const plasmaCard = computed(() => buildCard(90, 110))

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
const DARK_INK = '#e6e4e0'
const DARK_SHADOW = '#050505'
const SHADOW_OFFSET = 3

const meshPlasmaCells = computed(() => waveField(plasmaWave.value, brand.value.hex, DARK_BG, cellSize.value, false))
const dosWaveCells = computed(() => waveField(dosWave.value, brand.value.hex, DARK_BG, cellSize.value, true))

const WIRE_CENTER = { x: 900, y: 335 }
const WIRE_RADIUS = 130
const WIRE_CAM_DIST = 4.5

/**
 * Em vez de desenhar as arestas como `<line>`, cada uma é amostrada em pontos
 * e cada ponto vira um "+" preso à grade de `wireDensity` px, no espírito do
 * cubo feito só de "+": uma malha de caracteres, não um traço vetorial liso.
 * A profundidade de cada ponto (o Z depois da rotação, antes da perspectiva)
 * dá a leitura de 3D de verdade: pontos mais perto da câmera saem com glifo
 * maior e mais opaco, os mais longe saem menores e quase apagados, a mesma
 * ideia de "arestas escondidas ainda desenhadas, só que fracas" do cubo de
 * referência. Quando duas arestas caem na mesma célula da grade, fica a mais
 * perto (a de maior "closeness"), porque é ela que estaria na frente.
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

const dosContrast = computed(() => ratio(parseHex('#e6e4e0'), parseHex('#000000')))
const bleedContrast = computed(() => ratio(parseHex(bleedInk.value), parseHex(brand.value.hex)))
// Plasma, wireframe e ondas usam a mesma tinta e o mesmo preto de base, e nos
// três o efeito satura na cor da marca no extremo mais forte (alpha 1 no
// plasma e nas ondas, glifo bem próximo no wireframe): por isso o melhor e o
// pior caso são os mesmos três números para os três candidatos.
const darkBestContrast = computed(() => ratio(parseHex(DARK_INK), parseHex(DARK_BG)))
const darkWorstContrast = computed(() => ratio(parseHex(DARK_INK), parseHex(brand.value.hex)))

// Preto puro se ele ler melhor do que a tinta do candidato contra o fundo da
// marca, tinta caso contrário. Decidido pela razão de contraste, não por uma
// lista de nomes de paleta, então uma marca nova cai no lado certo sozinha.
const bleedRuleColour = computed(() => {
  const onBlack = ratio(parseHex('#000000'), parseHex(brand.value.hex))
  const onInk = ratio(parseHex(bleedInk.value), parseHex(brand.value.hex))
  return onBlack >= onInk ? '#000000' : bleedInk.value
})

// Os cinco candidatos compartilham semente, categoria, comprimento do título
// e cursor: todos entram na cor, no rótulo e no texto dos cinco cartões.
const sharedDecisionSettings = computed(() => [
  { label: 'categoria', value: category.value },
  { label: 'comprimento do título', value: labelFor(TITLE_SIZE_OPTIONS, titleSize.value) },
  { label: 'cor da marca', value: `${brand.value.id} (${brand.value.hex})` },
  { label: 'cursor sólido █', value: cursor.value ? 'sim' : 'não' },
  { label: 'semente', value: String(seed.value) },
])

const plasmaDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'célula da grade', value: `${cellSize.value}px` },
  { label: 'força do plasma', value: `${plasmaStrength.value}%` },
])

const wireframeDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'densidade do wireframe', value: `${wireDensity.value}px` },
  {
    label: 'sólido gerado (hash)',
    value: `${wireSolid.value.params.sides} lados · ${wireSolid.value.params.ringCount} anel(is) · ${wireSolid.value.params.topClose ? 'topo fechado' : 'topo aberto'} · ${wireSolid.value.params.bottomClose ? 'base fechada' : 'base aberta'}`,
  },
])

const wavesDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'célula da grade', value: `${cellSize.value}px` },
  { label: 'tons gerados (hash)', value: String(dosWave.value.levels) },
])

const SVG_NOTE = 'A capa é um <svg viewBox="0 0 1200 630"> de verdade (1200x630), o mesmo SVG que o gerador rasteriza com sharp no build. Cor da marca e semente derivam de hashSlug(post.slug) + semente, nunca de Math.random(), para o cache do card social não estragar a cada build.'

const dosDecisionContext = computed(
  () => `${SVG_NOTE} Título ${dosContrast.value.toFixed(2)}:1 sobre #000000 (${grade(dosContrast.value)}).`,
)

const bleedDecisionContext = computed(
  () =>
    `${SVG_NOTE} Título ${bleedContrast.value.toFixed(2)}:1 sobre ${brand.value.hex} (${grade(bleedContrast.value)}).`,
)

const darkContextTail = computed(
  () =>
    `Título ${darkBestContrast.value.toFixed(2)}:1 sobre ${DARK_BG} no melhor caso (${grade(darkBestContrast.value)}); pior caso real ${darkWorstContrast.value.toFixed(2)}:1 sobre ${brand.value.hex} (${grade(darkWorstContrast.value)}), quando o efeito satura na cor da marca; por isso o título carrega uma sombra rígida de ${SHADOW_OFFSET}px.`,
)

const plasmaDecisionContext = computed(
  () => `${SVG_NOTE} Candidato único (plasma, sem wireframe empilhado por cima). ${darkContextTail.value}`,
)

const wireframeDecisionContext = computed(
  () =>
    `${SVG_NOTE} Sólido e giro nascem do hash do slug via um PRNG pequeno (mulberry32), não de Math.random() nem de uma lista fixa de formas; a projeção é perspectiva pura em JS (sem canvas, sem WebGL, sem textmode.js), porque o gerador real só roda sharp sobre SVG estático no build. ${darkContextTail.value}`,
)

const wavesDecisionContext = computed(
  () =>
    `${SVG_NOTE} Mesma moldura dupla do candidato 1, fundo preto, e um campo de ondas quantizado em poucos tons (como uma paleta de máquina antiga) em vez do gradiente contínuo do candidato 3; frequência, fase, direção e número de tons também nascem do hash. ${darkContextTail.value}`,
)
</script>

<template>
  <div :class="$style.demo">
    <Panel label="candidato">
      <Pick
        v-model="view"
        label="ver"
        :options="[
          { id: 'todos', name: 'os cinco empilhados' },
          { id: 'dos', name: '1 · janela DOS' },
          { id: 'bleed', name: '2 · sem moldura' },
          { id: 'plasma', name: '3 · plasma' },
          { id: 'wireframe', name: '4 · wireframe 3D' },
          { id: 'ondas', name: '5 · janela DOS + ondas' },
        ]"
      />
    </Panel>

    <Panel label="conteúdo do cartão">
      <Knob v-model="seed" label="semente" :min="0" :max="200" />
      <Pick v-model="titleSize" label="comprimento do título" :options="TITLE_SIZE_OPTIONS" />
      <Pick v-model="category" label="categoria" :options="CATEGORIES" />
      <Toggle v-model="cursor" label="cursor sólido █" />
    </Panel>

    <Panel label="candidatos 3 · 4 · 5 (o resto do sólido e das ondas vem do hash)">
      <Knob v-model="cellSize" label="célula da grade (plasma/ondas)" :min="16" :max="48" :step="2" unit="px" />
      <Knob v-model="plasmaStrength" label="força do plasma" :min="0" :max="100" :step="5" unit="%" />
      <Knob v-model="wireDensity" label="densidade do wireframe" :min="12" :max="32" :step="2" unit="px" />
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
            <rect v-bind="outerFrame" fill="none" :stroke="brand.hex" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brand.hex" stroke-width="3" />
            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              fill="#e6e4e0"
              opacity="0.75"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="i"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              fill="#e6e4e0"
            >{{ line }}</text>
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="brand.hex"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">título {{ dosContrast.toFixed(2) }}:1 sobre #000000 · {{ grade(dosContrast) }}</p>
        <DecisionCopy
          lab="capa · janela DOS"
          component="CoverLab.vue"
          :settings="sharedDecisionSettings"
          :context="dosDecisionContext"
        />
      </div>

      <div v-if="view === 'todos' || view === 'bleed'" :class="$style.candidate">
        <p :class="$style.label">Candidato 2 · sem moldura</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, sem moldura, categoria ${category}`"
          >
            <defs>
              <linearGradient id="cover-lab-bleed-rule-fade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" :stop-color="bleedRuleColour" stop-opacity="1" />
                <stop offset="100%" :stop-color="bleedRuleColour" stop-opacity="0" />
              </linearGradient>
            </defs>
            <rect width="1200" height="630" :fill="brand.hex" />
            <text
              :x="bleedCard.padX"
              :y="bleedCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="bleedInk"
              opacity="0.8"
            >{{ kickerText }}</text>
            <line
              x1="0"
              :y1="bleedCard.ruleY"
              :x2="CARD_W * 0.75"
              :y2="bleedCard.ruleY"
              stroke="url(#cover-lab-bleed-rule-fade)"
              stroke-width="4"
            />
            <text
              v-for="(line, i) in bleedCard.lines"
              :key="i"
              :x="bleedCard.padX"
              :y="bleedCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="bleedCard.fontSize"
              :fill="bleedInk"
            >{{ line }}</text>
            <text
              :x="bleedCard.padX"
              :y="bleedCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="bleedInk"
              opacity="0.8"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">título {{ bleedContrast.toFixed(2) }}:1 sobre {{ brand.hex }} · {{ grade(bleedContrast) }}</p>
        <DecisionCopy
          lab="capa · sem moldura"
          component="CoverLab.vue"
          :settings="sharedDecisionSettings"
          :context="bleedDecisionContext"
        />
      </div>

      <div v-if="view === 'todos' || view === 'plasma'" :class="$style.candidate">
        <p :class="$style.label">Candidato 3 · plasma</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, plasma, categoria ${category}`"
          >
            <rect width="1200" height="630" :fill="DARK_BG" />
            <g :opacity="plasmaStrength / 100">
              <rect v-for="(c, i) in meshPlasmaCells" :key="i" :x="c.x" :y="c.y" :width="cellSize" :height="cellSize" :fill="c.fill" />
            </g>

            <text
              :x="plasmaCard.padX + SHADOW_OFFSET"
              :y="plasmaCard.kickerY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_SHADOW"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in plasmaCard.lines"
              :key="`s${i}`"
              :x="plasmaCard.padX + SHADOW_OFFSET"
              :y="plasmaCard.titleYs[i] + SHADOW_OFFSET"
              :font-family="TITLE_FONT"
              :font-size="plasmaCard.fontSize"
              :fill="DARK_SHADOW"
            >{{ line }}</text>
            <text
              :x="plasmaCard.padX + SHADOW_OFFSET"
              :y="plasmaCard.bylineY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="DARK_SHADOW"
            >{{ bylineText }}</text>

            <text
              :x="plasmaCard.padX"
              :y="plasmaCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_INK"
              opacity="0.92"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in plasmaCard.lines"
              :key="`m${i}`"
              :x="plasmaCard.padX"
              :y="plasmaCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="plasmaCard.fontSize"
              :fill="DARK_INK"
            >{{ line }}</text>
            <text
              :x="plasmaCard.padX"
              :y="plasmaCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="DARK_INK"
              opacity="0.92"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          título {{ darkBestContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} no melhor caso ({{ grade(darkBestContrast) }}) ·
          pior caso real {{ darkWorstContrast.toFixed(2) }}:1 sobre {{ brand.hex }} ({{ grade(darkWorstContrast) }})
        </p>
        <DecisionCopy
          lab="capa · plasma"
          component="CoverLab.vue"
          :settings="plasmaDecisionSettings"
          :context="plasmaDecisionContext"
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
              :fill="brand.hex"
              :opacity="0.3 + c.closeness * 0.65"
            >+</text>

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

            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_INK"
              opacity="0.92"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`m${i}`"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="DARK_INK"
            >{{ line }}</text>
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="brand.hex"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          {{ wireSolid.params.sides }} lados · {{ wireSolid.params.ringCount }} anel(is) · título
          {{ darkBestContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} no melhor caso ({{ grade(darkBestContrast) }}) ·
          pior caso real {{ darkWorstContrast.toFixed(2) }}:1 sobre {{ brand.hex }} ({{ grade(darkWorstContrast) }})
        </p>
        <DecisionCopy
          lab="capa · wireframe 3D"
          component="CoverLab.vue"
          :settings="wireframeDecisionSettings"
          :context="wireframeDecisionContext"
        />
      </div>

      <div v-if="view === 'todos' || view === 'ondas'" :class="$style.candidate">
        <p :class="$style.label">Candidato 5 · janela DOS + ondas</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, janela DOS com ondas quantizadas, categoria ${category}`"
          >
            <rect width="1200" height="630" :fill="DARK_BG" />
            <rect v-for="(c, i) in dosWaveCells" :key="i" :x="c.x" :y="c.y" :width="cellSize" :height="cellSize" :fill="c.fill" />
            <rect v-bind="outerFrame" fill="none" :stroke="brand.hex" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brand.hex" stroke-width="3" />

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

            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="DARK_INK"
              opacity="0.92"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`m${i}`"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="DARK_INK"
            >{{ line }}</text>
            <text
              :x="dosCard.padX"
              :y="dosCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="brand.hex"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          {{ dosWave.levels }} tons · título {{ darkBestContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} no melhor caso
          ({{ grade(darkBestContrast) }}) · pior caso real {{ darkWorstContrast.toFixed(2) }}:1 sobre {{ brand.hex }}
          ({{ grade(darkWorstContrast) }})
        </p>
        <DecisionCopy
          lab="capa · janela DOS + ondas"
          component="CoverLab.vue"
          :settings="wavesDecisionSettings"
          :context="wavesDecisionContext"
        />
      </div>
    </div>

    <p :class="$style.readout">
      Os cinco contrastes de título, sempre pelo texto real: janela DOS {{ dosContrast.toFixed(2) }}:1 sobre preto
      ({{ grade(dosContrast) }}), sem moldura {{ bleedContrast.toFixed(2) }}:1 sobre {{ brand.hex }}
      ({{ grade(bleedContrast) }}). Plasma, wireframe 3D e janela DOS com ondas usam a mesma tinta sobre o mesmo
      preto de base, então o melhor caso é igual nos três: {{ darkBestContrast.toFixed(2) }}:1
      ({{ grade(darkBestContrast) }}); o pior caso também é igual: {{ darkWorstContrast.toFixed(2) }}:1
      ({{ grade(darkWorstContrast) }}) sobre {{ brand.hex }}, quando o efeito satura na cor da marca. É por isso que
      os três carregam a mesma sombra rígida de {{ SHADOW_OFFSET }}px em vez de confiar só na cor de fundo.
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

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
