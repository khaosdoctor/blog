<script setup lang="ts">
/**
 * O cabeçalho, em cinco leituras da mesma direção. Todos usam só caracteres:
 * nenhuma imagem, nenhum ícone, nada que precise de requisição.
 */
import { computed, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import { labelForMark, MARK_CANDIDATES, type MarkCandidateId } from './logoMarks'
import LogoMark from './LogoMark.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const STACKS: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  silkscreen: "'Silkscreen', sans-serif",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
  vt323: "'VT323', ui-monospace, monospace",
}

const ACCENTS: Record<string, string> = {
  verde: '#45b384',
  amarelo: '#f5b200',
  azul: '#7cc0ff',
  fosforo: '#20c20e',
}

const BG = '#14161a'
const INK = '#e6e4e0'
const MUTED = '#9a9ea6'

const NAV = ['posts', 'séries', 'tags', 'busca', 'sobre']

const SHAPE_OPTIONS = [
  { id: 'barra', name: 'barra de caixa ┌─┐' },
  { id: 'dos', name: 'linha de DOS invertida' },
  { id: 'minimo', name: 'mínimo, só uma régua' },
  { id: 'menu', name: 'menu de Game Boy ▸' },
  { id: 'ledger', name: 'razão, SEÇÃO 00 / ÍNDICE' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

/**
 * A marca de verdade, escolhida na Seção 03 (`LogoLab.vue`), agora aparece
 * dentro de cada leitura de cabeçalho: julgar um cabeçalho sem a marca dentro
 * dele era julgar metade da decisão. As duas bancadas leem a mesma lista de
 * candidatos de `logoMarks.ts`, então trocar aqui e trocar lá são a mesma
 * escolha vista de dois ângulos.
 */
const markCandidate = ref<MarkCandidateId>('fio')

const shape = ref('barra')
const face = ref('departure')
const accent = ref('verde')
const tracking = ref(8)
const density = ref(10)
const caps = ref(true)

const accentHex = computed(() => ACCENTS[accent.value])
const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))
const accentContrast = computed(() => ratio(parseHex(accentHex.value), parseHex(BG)).toFixed(2))

const decisionSettings = computed(() => [
  { label: 'candidato', value: labelFor(SHAPE_OPTIONS, shape.value) },
  { label: 'marca', value: labelForMark(markCandidate.value) },
  { label: 'fonte', value: face.value },
  { label: 'destaque', value: `${accent.value} (${accentHex.value})` },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'respiro', value: String(density.value) },
  { label: 'caixa alta', value: caps.value ? 'sim' : 'não' },
])

const decisionContext = computed(
  () =>
    `Texto ${inkContrast.value}:1 · secundário ${mutedContrast.value}:1 · destaque ${accentContrast.value}:1 sobre ${BG}.`,
)

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  textTransform: caps.value ? ('uppercase' as const) : ('none' as const),
  padding: `${density.value / 10}rem ${density.value / 6}rem`,
  color: INK,
}))
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: BG }">
      <header v-if="shape === 'barra'" :class="$style.bar" :style="base">
        <span :class="$style.edge" :style="{ color: MUTED }">┌─</span>
        <span :class="$style.markSlot"><LogoMark :candidate="markCandidate" size="1em" /></span>
        <span :class="$style.brand" :style="{ color: accentHex }">lsantos.dev</span>
        <span :class="$style.fill" :style="{ color: MUTED }">─────────────</span>
        <nav>
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
        <span :class="$style.edge" :style="{ color: MUTED }">─┐</span>
      </header>

      <header v-else-if="shape === 'dos'" :class="$style.dos" :style="base">
        <span :class="$style.badge" :style="{ background: accentHex, color: BG }">C:\BLOG&gt;</span>
        <span :class="$style.markSlot"><LogoMark :candidate="markCandidate" size="1em" /></span>
        <span :class="$style.cursor" :style="{ background: INK }"></span>
        <nav :class="$style.right">
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
      </header>

      <header v-else-if="shape === 'minimo'" :class="$style.minimo" :style="base">
        <span :class="$style.markSlot"><LogoMark :candidate="markCandidate" size="1em" /></span>
        <span :class="$style.brand" :style="{ color: accentHex }">lsantos.dev</span>
        <nav :class="$style.right">
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
      </header>

      <header v-else-if="shape === 'menu'" :class="$style.menu" :style="base">
        <div :class="$style.frame" :style="{ borderColor: MUTED }">
          <span :class="$style.brandRow">
            <span :class="$style.markSlot"><LogoMark :candidate="markCandidate" size="1em" /></span>
            <span :class="$style.brand" :style="{ color: accentHex }">lsantos.dev</span>
          </span>
          <nav>
            <span v-for="(item, index) in NAV" :key="item" :class="[$style.item, $style.row]">
              <span :class="$style.pointer" :style="{ color: index === 0 ? accentHex : 'transparent' }">▸</span>{{ item }}
            </span>
          </nav>
        </div>
      </header>

      <header v-else :class="$style.ledger" :style="base">
        <p :class="$style.line" :style="{ color: MUTED }">seção 00 / índice · v0.0.1+42 · 449 páginas</p>
        <p :class="$style.brandline">
          <span :class="$style.markSlot"><LogoMark :candidate="markCandidate" size="1em" /></span>
          <span :style="{ color: accentHex }">lsantos.dev</span>
          <span :style="{ color: MUTED }"> ······································ </span>
          <span>{{ NAV.join(' · ') }}</span>
        </p>
      </header>
    </div>

    <Panel label="cabeçalho">
      <Pick v-model="shape" label="candidato" :options="SHAPE_OPTIONS" />
      <Pick v-model="markCandidate" label="marca" :options="MARK_CANDIDATES.map((c) => ({ id: c.id, name: c.name }))" />
      <Pick
        v-model="face"
        label="fonte"
        :options="Object.keys(STACKS).map((id) => ({ id, name: id }))"
      />
      <Pick
        v-model="accent"
        label="destaque"
        :options="Object.keys(ACCENTS).map((id) => ({ id, name: id }))"
      />
      <Knob v-model="tracking" label="entreletra" :min="0" :max="30" unit="/100em" />
      <Knob v-model="density" label="respiro" :min="4" :max="30" />
      <Toggle v-model="caps" label="caixa alta" />
    </Panel>

    <p :class="$style.readout">
      texto {{ inkContrast }}:1 · secundário {{ mutedContrast }}:1 · destaque {{ accentContrast }}:1 sobre
      {{ BG }}. A entreletra é o que separa "terminal" de "costume": acima de 0,2em o cabeçalho vira fantasia e a
      leitura fica lenta.
    </p>

    <DecisionCopy
      lab="cabeçalho"
      component="ChromeHeader.vue"
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
  padding: 1.4rem 1rem;
  overflow-x: auto;
}

.stage header {
  font-size: 0.78rem;
}

.stage nav {
  display: inline-flex;
  gap: 0.9rem;
}

.markSlot {
  display: inline-flex;
  align-items: center;
  margin-inline-end: 0.5rem;
}

.brandRow {
  display: inline-flex;
  align-items: center;
}

.item {
  cursor: pointer;
}

.item:hover {
  text-decoration: underline;
}

.bar {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  white-space: nowrap;
}

.fill {
  flex: 1;
  overflow: hidden;
}

.dos {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.badge {
  padding: 0.15rem 0.4rem;
  font-weight: 700;
}

.cursor {
  inline-size: 0.5em;
  block-size: 1em;
  animation: blink 1.06s steps(2, end) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cursor {
    animation: none;
  }
}

.right {
  margin-inline-start: auto;
}

.minimo {
  display: flex;
  align-items: baseline;
  border-block-end: 1px dotted currentColor;
}

.menu .frame {
  display: inline-grid;
  gap: 0.4rem;
  padding: 0.7rem 1.1rem 0.7rem 0.7rem;
  border: 3px double;
}

.row {
  display: block;
}

.pointer {
  display: inline-block;
  inline-size: 1.2em;
}

.ledger .line {
  margin: 0 0 0.4rem;
  font-size: 0.62rem;
}

.brandline {
  margin: 0;
  white-space: nowrap;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
