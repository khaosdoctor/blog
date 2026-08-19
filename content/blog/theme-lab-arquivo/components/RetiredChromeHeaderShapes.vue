<script setup lang="ts">
/**
 * As quatro leituras de cabeçalho que perderam para a barra de caixa ┌─┐,
 * lado a lado, porque a comparação pedia ver as quatro ao mesmo tempo, não
 * julgar uma de cada vez (a mesma ideia de `ChromeButton.vue` acima). Os
 * controles abaixo (marca, cor, fonte, entreletra, respiro) valem para as
 * quatro ao mesmo tempo: não sobrou pergunta sobre qual delas vence, só sobre
 * como cada uma teria ficado nas outras escolhas já fechadas.
 *
 * O cursor de bloco e as cinco animações do wordmark saíram daqui de
 * propósito. As duas viraram efeito e escolha do candidato vencedor
 * (`ChromeHeader.vue`, seção 01 do laboratório vivo), nunca foram parte da
 * disputa entre formas: arquivar essas opções junto teria misturado uma
 * decisão fechada (a forma) com escolhas que continuam abertas ali. Por isso
 * o wordmark aqui é só o nome por extenso, parado.
 *
 * A única coisa exclusiva de uma forma sobrevive: o prompt do candidato "dos"
 * é editável de verdade (`dosPrompt`), porque nele o prompt é a própria
 * marca, não um texto ao lado dela.
 */
import { computed, ref } from 'vue'
import DecisionCopy from '../../theme-lab/components/DecisionCopy.vue'
import Knob from '../../theme-lab/components/Knob.vue'
import LogoMark from '../../theme-lab/components/LogoMark.vue'
import {
  labelForMark,
  MARK_ACCENT_ALL_ID,
  MARK_ACCENTS,
  MARK_CANDIDATES,
  MARK_DEFAULT_ACCENT,
  MARK_DEFAULT_PX,
  MARK_MIN_PX,
  type MarkCandidateId,
} from '../../theme-lab/components/logoMarks'
import Panel from '../../theme-lab/components/Panel.vue'
import Pick from '../../theme-lab/components/Pick.vue'
import Toggle from '../../theme-lab/components/Toggle.vue'
import { parseHex, ratio } from '../../theme-lab/components/contrast'
import '../../theme-lab/components/fonts.css'

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

/** Espelho em hex dos tokens de marca, só para o número de contraste, a mesma duplicação e o mesmo motivo de `ChromeHeader.vue`. */
const MARK_ACCENT_HEX: Record<string, string> = {
  verde: '#45b384',
  amarelo: '#f5b200',
  azul: '#7cc0ff',
  vermelho: '#e6242f',
  roxo: '#815bc2',
  traço: '#f3f1ee',
}

const BG = '#14161a'
const INK = '#e6e4e0'
const MUTED = '#9a9ea6'
const NAV = ['posts', 'séries', 'tags', 'busca', 'sobre']
const WORD = 'lsantos.dev'

const BRAND_MODE_OPTIONS = [
  { id: 'ambos', name: 'logo + texto' },
  { id: 'logo', name: 'só o logo' },
  { id: 'texto', name: 'só o texto' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const face = ref('departure')
const accent = ref('verde')
const tracking = ref(8)
const density = ref(10)
const caps = ref(true)

const markCandidate = ref<MarkCandidateId>('fio')
const markSizePx = ref(MARK_DEFAULT_PX.fio)
const markBelowFloor = computed(() => markSizePx.value < MARK_MIN_PX[markCandidate.value])
const markAccentId = ref(MARK_DEFAULT_ACCENT)
const markAccentColor = computed(() => MARK_ACCENTS[markAccentId.value])
const markAccentIsAll = computed(() => markAccentId.value === MARK_ACCENT_ALL_ID)
const markAccentContrast = computed(() => {
  if (markAccentIsAll.value) return null
  return ratio(parseHex(MARK_ACCENT_HEX[markAccentId.value]), parseHex(BG)).toFixed(2)
})

const brandMode = ref('ambos')
const showLogoSlot = computed(() => brandMode.value !== 'texto')
const showTextSlot = computed(() => brandMode.value !== 'logo')

/** O prompt do candidato "dos": editável, pode ficar vazio, sem nenhuma marca ao lado, a mesma regra de quando ele ainda disputava a decisão. */
const dosPrompt = ref('C:\\BLOG>')

const accentHex = computed(() => ACCENTS[accent.value])
const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))
const accentContrast = computed(() => ratio(parseHex(accentHex.value), parseHex(BG)).toFixed(2))

const decisionSettings = computed(() => [
  { label: 'marca', value: labelForMark(markCandidate.value) },
  { label: 'tamanho da marca', value: `${markSizePx.value}px (piso do candidato: ${MARK_MIN_PX[markCandidate.value]}px${markBelowFloor.value ? ', abaixo do piso' : ''})` },
  { label: 'cor da marca', value: markAccentIsAll.value ? 'todas' : `${markAccentId.value} (${markAccentContrast.value}:1)` },
  { label: 'composição da marca', value: labelFor(BRAND_MODE_OPTIONS, brandMode.value) },
  { label: 'fonte', value: face.value },
  { label: 'destaque', value: `${accent.value} (${accentHex.value})` },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'respiro', value: String(density.value) },
  { label: 'caixa alta', value: caps.value ? 'sim' : 'não' },
  { label: 'prompt do DOS', value: dosPrompt.value || '(vazio)' },
])

const decisionContext = computed(
  () => `Texto ${inkContrast.value}:1 · secundário ${mutedContrast.value}:1 · destaque ${accentContrast.value}:1 sobre ${BG}. As quatro formas abaixo perderam para a barra de caixa; nenhuma delas carrega cursor ou animação de wordmark, os dois viraram efeito só do candidato vencedor.`,
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
    <div :class="$style.stack" :style="{ background: BG }">
      <figure :class="$style.item">
        <header :class="$style.dos" :style="base">
          <span :class="$style.badge" :style="{ background: accentHex, color: BG }">{{ dosPrompt }}</span>
          <nav :class="$style.right">
            <span v-for="navItem in NAV" :key="navItem" :class="$style.navItem">{{ navItem }}</span>
          </nav>
        </header>
        <figcaption :class="$style.name">linha de DOS invertida</figcaption>
      </figure>

      <figure :class="$style.item">
        <header :class="$style.minimo" :style="base">
          <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
            <span v-if="showLogoSlot" :class="$style.markSlot">
              <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" />
            </span>
            <span v-if="showTextSlot" :style="{ color: accentHex }">{{ WORD }}</span>
          </a>
          <nav :class="$style.right">
            <span v-for="navItem in NAV" :key="navItem" :class="$style.navItem">{{ navItem }}</span>
          </nav>
        </header>
        <figcaption :class="$style.name">mínimo, só uma régua</figcaption>
      </figure>

      <figure :class="$style.item">
        <header :class="$style.menu" :style="base">
          <div :class="$style.frame" :style="{ borderColor: MUTED }">
            <span :class="$style.brandRow">
              <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
                <span v-if="showLogoSlot" :class="$style.markSlot">
                  <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" />
                </span>
                <span v-if="showTextSlot" :style="{ color: accentHex }">{{ WORD }}</span>
              </a>
            </span>
            <nav>
              <span v-for="(navItem, index) in NAV" :key="navItem" :class="[$style.navItem, $style.row]">
                <span :class="$style.pointer" :style="{ color: index === 0 ? accentHex : 'transparent' }">▸</span>{{ navItem }}
              </span>
            </nav>
          </div>
        </header>
        <figcaption :class="$style.name">menu de Game Boy ▸</figcaption>
      </figure>

      <figure :class="$style.item">
        <header :class="$style.ledger" :style="base">
          <p :class="$style.line" :style="{ color: MUTED }">seção 00 / índice · v0.0.1+42 · 449 páginas</p>
          <p :class="$style.brandline">
            <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
              <span v-if="showLogoSlot" :class="$style.markSlot">
                <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" />
              </span>
              <span v-if="showTextSlot" :style="{ color: accentHex }">{{ WORD }}</span>
            </a>
            <span :style="{ color: MUTED }"> ······································ </span>
            <span>{{ NAV.join(' · ') }}</span>
          </p>
        </header>
        <figcaption :class="$style.name">razão, SEÇÃO 00 / ÍNDICE</figcaption>
      </figure>
    </div>

    <Panel label="cabeçalho recusado">
      <Pick v-model="markCandidate" label="marca" :options="MARK_CANDIDATES.map((c) => ({ id: c.id, name: c.name }))" />
      <Knob v-model="markSizePx" label="tamanho da marca" :min="0" :max="300" :step="4" unit="px" />
      <Pick v-model="markAccentId" label="cor da marca" :options="Object.keys(MARK_ACCENTS).map((id) => ({ id, name: id }))" />
      <Pick v-model="brandMode" label="composição da marca" :options="BRAND_MODE_OPTIONS" />
      <label :class="$style.textField">
        <span :class="$style.textFieldName">prompt do DOS</span>
        <input v-model="dosPrompt" type="text" :class="$style.textFieldInput" placeholder="(vazio)" />
      </label>
      <Pick v-model="face" label="fonte" :options="Object.keys(STACKS).map((id) => ({ id, name: id }))" />
      <Pick v-model="accent" label="destaque" :options="Object.keys(ACCENTS).map((id) => ({ id, name: id }))" />
      <Knob v-model="tracking" label="entreletra" :min="0" :max="30" unit="/100em" />
      <Knob v-model="density" label="respiro" :min="4" :max="30" />
      <Toggle v-model="caps" label="caixa alta" />
    </Panel>

    <p :class="$style.readout">
      texto {{ inkContrast }}:1 · secundário {{ mutedContrast }}:1 · destaque {{ accentContrast }}:1 sobre {{ BG }}.
      A marca está em {{ markSizePx }}px contra um piso de legibilidade de {{ MARK_MIN_PX[markCandidate] }}px para
      "{{ labelForMark(markCandidate) }}"<template v-if="markBelowFloor">, abaixo dele agora</template
      ><template v-else>, acima dele agora</template>. Nenhuma das quatro formas abaixo carrega cursor de bloco ou
      animação de wordmark: os dois viraram efeito só do candidato vencedor, então aqui o nome fica só por extenso,
      parado.
    </p>

    <DecisionCopy
      lab="cabeçalho recusado"
      component="RetiredChromeHeaderShapes.vue"
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
  padding: 1.4rem 1rem;
  overflow-x: auto;
}

.stack > .item + .item {
  margin-block-start: 1rem;
}

.stack header {
  font-size: 0.78rem;
}

.stack nav {
  display: inline-flex;
}

.item {
  margin: 0;
}

.name {
  margin-block-start: 0.35rem;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.markSlot {
  display: inline-flex;
  align-items: center;
  margin-inline-end: 0.5rem;
}

.brandRow {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
}

.navItem {
  cursor: pointer;
}

.navItem:hover {
  text-decoration: underline;
}

.navItem + .navItem {
  margin-inline-start: 0.9rem;
}

.dos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.dos > * + * {
  margin-inline-start: 0.6rem;
}

.badge {
  padding: 0.15rem 0.4rem;
  font-weight: 700;
}

.right {
  margin-inline-start: auto;
}

.minimo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  border-block-end: 1px dotted currentColor;
}

.menu .frame {
  display: inline-grid;
  padding: 0.7rem 1.1rem 0.7rem 0.7rem;
  border: 3px double;
}

.menu .frame > * + * {
  margin-block-start: 0.4rem;
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
}

/* Mesma regra de `ChromeHeader.vue`: o link da marca mora dentro de `.prose`, que dá sublinhado e seta a
   qualquer `.prose a`. Desfazer isso aqui é só sobre a aparência de um cabeçalho real, não sobre a prosa de
   verdade do site. */
.brandLink.brandLink,
.brandLink.brandLink:hover,
.brandLink.brandLink:focus-visible {
  display: inline-flex;
  align-items: center;
  background: none;
  color: inherit;
  text-decoration-line: none;
}

.brandLink.brandLink::after {
  content: none;
}

.brandLink.brandLink:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.textField {
  display: grid;
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.textField > * + * {
  margin-block-start: 0.1rem;
}

.textFieldName {
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.textFieldInput {
  padding: 0.2rem 0.3rem;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: var(--bg);
  color: var(--fg);
  font: inherit;
}

.textFieldInput:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
