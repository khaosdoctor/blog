<script setup lang="ts">
/**
 * Candidato 2 do laboratório de capas OG/social: "sem moldura", o fundo
 * inteiro na cor da marca, sem a janela DOS por cima. Perdeu a decisão para
 * os candidatos 1, 4, 5 e 6 (ver content/blog/theme-lab/components/CoverLab.vue)
 * e mora aqui congelado, com os mesmos controles que tinha quando estava na
 * bancada viva.
 *
 * Determinismo: nada aqui chama `Math.random()`. Cor da marca e semente vêm
 * de um inteiro (o "seed"); no gerador real esse inteiro é
 * `hashSlug(post.slug)`, aqui o knob "semente" soma-se ao hash do slug de
 * exemplo.
 */
import { computed, ref } from 'vue'
import DecisionCopy from '../../theme-lab/components/DecisionCopy.vue'
import Knob from '../../theme-lab/components/Knob.vue'
import Panel from '../../theme-lab/components/Panel.vue'
import Pick from '../../theme-lab/components/Pick.vue'
import Toggle from '../../theme-lab/components/Toggle.vue'
import { grade, parseHex, ratio } from '../../theme-lab/components/contrast'
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

const bleedCard = computed(() => buildCard(90, 110))

const bleedContrast = computed(() => ratio(parseHex(bleedInk.value), parseHex(brand.value.hex)))

// Preto puro se ele ler melhor do que a tinta do candidato contra o fundo da
// marca, tinta caso contrário. Decidido pela razão de contraste, não por uma
// lista de nomes de paleta, então uma marca nova cai no lado certo sozinha.
const bleedRuleColour = computed(() => {
  const onBlack = ratio(parseHex('#000000'), parseHex(brand.value.hex))
  const onInk = ratio(parseHex(bleedInk.value), parseHex(brand.value.hex))
  return onBlack >= onInk ? '#000000' : bleedInk.value
})

const decisionSettings = computed(() => [
  { label: 'categoria', value: category.value },
  { label: 'comprimento do título', value: labelFor(TITLE_SIZE_OPTIONS, titleSize.value) },
  { label: 'cor da marca', value: `${brand.value.id} (${brand.value.hex})` },
  { label: 'cursor sólido █', value: cursor.value ? 'sim' : 'não' },
  { label: 'semente', value: String(seed.value) },
])

const SVG_NOTE = 'A capa é um <svg viewBox="0 0 1200 630"> de verdade (1200x630), o mesmo SVG que o gerador rasteriza com sharp no build. Cor da marca e semente derivam de hashSlug(post.slug) + semente, nunca de Math.random(), para o cache do card social não estragar a cada build.'

const decisionContext = computed(
  () =>
    `${SVG_NOTE} Título ${bleedContrast.value.toFixed(2)}:1 sobre ${brand.value.hex} (${grade(bleedContrast.value)}).`,
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
      component="CoverBleedLab.vue"
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
