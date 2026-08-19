<script setup lang="ts">
/**
 * As seis leituras de lista de posts que perderam para a tabela densa de
 * quatro colunas, empilhadas, porque a comparação pedia ver as seis ao mesmo
 * tempo, não julgar uma de cada vez (a mesma ideia de
 * `RetiredChromeHeaderShapes.vue`). Os controles abaixo (fonte, pontilhado,
 * altura da linha, entreletra, mostrar seção, tamanho da miniatura) valem
 * para as seis ao mesmo tempo: não sobrou pergunta sobre qual delas vence, só
 * sobre como cada uma teria ficado nas outras escolhas já fechadas.
 *
 * O tamanho da miniatura e o controle cartões/lista do candidato "densidade"
 * são exclusivos de quem desenha capa (grade, miniatura, densidade); a tabela
 * vencedora não usa nenhum dos dois, por isso ficaram aqui e não em
 * `ChromeList.vue`.
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

/**
 * As duas cores vêm de CoverLab.vue: a capa real é um `<svg viewBox="0 0 1200
 * 630">` com a cor da marca tirada de um hash do slug, para o mesmo post
 * sempre bater a mesma capa. Aqui não existe post de verdade nem slug, então o
 * hash cai sobre o título, mas a forma é a mesma de chipColor() em
 * src/lib/taxonomy.ts: soma dos code points, resto pela quantidade de cores,
 * sem tabela de post para cor.
 */
const BRAND_TOKENS = [
  'var(--brand-blue)',
  'var(--brand-green)',
  'var(--brand-yellow)',
  'var(--brand-red)',
  'var(--brand-purple)',
]

// Só para o número de contraste ao vivo abaixo: os tokens acima resolvem para
// isto no tema escuro (src/styles/theme.css), que é o fundo fixo que esta
// bancada já assume. No tema claro o valor real muda e este número não
// acompanha.
const BRAND_DARK_HEX: Record<string, string> = {
  'var(--brand-blue)': '#1480c2',
  'var(--brand-green)': '#45b384',
  'var(--brand-yellow)': '#f5b200',
  'var(--brand-red)': '#e6242f',
  'var(--brand-purple)': '#815bc2',
}

function coverColour(title: string): string {
  let sum = 0
  for (const char of title) sum += char.codePointAt(0) ?? 0
  return BRAND_TOKENS[sum % BRAND_TOKENS.length]
}

// O amarelo dos tokens é claro demais para tinta clara por cima: só ele pede
// a tinta escura da própria bancada (BG).
function inkForCover(token: string): string {
  return token === 'var(--brand-yellow)' ? BG : INK
}

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

const face = ref('departure')
const leader = ref('·')
const rows = ref(14)
const tracking = ref(2)
const showTag = ref(true)
const selected = ref(0)
const thumbSize = ref(96)

// O controle de verdade do candidato "densidade": o leitor troca de cartão
// para lista sem trocar de página. Continua vivo aqui porque a razão de ter
// perdido é a forma cartões/lista em si, não o controle que troca entre elas.
const density = ref<'cards' | 'lista'>('cards')

const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))

const thumbContrast = computed(() =>
  Math.min(
    ...BRAND_TOKENS.map((token) => ratio(parseHex(inkForCover(token)), parseHex(BRAND_DARK_HEX[token]))),
  ),
)

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  color: INK,
}))

const rowStyle = computed(() => ({ paddingBlock: `${rows.value / 20}rem` }))

const REM = 16
const GRADE_CAPTION_H = 44 // duas linhas de legenda (meta + título) mais as duas margens de 0.4rem entre elas
const GRADE_ROW_SPACING = 1.1 * REM // margem entre um cartão da grade e o próximo
const MINIATURA_TEXT_H = 18 // uma linha de título no tamanho de fonte da bancada

const rowsIn900Grade = computed(() => {
  const coverHeight = thumbSize.value * (630 / 1200)
  const padding = (rows.value / 20) * REM * 2
  return Math.floor(900 / (coverHeight + GRADE_CAPTION_H + GRADE_ROW_SPACING + padding))
})

const rowsIn900Miniatura = computed(() => {
  const padding = (rows.value / 20) * REM * 2
  return Math.floor(900 / (Math.max(thumbSize.value, MINIATURA_TEXT_H) + padding))
})

const decisionSettings = computed(() => [
  { label: 'fonte', value: face.value },
  { label: 'pontilhado', value: labelFor(LEADER_OPTIONS, leader.value) },
  { label: 'altura da linha', value: String(rows.value) },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'mostrar seção', value: showTag.value ? 'sim' : 'não' },
  { label: 'tamanho da miniatura', value: `${thumbSize.value}px` },
  { label: 'densidade do candidato "densidade"', value: density.value === 'cards' ? 'cartões' : 'lista' },
])

const decisionContext = computed(
  () =>
    `Título ${inkContrast.value}:1 · data e seção ${mutedContrast.value}:1 sobre ${BG}. Monograma ` +
    `${thumbContrast.value.toFixed(2)}:1 no pior caso entre as cinco cores da miniatura. Com miniatura de ` +
    `${thumbSize.value}px, a grade cabe ${rowsIn900Grade.value} linhas e a lista com miniatura cabe ` +
    `${rowsIn900Miniatura.value} linhas numa janela de 900px. Nenhuma das seis venceu a tabela densa.`,
)
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stack" :style="{ background: BG, ...base }">
      <figure :class="$style.item">
        <ol :class="$style.razao">
          <li v-for="(post, index) in POSTS" :key="post.title" :style="rowStyle">
            <span :class="$style.num" :style="{ color: MUTED }">{{ String(index).padStart(2, '0') }}</span>
            <span :class="$style.title">{{ post.title }}</span>
            <span :class="$style.dots" :style="{ color: MUTED }" aria-hidden="true">{{ leader.repeat(60) }}</span>
            <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
          </li>
        </ol>
        <figcaption :class="$style.name">razão com pontilhado</figcaption>
      </figure>

      <figure :class="$style.item">
        <ol :class="$style.menu">
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
        <figcaption :class="$style.name">menu de Game Boy ▸</figcaption>
      </figure>

      <figure :class="$style.item">
        <ol :class="$style.cartoes">
          <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
            <p :class="$style.meta" :style="{ color: MUTED }">
              {{ post.date }} <template v-if="showTag">· {{ post.tag }}</template> · {{ post.read }}
            </p>
            <p :class="$style.title">{{ post.title }}</p>
          </li>
        </ol>
        <figcaption :class="$style.name">cartões com aresta grossa</figcaption>
      </figure>

      <figure :class="$style.item">
        <ol :class="$style.grade" :style="{ '--capa-largura': `${thumbSize}px` }">
          <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
            <div :class="$style.capa">
              <svg viewBox="0 0 1200 630" :class="$style.capaSvg" role="img" :aria-label="`Capa de ${post.title}`">
                <rect width="1200" height="630" :fill="coverColour(post.title)" />
                <text
                  x="600"
                  y="345"
                  text-anchor="middle"
                  font-size="360"
                  :fill="inkForCover(coverColour(post.title))"
                  opacity="0.9"
                >{{ post.title.charAt(0).toUpperCase() }}</text>
              </svg>
            </div>
            <p :class="$style.meta" :style="{ color: MUTED }">
              {{ post.date }} <template v-if="showTag">· {{ post.tag }}</template>
            </p>
            <p :class="$style.title">{{ post.title }}</p>
          </li>
        </ol>
        <figcaption :class="$style.name">
          grade com capa, proporção nativa · cabem {{ rowsIn900Grade }} linhas numa janela de 900px
        </figcaption>
      </figure>

      <figure :class="$style.item">
        <ol :class="$style.miniatura">
          <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
            <div :class="$style.chip" :style="{ '--chip-lado': `${thumbSize}px` }">
              <svg
                viewBox="0 0 1200 630"
                preserveAspectRatio="xMidYMid slice"
                :class="$style.chipSvg"
                role="img"
                :aria-label="`Capa de ${post.title}`"
              >
                <rect width="1200" height="630" :fill="coverColour(post.title)" />
                <text
                  x="600"
                  y="420"
                  text-anchor="middle"
                  font-size="480"
                  :fill="inkForCover(coverColour(post.title))"
                  opacity="0.9"
                >{{ post.title.charAt(0).toUpperCase() }}</text>
              </svg>
            </div>
            <span :class="$style.title">{{ post.title }}</span>
            <span v-if="showTag" :class="$style.tag" :style="{ color: ACCENT }">{{ post.tag }}</span>
            <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
          </li>
        </ol>
        <figcaption :class="$style.name">
          lista com miniatura quadrada · cabem {{ rowsIn900Miniatura }} linhas numa janela de 900px
        </figcaption>
      </figure>

      <figure :class="$style.item">
        <div :class="$style.densidadeControl" role="group" aria-label="densidade da lista">
          <button
            type="button"
            :class="$style.densidadeBotao"
            :style="{ color: density === 'cards' ? ACCENT : MUTED }"
            :aria-pressed="density === 'cards'"
            @click="density = 'cards'"
          >cartões</button>
          <button
            type="button"
            :class="$style.densidadeBotao"
            :style="{ color: density === 'lista' ? ACCENT : MUTED }"
            :aria-pressed="density === 'lista'"
            @click="density = 'lista'"
          >lista</button>
        </div>

        <ol v-if="density === 'cards'" :class="$style.grade" :style="{ '--capa-largura': `${thumbSize}px` }">
          <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
            <div :class="$style.capa">
              <svg viewBox="0 0 1200 630" :class="$style.capaSvg" role="img" :aria-label="`Capa de ${post.title}`">
                <rect width="1200" height="630" :fill="coverColour(post.title)" />
                <text
                  x="600"
                  y="345"
                  text-anchor="middle"
                  font-size="360"
                  :fill="inkForCover(coverColour(post.title))"
                  opacity="0.9"
                >{{ post.title.charAt(0).toUpperCase() }}</text>
              </svg>
            </div>
            <p :class="$style.meta" :style="{ color: MUTED }">
              {{ post.date }} <template v-if="showTag">· {{ post.tag }}</template>
            </p>
            <p :class="$style.title">{{ post.title }}</p>
          </li>
        </ol>
        <ol v-else :class="$style.miniatura">
          <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
            <div :class="$style.chip" :style="{ '--chip-lado': `${thumbSize}px` }">
              <svg
                viewBox="0 0 1200 630"
                preserveAspectRatio="xMidYMid slice"
                :class="$style.chipSvg"
                role="img"
                :aria-label="`Capa de ${post.title}`"
              >
                <rect width="1200" height="630" :fill="coverColour(post.title)" />
                <text
                  x="600"
                  y="420"
                  text-anchor="middle"
                  font-size="480"
                  :fill="inkForCover(coverColour(post.title))"
                  opacity="0.9"
                >{{ post.title.charAt(0).toUpperCase() }}</text>
              </svg>
            </div>
            <span :class="$style.title">{{ post.title }}</span>
            <span v-if="showTag" :class="$style.tag" :style="{ color: ACCENT }">{{ post.tag }}</span>
            <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
          </li>
        </ol>
        <figcaption :class="$style.name">densidade que o leitor escolhe</figcaption>
      </figure>
    </div>

    <Panel label="lista recusada">
      <Pick v-model="face" label="fonte" :options="Object.keys(STACKS).map((id) => ({ id, name: id }))" />
      <Pick v-model="leader" label="pontilhado" :options="LEADER_OPTIONS" />
      <Knob v-model="rows" label="altura da linha" :min="6" :max="40" />
      <Knob v-model="tracking" label="entreletra" :min="-2" :max="20" unit="/100em" />
      <Toggle v-model="showTag" label="mostrar seção" />
      <Knob v-model="thumbSize" label="tamanho da miniatura" :min="32" :max="220" :step="4" unit="px" />
    </Panel>

    <p :class="$style.readout">
      título {{ inkContrast }}:1 · data e seção {{ mutedContrast }}:1 sobre {{ BG }} · monograma
      {{ thumbContrast.toFixed(2) }}:1 no pior caso entre as cinco cores. Com miniatura de {{ thumbSize }}px, a
      grade cabe {{ rowsIn900Grade }} linhas e a lista com miniatura cabe {{ rowsIn900Miniatura }} linhas numa
      janela de 900px. As seis perderam para a tabela densa de quatro colunas, que não desenha capa nenhuma.
    </p>

    <DecisionCopy
      lab="lista de posts recusada"
      component="RetiredChromeListShapes.vue"
      :settings="decisionSettings"
      :context="decisionContext"
    />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.stack {
  padding: clamp(1rem, 4%, 1.6rem);
  font-size: 0.85rem;
  overflow-x: auto;
  /* Container de consulta: a miniatura (.chip) mede sua régua de segurança
     contra a largura desta caixa, não da janela do navegador inteira. */
  container-type: inline-size;
}

.stack > .item + .item {
  margin-block-start: 1.4rem;
  padding-block-start: 1.4rem;
  border-block-start: 1px dashed #ffffff1f;
}

.stack ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.stack li {
  cursor: pointer;
}

.item {
  margin: 0;
}

.name {
  margin-block-start: 0.5rem;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.razao li {
  display: flex;
  align-items: baseline;
  overflow: hidden;
  white-space: nowrap;
}

.razao li > * + * {
  margin-inline-start: 0.7rem;
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
  align-items: baseline;
  padding-inline: 0.5rem;
}

.menu li > * + * {
  margin-inline-start: 0.6rem;
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

.cartoes li {
  padding: 0.7rem 0.9rem;
  border: 3px double #ffffff33;
  border-inline-start: 8px solid #ffffff33;
}

.cartoes li + li {
  margin-block-start: 0.7rem;
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

.densidadeControl {
  display: inline-flex;
  margin-block-end: 0.8rem;
  border: 1px solid #ffffff33;
}

.densidadeBotao {
  padding: 0.3rem 0.8rem;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.densidadeBotao + .densidadeBotao {
  border-inline-start: 1px solid #ffffff33;
}

.grade {
  display: flex;
  flex-wrap: wrap;
  margin: -0.55rem;
}

.grade li {
  margin: 0.55rem;
  inline-size: min(var(--capa-largura, 160px), 100%);
}

.grade p {
  margin: 0;
}

.grade .capa {
  margin-block-end: 0.4rem;
}

.grade .meta {
  margin-block-end: 0.4rem;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.capa {
  inline-size: 100%;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
  border: 1px solid #ffffff1f;
}

.capaSvg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.miniatura li {
  display: flex;
  align-items: center;
}

.miniatura .chip {
  flex: none;
  margin-inline-end: 0.7rem;
}

.miniatura .title {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-inline-end: 0.7rem;
}

.miniatura .tag {
  flex: none;
  margin-inline-end: 0.7rem;
  font-size: 0.72rem;
}

.miniatura .date {
  flex: none;
  font-variant-numeric: tabular-nums;
}

.chip {
  inline-size: min(var(--chip-lado, 56px), 18cqi);
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid #ffffff1f;
}

.chipSvg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
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
