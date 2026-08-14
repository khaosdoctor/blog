<script setup lang="ts">
/**
 * Candidato 4: o mesmo efeito da captura de tela, sem WebGL nenhum.
 *
 * Isto é a comparação honesta com os três candidatos de canvas acima. É DOM e
 * CSS: um título, uma caixa de terminal, um cursor de bloco e um botão entre
 * colchetes. Custa zero de biblioteca, funciona sem JavaScript se o texto for
 * renderizado no servidor, e o `prefers-reduced-motion` aqui é uma linha.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const LINES = [
  'npm create astro@latest',
  'git commit -m "content: mais um"',
  'curl -s blog.lsantos.dev/llms.txt',
  'grep -rn "abstração" content/',
]

const STACKS: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
  sharetech: "'Share Tech Mono', ui-monospace, monospace",
  vt323: "'VT323', ui-monospace, monospace",
  pixelify: "'Pixelify Sans', sans-serif",
}

const ACCENTS: Record<string, string> = {
  verde: '#45b384',
  amarelo: '#f5b200',
  azul: '#7cc0ff',
  vermelho: '#ff6b74',
  periwinkle: '#a8b1ff',
}

const BG = '#14161a'
const SOFT = '#1c1f24'
const INK = '#e6e4e0'
const MUTED = '#9a9ea6'

const face = ref('departure')
const accent = ref('verde')
const tracking = ref(2)
const titleSize = ref(30)
const typing = ref(45)
const glow = ref(0)
const border = ref('simples')
const brackets = ref(true)
const animated = ref(true)

const typed = ref('')
const caret = ref(true)

const accentHex = computed(() => ACCENTS[accent.value])
const accentContrast = computed(() => ratio(parseHex(accentHex.value), parseHex(BG)).toFixed(2))
const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const promptContrast = computed(() => ratio(parseHex(accentHex.value), parseHex(SOFT)).toFixed(2))

const decisionSettings = computed(() => [
  { label: 'fonte', value: labelFor(FACE_OPTIONS, face.value) },
  { label: 'destaque', value: `${labelFor(ACCENT_OPTIONS, accent.value)} (${accentHex.value})` },
  { label: 'corpo do título', value: `${titleSize.value}px` },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'brilho', value: `${glow.value}%` },
  { label: 'borda', value: labelFor(BORDER_OPTIONS, border.value) },
  { label: 'digitação', value: `${typing.value}%` },
  { label: 'colchetes [ ]', value: brackets.value ? 'sim' : 'não' },
  { label: 'animar', value: animated.value ? 'sim' : 'não' },
])

const decisionContext = computed(
  () =>
    `Título ${inkContrast.value}:1 · destaque ${accentContrast.value}:1 sobre ${BG} · prompt ${promptContrast.value}:1 sobre a caixa ${SOFT}.`,
)

const borders: Record<string, string> = {
  simples: `1px solid ${MUTED}44`,
  dupla: `4px double ${MUTED}66`,
  tracejada: `1px dashed ${MUTED}66`,
  nenhuma: '1px solid transparent',
}

const FACE_OPTIONS = [
  { id: 'departure', name: 'Departure Mono' },
  { id: 'ibmvga', name: 'PxPlus IBM VGA' },
  { id: 'plex', name: 'IBM Plex Mono' },
  { id: 'sharetech', name: 'Share Tech Mono' },
  { id: 'vt323', name: 'VT323' },
  { id: 'pixelify', name: 'Pixelify Sans' },
]

const ACCENT_OPTIONS = [
  { id: 'verde', name: 'verde da marca' },
  { id: 'amarelo', name: 'amarelo da marca' },
  { id: 'azul', name: 'azul claro' },
  { id: 'vermelho', name: 'vermelho claro' },
  { id: 'periwinkle', name: 'periwinkle (a referência)' },
]

const BORDER_OPTIONS = [
  { id: 'simples', name: '1px sólida' },
  { id: 'dupla', name: '4px dupla' },
  { id: 'tracejada', name: 'tracejada' },
  { id: 'nenhuma', name: 'nenhuma' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

let timer: ReturnType<typeof setTimeout> | null = null
let blink: ReturnType<typeof setInterval> | null = null

function run(index = 0, at = 0, erasing = false) {
  const line = LINES[index % LINES.length]
  typed.value = line.slice(0, at)
  const pace = Math.max(8, 260 - typing.value * 2.4)

  if (!erasing && at < line.length) timer = setTimeout(() => run(index, at + 1, false), pace)
  else if (!erasing) timer = setTimeout(() => run(index, at, true), 1600)
  else if (at > 0) timer = setTimeout(() => run(index, at - 1, true), pace / 2)
  else timer = setTimeout(() => run(index + 1, 0, false), 220)
}

function start() {
  if (timer) clearTimeout(timer)
  if (blink) clearInterval(blink)
  if (!animated.value) {
    typed.value = LINES[0]
    caret.value = true
    return
  }
  run()
  blink = setInterval(() => (caret.value = !caret.value), 530)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) animated.value = false
  start()
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  if (blink) clearInterval(blink)
})

watch([animated, typing], start)
</script>

<template>
  <div :class="$style.demo">
    <div
      :class="$style.stage"
      :style="{
        background: BG,
        fontFamily: STACKS[face],
        letterSpacing: `${tracking / 100}em`,
      }"
    >
      <p :class="$style.kicker" :style="{ color: MUTED }">SEÇÃO 00 / ÍNDICE</p>
      <p
        :class="$style.title"
        :style="{
          color: INK,
          fontSize: `${titleSize / 16}rem`,
          textShadow: glow ? `0 0 ${glow / 6}em ${accentHex}` : 'none',
        }"
      >
        O que você vai <span :style="{ color: accentHex }">construir</span>?
      </p>

      <div :class="$style.terminal" :style="{ background: SOFT, border: borders[border] }">
        <span :class="$style.prompt" :style="{ color: accentHex, borderInlineEnd: `2px solid ${MUTED}44` }">&gt;_</span>
        <span :class="$style.typed" :style="{ color: INK }"
          >{{ typed }}<span :class="$style.caret" :style="{ background: accentHex, opacity: caret ? 1 : 0 }"></span
        ></span>
      </div>

      <p :class="$style.tagline" :style="{ color: MUTED }">Todo post começa com um arquivo vazio.</p>

      <button :class="$style.cta" type="button" :style="{ color: accentHex, borderColor: `${MUTED}44` }">
        <template v-if="brackets">[ ler o começo ]</template>
        <template v-else>ler o começo</template>
      </button>
    </div>

    <Panel label="tipo e cor">
      <Pick v-model="face" label="fonte" :options="FACE_OPTIONS" />
      <Pick v-model="accent" label="destaque" :options="ACCENT_OPTIONS" />
      <Knob v-model="titleSize" label="corpo do título" :min="18" :max="56" unit="px" />
      <Knob v-model="tracking" label="entreletra" :min="-3" :max="20" unit="/100em" />
      <Knob v-model="glow" label="brilho" :min="0" :max="60" unit="%" />
    </Panel>

    <Panel label="caixa e movimento">
      <Pick v-model="border" label="borda" :options="BORDER_OPTIONS" />
      <Knob v-model="typing" label="digitação" :min="0" :max="100" unit="%" />
      <Toggle v-model="brackets" label="colchetes [ ]" />
      <Toggle v-model="animated" label="animar" />
    </Panel>

    <p :class="$style.readout">
      título {{ inkContrast }}:1 · destaque {{ accentContrast }}:1 sobre {{ BG }} · prompt {{ promptContrast }}:1
      sobre a caixa {{ SOFT }}. O brilho não muda o contraste medido, porque a medida é do núcleo da letra: ele
      espalha luz em volta e engorda o traço, o que ajuda em fonte fina e vira borrão em fonte pixel.
    </p>

    <DecisionCopy
      lab="título em CSS puro"
      component="CssHeading.vue"
      :settings="decisionSettings"
      :context="decisionContext"
    />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.stage {
  padding: clamp(1.2rem, 5%, 2.5rem);
}

.kicker {
  margin: 0 0 1rem;
  font-size: 0.68rem;
  letter-spacing: 0.24em;
}

.title {
  margin: 0 0 1.4rem;
  line-height: 1.15;
  text-wrap: balance;
}

.terminal {
  display: flex;
  gap: 1rem;
  align-items: center;
  max-inline-size: 34rem;
  padding: 0.85rem 1.1rem;
  border-radius: 0;
}

.prompt {
  flex-shrink: 0;
  padding-inline-end: 1rem;
  font-weight: 700;
  line-height: 1;
}

.typed {
  overflow: hidden;
  font-size: 0.9rem;
  white-space: nowrap;
}

.caret {
  display: inline-block;
  inline-size: 0.6em;
  block-size: 1.05em;
  margin-inline-start: 0.1em;
  vertical-align: text-bottom;
}

.tagline {
  margin: 1.3rem 0 0;
  font-size: 0.82rem;
  line-height: 1.7;
}

.cta {
  margin-block-start: 1.3rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid;
  border-radius: 0;
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.cta:hover,
.cta:focus-visible {
  background: #ffffff10;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
