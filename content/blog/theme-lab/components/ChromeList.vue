<script setup lang="ts">
/**
 * A lista de posts decidida: a tabela densa de quatro colunas (data, título,
 * seção, tempo de leitura), a página mais visitada do site depois dos posts
 * em si.
 *
 * Sete leituras disputaram esta lista; as outras seis (razão com pontilhado,
 * menu de Game Boy, cartões com aresta grossa, grade com capa em proporção
 * nativa, lista com miniatura quadrada, densidade que o leitor escolhe)
 * moraram aqui e agora estão em
 * `content/blog/theme-lab-arquivo/components/RetiredChromeListShapes.vue`,
 * funcionando, com o motivo de cada uma. O tamanho de miniatura e a densidade
 * cartões/lista eram exclusivos das leituras com capa e foram junto: a
 * tabela não desenha imagem nenhuma.
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

// Os valores de partida são a decisão, não um palpite: é o que a bancada mostra ao abrir.
const face = ref('departure')
const leader = ref('─')
const rows = ref(13)
const tracking = ref(-1)
const showTag = ref(true)

const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  color: INK,
}))

const rowStyle = computed(() => ({ paddingBlock: `${rows.value / 20}rem` }))

// O traço entre linhas segue o caractere escolhido no pontilhado, em vez de uma borda pontilhada
// fixa: a decisão foi "─ traço de caixa", a mesma família de caractere do cabeçalho decidido
// (a barra ┌─┐), então a régua da tabela fala a mesma língua visual em vez de inventar a própria.
const rowLeaderStyle = computed<'none' | 'dotted' | 'dashed' | 'solid'>(() => {
  if (leader.value === ' ') return 'none'
  if (leader.value === '─') return 'solid'
  if (leader.value === '╌') return 'dashed'
  return 'dotted'
})

const decisionSettings = computed(() => [
  { label: 'candidato', value: 'tabela densa, 4 colunas (decidido, as outras seis leituras estão em theme-lab-arquivo)' },
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
      <ol :class="$style.tabela">
        <li v-for="post in POSTS" :key="post.title" :style="{ ...rowStyle, borderBlockEndStyle: rowLeaderStyle }">
          <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span v-if="showTag" :class="$style.tag" :style="{ color: ACCENT }">{{ post.tag }}</span>
          <span :class="$style.read" :style="{ color: MUTED }">{{ post.read }}</span>
        </li>
      </ol>
    </div>

    <Panel label="lista">
      <Pick v-model="face" label="fonte" :options="Object.keys(STACKS).map((id) => ({ id, name: id }))" />
      <Pick v-model="leader" label="pontilhado" :options="LEADER_OPTIONS" />
      <Knob v-model="rows" label="altura da linha" :min="6" :max="40" />
      <Knob v-model="tracking" label="entreletra" :min="-2" :max="20" unit="/100em" />
      <Toggle v-model="showTag" label="mostrar seção" />
    </Panel>

    <p :class="$style.readout">
      título {{ inkContrast }}:1 · data e seção {{ mutedContrast }}:1 sobre {{ BG }}. A tabela densa venceu por ser
      a única leitura que aguenta cem posts sem custar altura: data, título, seção e tempo de leitura cabem numa
      linha só, e nenhuma delas depende de uma imagem para o olho decodificar antes do texto. As outras seis
      leituras, incluindo as duas com miniatura de capa, estão arquivadas com o motivo de cada uma.
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
  cursor: default;
}

.tabela li {
  display: grid;
  grid-template-columns: 7rem 1fr auto auto;
  align-items: baseline;
  border-block-end-width: 1px;
  border-block-end-color: #ffffff1f;
}

.tabela li > * + * {
  margin-inline-start: 1rem;
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
