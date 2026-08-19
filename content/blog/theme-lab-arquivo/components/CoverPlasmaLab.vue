<script setup lang="ts">
/**
 * Candidato 3 do laboratório de capas OG/social: "plasma", um campo de três
 * senos por trás do título, sem wireframe nem janela DOS. Perdeu a decisão
 * para os candidatos 1, 4, 5 e 6 (ver
 * content/blog/theme-lab/components/CoverLab.vue) e mora aqui congelado, com
 * os mesmos controles que tinha quando estava na bancada viva. O gerador de
 * campo (`generateWaveParams`/`waveField`) continua vivo lá também: o
 * candidato 6 (ondas) ainda o usa, quantizado.
 *
 * Determinismo: nada aqui chama `Math.random()`. Cor da marca, semente e
 * campo vêm todos de um inteiro (o "seed"). No gerador real esse inteiro é
 * `hashSlug(post.slug)`; aqui o knob "semente" soma-se ao hash do slug de
 * exemplo.
 */
import { computed, ref } from 'vue'
import DecisionCopy from '../../theme-lab/components/DecisionCopy.vue'
import Knob from '../../theme-lab/components/Knob.vue'
import Panel from '../../theme-lab/components/Panel.vue'
import Pick from '../../theme-lab/components/Pick.vue'
import Toggle from '../../theme-lab/components/Toggle.vue'
import { composite, grade, parseHex, ratio, toHex } from '../../theme-lab/components/contrast'
import '../../theme-lab/components/fonts.css'

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
 * [0, 1), sempre na mesma sequência para a mesma semente.
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
 * Três senos, cada frequência e cada fase vindas de uma chamada separada do
 * PRNG, e o par (col, row) girado por um ângulo de direção antes de entrar
 * nos senos. É o oposto do que quebrou a primeira tentativa deste candidato:
 * lá, uma fase só era escalada por três constantes fixas e as três
 * frequências cresciam juntas, então o campo inteiro colapsava numa única
 * rampa. Aqui as sete leituras do PRNG (três frequências, três fases, a
 * direção, os tons) não têm relação linear entre si, então o campo forma
 * vários focos de claro e escuro em vez de uma rampa.
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
const titleSize = ref('curto')
const category = ref('meta')
const cellSize = ref(28)
const cursor = ref(true)
const plasmaStrength = ref(55)

const effectiveSeed = computed(() => (hashSlug(DEMO_SLUG) + seed.value) >>> 0)
const brand = computed(() => BRANDS[effectiveSeed.value % BRANDS.length])

// Semente derivada por XOR com uma constante própria, para o campo não
// desenhar sempre o mesmo padrão relativo ao sólido/fogo/ondas do resto do
// laboratório para o mesmo post.
const PLASMA_SALT = 0x1000193
const plasmaWave = computed(() => generateWaveParams(mulberry32((effectiveSeed.value ^ PLASMA_SALT) >>> 0)))

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

const plasmaCard = computed(() => buildCard(90, 110))

const DARK_BG = '#000000'
const DARK_SHADOW = '#050505'
const SHADOW_OFFSET = 3
const INK_FLOOR = 4.5

/**
 * A cor da marca crua não é garantida legível como texto: ela foi escolhida
 * para outra coisa (uma barra, um traço, um fundo cheio), não para ficar em
 * cima de um efeito escuro. `--chip-ink` e o preenchimento do hover dos links
 * já resolvem esse mesmo problema misturando a cor da marca em direção ao
 * branco até um piso de contraste; esta função faz a mesma conta para o
 * cartão, contra as duas pontas que o texto de fato encontra aqui: o preto
 * puro (quando o campo por baixo está no mínimo) e a própria cor da marca
 * saturada (quando o campo bate no máximo). Verde e amarelo não fecham
 * 4.5:1 nem no branco puro contra a própria versão saturada deles, porque a
 * marca já nasce clara demais para qualquer tinta bater as duas pontas ao
 * mesmo tempo; o laço para em t=1 e o número que sobra é reportado, não
 * escondido.
 */
function deriveCardInk(brandHex: string, groundHex: string, floor: number): string {
  const brandRgb = parseHex(brandHex)
  const groundRgb = parseHex(groundHex)
  const whiteRgb = parseHex('#ffffff')
  let t = 0
  let mixed = brandRgb
  while (t < 1) {
    const vsGround = ratio(mixed, groundRgb)
    const vsBrand = ratio(mixed, brandRgb)
    if (Math.min(vsGround, vsBrand) >= floor) break
    t += 0.02
    mixed = composite(whiteRgb, brandRgb, t)
  }
  return toHex(mixed)
}

const cardInk = computed(() => deriveCardInk(brand.value.hex, DARK_BG, INK_FLOOR))
const cardInkBestContrast = computed(() => ratio(parseHex(cardInk.value), parseHex(DARK_BG)))
const cardInkWorstContrast = computed(() => ratio(parseHex(cardInk.value), parseHex(brand.value.hex)))

const meshPlasmaCells = computed(() => waveField(plasmaWave.value, brand.value.hex, DARK_BG, cellSize.value, false))

const decisionSettings = computed(() => [
  { label: 'categoria', value: category.value },
  { label: 'comprimento do título', value: labelFor(TITLE_SIZE_OPTIONS, titleSize.value) },
  { label: 'cor da marca', value: `${brand.value.id} (${brand.value.hex})` },
  { label: 'cursor sólido █', value: cursor.value ? 'sim' : 'não' },
  { label: 'semente', value: String(seed.value) },
  { label: 'célula da grade', value: `${cellSize.value}px` },
  { label: 'força do plasma', value: `${plasmaStrength.value}%` },
])

const SVG_NOTE = 'A capa é um <svg viewBox="0 0 1200 630"> de verdade (1200x630), o mesmo SVG que o gerador rasteriza com sharp no build. Cor da marca e semente derivam de hashSlug(post.slug) + semente, nunca de Math.random(), para o cache do card social não estragar a cada build.'

const decisionContext = computed(
  () =>
    `${SVG_NOTE} Candidato único (plasma, sem wireframe empilhado por cima). Tinta do texto derivada da cor da marca: ${cardInk.value}. Título, chapéu e assinatura ${cardInkBestContrast.value.toFixed(2)}:1 sobre ${DARK_BG} no melhor caso (${grade(cardInkBestContrast.value)}); pior caso real ${cardInkWorstContrast.value.toFixed(2)}:1 sobre ${brand.value.hex} (${grade(cardInkWorstContrast.value)}), quando o efeito satura na cor da marca; por isso o título também carrega uma sombra rígida de ${SHADOW_OFFSET}px.`,
)
</script>

<template>
  <div :class="$style.demo">
    <Panel label="conteúdo do cartão">
      <Knob v-model="seed" label="semente" :min="0" :max="200" />
      <Pick v-model="titleSize" label="comprimento do título" :options="TITLE_SIZE_OPTIONS" />
      <Pick v-model="category" label="categoria" :options="CATEGORIES" />
      <Toggle v-model="cursor" label="cursor sólido █" />
    </Panel>

    <Panel label="candidato 3">
      <Knob v-model="cellSize" label="célula da grade" :min="16" :max="48" :step="2" unit="px" />
      <Knob v-model="plasmaStrength" label="força do plasma" :min="0" :max="100" :step="5" unit="%" />
    </Panel>

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
          :fill="cardInk"
        >{{ kickerText }}</text>
        <text
          v-for="(line, i) in plasmaCard.lines"
          :key="`m${i}`"
          :x="plasmaCard.padX"
          :y="plasmaCard.titleYs[i]"
          :font-family="TITLE_FONT"
          :font-size="plasmaCard.fontSize"
          :fill="cardInk"
        >{{ line }}</text>
        <text
          :x="plasmaCard.padX"
          :y="plasmaCard.bylineY"
          :font-family="LABEL_FONT"
          :font-size="BYLINE_SIZE"
          letter-spacing="2"
          :fill="cardInk"
        >{{ bylineText }}</text>
      </svg>
    </div>
    <p :class="$style.tiny">
      tinta do texto {{ cardInk }} · {{ cardInkBestContrast.toFixed(2) }}:1 sobre {{ DARK_BG }} no melhor caso
      ({{ grade(cardInkBestContrast) }}) · pior caso real {{ cardInkWorstContrast.toFixed(2) }}:1 sobre
      {{ brand.hex }} ({{ grade(cardInkWorstContrast) }})
    </p>
    <DecisionCopy
      lab="capa · plasma"
      component="CoverPlasmaLab.vue"
      :settings="decisionSettings"
      :context="decisionContext"
    />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
  display: grid;
}

.demo > * + * {
  margin-block-start: 0.5rem;
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
</style>
