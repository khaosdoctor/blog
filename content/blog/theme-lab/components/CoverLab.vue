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
const plasmaCard = computed(() => buildCard(90, 110))

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

const PLASMA_BG = '#0b0c0f'
const PLASMA_INK = '#f5f4f0'
const PLASMA_SHADOW = '#050505'
const SHADOW_OFFSET = 3

const plasmaCells = computed(() => {
  const size = cellSize.value
  const cols = Math.ceil(CARD_W / size)
  const rows = Math.ceil(CARD_H / size)
  const brandRgb = parseHex(brand.value.hex)
  const bgRgb = parseHex(PLASMA_BG)
  const phase = (effectiveSeed.value % 100) * 0.31
  const cells: Array<{ x: number; y: number; fill: string }> = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wave =
        (Math.sin(col * 0.15 + phase) +
          Math.sin(row * 0.22 - phase * 0.6) +
          Math.sin((col + row) * 0.1 + phase * 1.4)) /
          6 +
        0.5
      const value = Math.max(0, Math.min(1, wave))
      cells.push({ x: col * size, y: row * size, fill: toHex(composite(brandRgb, bgRgb, value)) })
    }
  }
  return cells
})

const dosContrast = computed(() => ratio(parseHex('#e6e4e0'), parseHex('#000000')))
const bleedContrast = computed(() => ratio(parseHex(bleedInk.value), parseHex(brand.value.hex)))
const plasmaContrast = computed(() => ratio(parseHex(PLASMA_INK), parseHex(PLASMA_BG)))
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
          { id: 'plasma', name: '3 · plasma' },
        ]"
      />
    </Panel>

    <Panel label="conteúdo do cartão">
      <Knob v-model="seed" label="semente" :min="0" :max="200" />
      <Pick
        v-model="titleSize"
        label="comprimento do título"
        :options="[
          { id: 'curto', name: '23 caracteres' },
          { id: 'medio', name: '58 caracteres' },
          { id: 'longo', name: '90 caracteres' },
        ]"
      />
      <Pick v-model="category" label="categoria" :options="CATEGORIES" />
      <Knob v-model="cellSize" label="célula do plasma" :min="16" :max="48" :step="2" unit="px" />
      <Toggle v-model="cursor" label="cursor sólido █" />
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
              :x1="bleedCard.padX"
              :y1="bleedCard.ruleY"
              :x2="bleedCard.padX + CARD_W * 0.75"
              :y2="bleedCard.ruleY"
              :stroke="bleedInk"
              stroke-width="2"
              opacity="0.5"
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
            <rect width="1200" height="630" :fill="PLASMA_BG" />
            <rect v-for="(c, i) in plasmaCells" :key="i" :x="c.x" :y="c.y" :width="cellSize" :height="cellSize" :fill="c.fill" />

            <text
              :x="plasmaCard.padX + SHADOW_OFFSET"
              :y="plasmaCard.kickerY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="PLASMA_SHADOW"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in plasmaCard.lines"
              :key="`s${i}`"
              :x="plasmaCard.padX + SHADOW_OFFSET"
              :y="plasmaCard.titleYs[i] + SHADOW_OFFSET"
              :font-family="TITLE_FONT"
              :font-size="plasmaCard.fontSize"
              :fill="PLASMA_SHADOW"
            >{{ line }}</text>
            <text
              :x="plasmaCard.padX + SHADOW_OFFSET"
              :y="plasmaCard.bylineY + SHADOW_OFFSET"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="PLASMA_SHADOW"
            >{{ bylineText }}</text>

            <text
              :x="plasmaCard.padX"
              :y="plasmaCard.kickerY"
              :font-family="LABEL_FONT"
              :font-size="KICKER_SIZE"
              letter-spacing="4"
              :fill="PLASMA_INK"
              opacity="0.92"
            >{{ kickerText }}</text>
            <text
              v-for="(line, i) in plasmaCard.lines"
              :key="`m${i}`"
              :x="plasmaCard.padX"
              :y="plasmaCard.titleYs[i]"
              :font-family="TITLE_FONT"
              :font-size="plasmaCard.fontSize"
              :fill="PLASMA_INK"
            >{{ line }}</text>
            <text
              :x="plasmaCard.padX"
              :y="plasmaCard.bylineY"
              :font-family="LABEL_FONT"
              :font-size="BYLINE_SIZE"
              letter-spacing="2"
              :fill="PLASMA_INK"
              opacity="0.92"
            >{{ bylineText }}</text>
          </svg>
        </div>
        <p :class="$style.tiny">
          título {{ plasmaContrast.toFixed(2) }}:1 sobre {{ PLASMA_BG }} · {{ grade(plasmaContrast) }} · pior caso, a
          sombra rígida some com o resto
        </p>
      </div>
    </div>

    <p :class="$style.readout">
      Os três contrastes de título, sempre pelo texto real: janela DOS {{ dosContrast.toFixed(2) }}:1 sobre preto
      ({{ grade(dosContrast) }}), sem moldura {{ bleedContrast.toFixed(2) }}:1 sobre {{ brand.hex }}
      ({{ grade(bleedContrast) }}), plasma {{ plasmaContrast.toFixed(2) }}:1 sobre o fundo escuro de base
      ({{ grade(plasmaContrast) }}). Os dois primeiros usam cor sólida atrás do texto, então o número já é o número
      real da capa; o do plasma é o pior caso, porque o campo por baixo varia, e é por isso que o título carrega uma
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
