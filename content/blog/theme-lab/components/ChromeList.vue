<script setup lang="ts">
/**
 * A lista de posts, que é a página mais visitada do site depois dos posts em si.
 * Quatro leituras, do mais denso ao mais decorado.
 */
import { computed, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const POSTS = [
  { date: '2026 AGO 12', title: 'Quando a abstração vaza', tag: 'opinion', read: '9 min' },
  { date: '2026 JUL 30', title: 'error.cause, e por que ninguém usa', tag: 'javascript', read: '6 min' },
  { date: '2026 JUL 02', title: 'Um servidor gRPC em Node do zero', tag: 'infra', read: '21 min' },
  { date: '2026 JUN 18', title: 'O que eu aprendi mantendo um blog por seis anos', tag: 'meta', read: '12 min' },
]

const STACKS: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  dotgothic: "'DotGothic16', sans-serif",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
  vt323: "'VT323', ui-monospace, monospace",
}

const BG = '#14161a'
const INK = '#e6e4e0'
const MUTED = '#9a9ea6'
const ACCENT = '#45b384'

const SHAPE_OPTIONS = [
  { id: 'tabela', name: 'tabela densa, 4 colunas' },
  { id: 'razao', name: 'razão com pontilhado' },
  { id: 'menu', name: 'menu de Game Boy ▸' },
  { id: 'cartoes', name: 'cartões com aresta grossa' },
]

const LEADER_OPTIONS = [
  { id: '·', name: '· ponto médio' },
  { id: '.', name: '. ponto' },
  { id: '─', name: '─ traço de caixa' },
  { id: '╌', name: '╌ tracejado' },
  { id: ' ', name: 'nenhum' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const shape = ref('razao')
const face = ref('departure')
const leader = ref('·')
const rows = ref(14)
const tracking = ref(2)
const showTag = ref(true)
const selected = ref(0)

const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  color: INK,
}))

const rowStyle = computed(() => ({ paddingBlock: `${rows.value / 20}rem` }))

const decisionSettings = computed(() => [
  { label: 'candidato', value: labelFor(SHAPE_OPTIONS, shape.value) },
  { label: 'fonte', value: face.value },
  { label: 'pontilhado', value: labelFor(LEADER_OPTIONS, leader.value) },
  { label: 'altura da linha', value: String(rows.value) },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'mostrar seção', value: showTag.value ? 'sim' : 'não' },
])

const decisionContext = computed(
  () => `Título ${inkContrast.value}:1 · data e seção ${mutedContrast.value}:1 sobre ${BG}.`,
)
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: BG, ...base }">
      <ol v-if="shape === 'tabela'" :class="$style.tabela">
        <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
          <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span v-if="showTag" :class="$style.tag" :style="{ color: ACCENT }">{{ post.tag }}</span>
          <span :class="$style.read" :style="{ color: MUTED }">{{ post.read }}</span>
        </li>
      </ol>

      <ol v-else-if="shape === 'razao'" :class="$style.razao">
        <li v-for="(post, index) in POSTS" :key="post.title" :style="rowStyle">
          <span :class="$style.num" :style="{ color: MUTED }">{{ String(index).padStart(2, '0') }}</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span :class="$style.dots" :style="{ color: MUTED }" aria-hidden="true">{{ leader.repeat(60) }}</span>
          <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
        </li>
      </ol>

      <ol v-else-if="shape === 'menu'" :class="$style.menu">
        <li
          v-for="(post, index) in POSTS"
          :key="post.title"
          :style="rowStyle"
          :class="{ [$style.on]: index === selected }"
          @mouseenter="selected = index"
        >
          <span :class="$style.pointer" :style="{ color: index === selected ? ACCENT : 'transparent' }">▸</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span v-if="showTag" :class="$style.tag" :style="{ color: MUTED }">{{ post.tag }}</span>
        </li>
      </ol>

      <ol v-else :class="$style.cartoes">
        <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
          <p :class="$style.meta" :style="{ color: MUTED }">
            {{ post.date }} <template v-if="showTag">· {{ post.tag }}</template> · {{ post.read }}
          </p>
          <p :class="$style.title">{{ post.title }}</p>
        </li>
      </ol>
    </div>

    <Panel label="lista">
      <Pick v-model="shape" label="candidato" :options="SHAPE_OPTIONS" />
      <Pick v-model="face" label="fonte" :options="Object.keys(STACKS).map((id) => ({ id, name: id }))" />
      <Pick v-model="leader" label="pontilhado" :options="LEADER_OPTIONS" />
      <Knob v-model="rows" label="altura da linha" :min="6" :max="40" />
      <Knob v-model="tracking" label="entreletra" :min="-2" :max="20" unit="/100em" />
      <Toggle v-model="showTag" label="mostrar seção" />
    </Panel>

    <p :class="$style.readout">
      título {{ inkContrast }}:1 · data e seção {{ mutedContrast }}:1 sobre {{ BG }}. A "razão" é a única que
      aguenta cem posts sem virar um muro, porque o olho corre pela coluna de títulos e o pontilhado leva até a
      data só quando o leitor procura por ela. O menu de Game Boy é o mais bonito e o que menos escala.
    </p>

    <DecisionCopy
      lab="lista de posts"
      component="ChromeList.vue"
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
  padding: clamp(1rem, 4%, 1.6rem);
  font-size: 0.85rem;
  overflow-x: auto;
}

.stage ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.stage li {
  cursor: pointer;
}

.tabela li {
  display: grid;
  grid-template-columns: 7rem 1fr auto auto;
  gap: 1rem;
  align-items: baseline;
  border-block-end: 1px dashed #ffffff1f;
}

.razao li {
  display: flex;
  gap: 0.7rem;
  align-items: baseline;
  overflow: hidden;
  white-space: nowrap;
}

.razao .dots {
  flex: 1;
  overflow: hidden;
}

.razao .num {
  font-variant-numeric: tabular-nums;
}

.menu li {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  padding-inline: 0.5rem;
}

.menu li.on {
  background: #ffffff0f;
}

.pointer {
  inline-size: 1em;
}

.menu .tag {
  margin-inline-start: auto;
  font-size: 0.72rem;
}

.cartoes {
  display: grid;
  gap: 0.7rem;
}

.cartoes li {
  padding: 0.7rem 0.9rem;
  border: 3px double #ffffff33;
  border-inline-start: 8px solid #ffffff33;
}

.cartoes li:hover {
  border-inline-start-color: #45b384;
}

.cartoes p {
  margin: 0;
}

.cartoes .meta {
  margin-block-end: 0.3rem;
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.title:hover {
  text-decoration: underline;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
