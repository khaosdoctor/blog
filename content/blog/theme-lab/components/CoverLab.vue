<script setup lang="ts">
/**
 * Seção 04: três capas OG/social candidatas, 1200×630, com o título assado por
 * cima. Cada uma é um `<svg viewBox="0 0 1200 630">` de verdade, não canvas: o
 * gerador real rasteriza SVG com `sharp` no build, então o que está aqui entra
 * na build sem reescrita, e a proporção fica honesta enquanto a pré-visualização
 * encolhe para caber na coluna do post.
 *
 * Determinismo: nada aqui chama `Math.random()`. Cor da marca, forma do plasma
 * e tudo o resto vêm de um inteiro (o "seed"). No gerador real esse inteiro é
 * `hashSlug(post.slug)`, então o mesmo post sempre bate a mesma capa e o cache
 * do card social não estraga a cada build; aqui, sem um post de verdade para
 * hashear, o knob "semente" faz esse papel e soma-se ao hash do slug de exemplo.
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
 * Sólidos de baixa contagem de polígono para o wireframe do candidato 3, no
 * espírito do Elite (1984): vértices e arestas puros, sem face nem sombreado,
 * a mesma malha desenhada inteira mesmo do lado escondido. Coordenadas de -1 a
 * 1 porque a projeção abaixo escala pelo raio na hora.
 */
type Vec3 = [number, number, number]
interface Solid {
  vertices: Vec3[]
  edges: Array<[number, number]>
}

const SOLIDS: Record<string, Solid> = {
  cubo: {
    vertices: [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ],
  },
  piramide: {
    vertices: [
      [0, -1, 0],
      [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1],
    ],
    edges: [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 2], [2, 3], [3, 4], [4, 1],
    ],
  },
  octaedro: {
    vertices: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
    edges: [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [2, 5], [3, 4], [3, 5],
    ],
  },
}
const SOLID_IDS = Object.keys(SOLIDS)
const SOLID_OPTIONS = [
  { id: 'auto', name: 'automático (hash)' },
  { id: 'cubo', name: 'cubo' },
  { id: 'piramide', name: 'pirâmide' },
  { id: 'octaedro', name: 'octaedro' },
]

/**
 * Projeção ortográfica pura (sem perspectiva): gira em Y depois em X e ignora
 * a profundidade resultante. O Elite também não sombreava por profundidade,
 * só desenhava a aresta; a leitura de "objeto girando" vem da rotação, não de
 * um Z fingido.
 */
function project(v: Vec3, yaw: number, pitch: number, cx: number, cy: number, scale: number) {
  const [x, y, z] = v
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw)
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw)
  const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch)
  return { x: cx + x1 * scale, y: cy + y1 * scale }
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
const solidPick = ref('auto')
const wireDensity = ref(22)
const plasmaStrength = ref(55)

const effectiveSeed = computed(() => (hashSlug(DEMO_SLUG) + seed.value) >>> 0)
const brand = computed(() => BRANDS[effectiveSeed.value % BRANDS.length])
const bleedInk = computed(() => INK_ON_BRAND[brand.value.id])

const rawTitle = computed(() => TITLES[titleSize.value])
// O cursor entra na string antes do quebra-linha, não depois: assim, se a
// última linha já está no limite, o "." e o "█" empurram a quebra em vez de
// vazar para fora do cartão.
const displayTitle = computed(() => (cursor.value ? `${rawTitle.value}.█` : rawTitle.value))
const kickerText = computed(() => `BLOG.LSANTOS.DEV / ${category.value.toUpperCase()}`)
const bylineText = 'Lucas Santos · 14 AGO 2026'

const KICKER_SIZE = 22
const BYLINE_SIZE = 20
const LINE_GAP = 1.22
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
  const lineHeight = fontSize * LINE_GAP
  const gap1 = fontSize * 0.55
  const gap2 = fontSize * 0.5
  const blockHeight = KICKER_SIZE * LINE_GAP + gap1 + lines.length * lineHeight + gap2 + BYLINE_SIZE * LINE_GAP
  const contentHeight = CARD_H - padY * 2
  const startY = padY + Math.max(0, (contentHeight - blockHeight) / 2)
  const kickerY = startY + KICKER_SIZE
  const titleStartY = kickerY + gap1 + fontSize
  const titleYs = lines.map((_, index) => titleStartY + index * lineHeight)
  const bylineY = titleYs[titleYs.length - 1] + gap2 + BYLINE_SIZE
  return { padX, fontSize, lines, kickerY, ruleY: kickerY + gap1 * 0.5, titleYs, bylineY }
}

const dosCard = computed(() => buildCard(160, 140))
const bleedCard = computed(() => buildCard(90, 110))

// Moldura dupla: uma borda "double" ingênua deixa 2-4px entre as duas linhas,
// que foi exatamente a reclamação da última tentativa ("apertada demais"). O
// vão aqui é sete vezes isso.
const BORDER_OUTER_INSET = 36
const BORDER_STROKE = 4
const BORDER_GAP = 28
const BORDER_INNER_INSET = BORDER_OUTER_INSET + BORDER_STROKE + BORDER_GAP

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

const MESH_BG = '#000000'
const MESH_INK = '#e6e4e0'
const MESH_SHADOW = '#050505'
const SHADOW_OFFSET = 3

/**
 * O campo original somava três senos com frequências quase iguais e todas
 * crescendo junto com col/row: o resultado era uma única rampa de claro a
 * escuro, quase sem textura, e por isso lia como "uma caixa preta que muda de
 * cor com a semente" em vez de plasma. Aqui as três frequências são bem
 * diferentes entre si e a terceira usa (col - row), não (col + row), para não
 * reforçar as outras duas na mesma direção: o resultado tem vários focos
 * claros e escuros espalhados pelo cartão, não uma rampa só.
 */
const meshPlasmaCells = computed(() => {
  const size = cellSize.value
  const cols = Math.ceil(CARD_W / size)
  const rows = Math.ceil(CARD_H / size)
  const brandRgb = parseHex(brand.value.hex)
  const bgRgb = parseHex(MESH_BG)
  const phase = (effectiveSeed.value % 100) * 0.31
  const cells: Array<{ x: number; y: number; fill: string }> = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wave =
        (Math.sin(col * 0.35 + phase) +
          Math.sin(row * 0.4 - phase * 0.7) +
          Math.sin((col - row) * 0.3 + phase * 1.1)) /
          6 +
        0.5
      const value = Math.max(0, Math.min(1, wave))
      cells.push({ x: col * size, y: row * size, fill: toHex(composite(brandRgb, bgRgb, value)) })
    }
  }
  return cells
})

// Sólido e giro vêm do mesmo hash que já escolhe a cor: nada aqui chama
// Math.random(), então o mesmo post sempre desenha o mesmo objeto no mesmo
// ângulo. O knob "sólido" deixa passar por cima do automático para navegar as
// três formas sem precisar variar a semente.
const activeSolidId = computed(() =>
  solidPick.value === 'auto' ? SOLID_IDS[effectiveSeed.value % SOLID_IDS.length] : solidPick.value,
)
const wireYaw = computed(() => ((effectiveSeed.value % 360) * Math.PI) / 180)
const wirePitch = computed(() => (((Math.floor(effectiveSeed.value / 37) % 360) * Math.PI) / 180))

const WIRE_CENTER = { x: 900, y: 335 }
const WIRE_RADIUS = 150

/**
 * Em vez de desenhar as arestas como <line>, cada uma é amostrada em pontos e
 * cada ponto vira um "+" preso à grade de wireDensity px: é o que faz o objeto
 * ler como uma malha de caracteres (a referência do cubo feito só de "+"),
 * não como um desenho vetorial liso. Arestas escondidas não são removidas,
 * o Elite também não fazia esse corte, então pontos repetidos na mesma
 * célula da grade só entram uma vez, para não empilhar glifos em cima do
 * outro sem necessidade.
 */
const wireCells = computed(() => {
  const solid = SOLIDS[activeSolidId.value]
  const step = wireDensity.value
  const projected = solid.vertices.map((v) =>
    project(v, wireYaw.value, wirePitch.value, WIRE_CENTER.x, WIRE_CENTER.y, WIRE_RADIUS),
  )
  const seen = new Set<string>()
  const cells: Array<{ x: number; y: number }> = []
  for (const [a, b] of solid.edges) {
    const p1 = projected[a]
    const p2 = projected[b]
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const steps = Math.max(1, Math.round(length / step))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const gx = Math.round((p1.x + (p2.x - p1.x) * t) / step) * step
      const gy = Math.round((p1.y + (p2.y - p1.y) * t) / step) * step
      const key = `${gx},${gy}`
      if (seen.has(key)) continue
      seen.add(key)
      cells.push({ x: gx, y: gy })
    }
  }
  return cells
})

const dosContrast = computed(() => ratio(parseHex('#e6e4e0'), parseHex('#000000')))
const bleedContrast = computed(() => ratio(parseHex(bleedInk.value), parseHex(brand.value.hex)))
// Pior caso de verdade: tanto o plasma no alpha máximo quanto o traço do
// wireframe convergem para a cor da marca, então é contra ela que o título
// realmente precisa ler, não contra o preto de base (que é o melhor caso).
const meshContrast = computed(() => ratio(parseHex(MESH_INK), parseHex(MESH_BG)))
const meshWorstContrast = computed(() => ratio(parseHex(MESH_INK), parseHex(brand.value.hex)))

// Preto puro se ele ler melhor do que a tinta do candidato contra o fundo da
// marca, tinta caso contrário. Decidido pela razão de contraste, não por uma
// lista de nomes de paleta, então uma marca nova cai no lado certo sozinha.
const bleedRuleColour = computed(() => {
  const onBlack = ratio(parseHex('#000000'), parseHex(brand.value.hex))
  const onInk = ratio(parseHex(bleedInk.value), parseHex(brand.value.hex))
  return onBlack >= onInk ? '#000000' : bleedInk.value
})

// Os três candidatos compartilham semente, categoria, comprimento do título e
// cursor: todos entram na cor, no rótulo e no texto dos três cartões. Célula
// do plasma, sólido, densidade do wireframe e força do plasma só existem no
// candidato 3, então só aparecem na decisão dele.
const sharedDecisionSettings = computed(() => [
  { label: 'categoria', value: category.value },
  { label: 'comprimento do título', value: labelFor(TITLE_SIZE_OPTIONS, titleSize.value) },
  { label: 'cor da marca', value: `${brand.value.id} (${brand.value.hex})` },
  { label: 'cursor sólido █', value: cursor.value ? 'sim' : 'não' },
  { label: 'semente', value: String(seed.value) },
])

const meshDecisionSettings = computed(() => [
  ...sharedDecisionSettings.value,
  { label: 'célula do plasma', value: `${cellSize.value}px` },
  { label: 'força do plasma', value: `${plasmaStrength.value}%` },
  { label: 'sólido do wireframe', value: labelFor(SOLID_OPTIONS, solidPick.value) },
  { label: 'densidade do wireframe', value: `${wireDensity.value}px` },
])

const SVG_NOTE = 'A capa é um <svg viewBox="0 0 1200 630"> de verdade (1200x630), o mesmo SVG que o gerador rasteriza com sharp no build. Cor da marca e semente derivam de hashSlug(post.slug) + semente, nunca de Math.random(), para o cache do card social não estragar a cada build.'

const dosDecisionContext = computed(
  () => `${SVG_NOTE} Título ${dosContrast.value.toFixed(2)}:1 sobre #000000 (${grade(dosContrast.value)}).`,
)

const bleedDecisionContext = computed(
  () =>
    `${SVG_NOTE} Título ${bleedContrast.value.toFixed(2)}:1 sobre ${brand.value.hex} (${grade(bleedContrast.value)}).`,
)

const meshDecisionContext = computed(
  () =>
    `${SVG_NOTE} Título ${meshContrast.value.toFixed(2)}:1 sobre ${MESH_BG} no melhor caso (${grade(meshContrast.value)}); pior caso real ${meshWorstContrast.value.toFixed(2)}:1 sobre ${brand.value.hex} (${grade(meshWorstContrast.value)}), porque tanto o plasma saturado quanto o traço do wireframe convergem pra cor da marca; por isso o título carrega uma sombra rígida de ${SHADOW_OFFSET}px.`,
)
</script>

<template>
  <div :class="$style.demo">
    <Panel label="candidato">
      <Pick
        v-model="view"
        label="ver"
        :options="[
          { id: 'todos', name: 'os três empilhados' },
          { id: 'dos', name: '1 · janela DOS' },
          { id: 'bleed', name: '2 · sem moldura' },
          { id: 'plasma', name: '3 · plasma + wireframe' },
        ]"
      />
    </Panel>

    <Panel label="conteúdo do cartão">
      <Knob v-model="seed" label="semente" :min="0" :max="200" />
      <Pick v-model="titleSize" label="comprimento do título" :options="TITLE_SIZE_OPTIONS" />
      <Pick v-model="category" label="categoria" :options="CATEGORIES" />
      <Knob v-model="cellSize" label="célula do plasma" :min="16" :max="48" :step="2" unit="px" />
      <Toggle v-model="cursor" label="cursor sólido █" />
    </Panel>

    <Panel label="candidato 3 · plasma + wireframe">
      <Knob v-model="plasmaStrength" label="força do plasma" :min="0" :max="100" :step="5" unit="%" />
      <Pick v-model="solidPick" label="sólido do wireframe" :options="SOLID_OPTIONS" />
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
        <p :class="$style.label">Candidato 3 · plasma + wireframe</p>
        <div :class="$style.stage">
          <svg
            viewBox="0 0 1200 630"
            :class="$style.svgRoot"
            role="img"
            :aria-label="`Capa candidata, plasma e wireframe, categoria ${category}`"
          >
            <rect width="1200" height="630" :fill="MESH_BG" />
            <g :opacity="plasmaStrength / 100">
              <rect v-for="(c, i) in meshPlasmaCells" :key="i" :x="c.x" :y="c.y" :width="cellSize" :height="cellSize" :fill="c.fill" />
            </g>
            <text
              v-for="(c, i) in wireCells"
              :key="i"
              :x="c.x"
              :y="c.y"
              text-anchor="middle"
              dominant-baseline="central"
              :font-family="LABEL_FONT"
              :font-size="wireDensity"
              :fill="brand.hex"
              opacity="0.85"
            >+</text>

            <rect v-bind="outerFrame" fill="none" :stroke="brand.hex" :stroke-width="BORDER_STROKE" />
            <rect v-bind="innerFrame" fill="none" :stroke="brand.hex" stroke-width="3" />

            <text
              :x="dosCard.padX + SHADOW_OFFSET"
              :y="dosCard.kickerY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="MESH_SHADOW"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`s${i}`"
              :x="dosCard.padX + SHADOW_OFFSET"
              :y="dosCard.titleYs[i] + SHADOW_OFFSET"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="MESH_SHADOW"
            >{{ line }}</text>
            <text
              :x="dosCard.padX + SHADOW_OFFSET"
              :y="dosCard.bylineY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="MESH_SHADOW"
            >{{ bylineText }}</text>

            <text
              :x="dosCard.padX"
              :y="dosCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="MESH_INK"
              opacity="0.92"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in dosCard.lines"
              :key="`m${i}`"
              :x="dosCard.padX"
              :y="dosCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="dosCard.fontSize"
              :fill="MESH_INK"
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
          título {{ meshContrast.toFixed(2) }}:1 sobre {{ MESH_BG }} no melhor caso ({{ grade(meshContrast) }}) ·
          pior caso real {{ meshWorstContrast.toFixed(2) }}:1 sobre {{ brand.hex }} ({{ grade(meshWorstContrast) }}),
          onde o plasma satura e o traço do wireframe convergem pra mesma cor
        </p>
        <DecisionCopy
          lab="capa · plasma + wireframe"
          component="CoverLab.vue"
          :settings="meshDecisionSettings"
          :context="meshDecisionContext"
        />
      </div>
    </div>

    <p :class="$style.readout">
      Os três contrastes de título, sempre pelo texto real: janela DOS {{ dosContrast.toFixed(2) }}:1 sobre preto
      ({{ grade(dosContrast) }}), sem moldura {{ bleedContrast.toFixed(2) }}:1 sobre {{ brand.hex }}
      ({{ grade(bleedContrast) }}), plasma + wireframe {{ meshContrast.toFixed(2) }}:1 sobre o preto de base
      ({{ grade(meshContrast) }}) no melhor caso e {{ meshWorstContrast.toFixed(2) }}:1 ({{ grade(meshWorstContrast) }})
      no pior, quando o campo satura ou o wireframe cobre a letra na cor da marca. Os dois primeiros usam cor sólida
      atrás do texto, então o número já é o número real da capa; o terceiro varia entre esses dois extremos, e é por
      isso que o título carrega uma
      sombra rígida de {{ SHADOW_OFFSET }}px em vez de confiar só na cor de fundo.
    </p>
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.grid {
  display: grid;
  gap: 1.6rem;
  margin-block-start: 1rem;
}

.candidate {
  display: grid;
  gap: 0.5rem;
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
