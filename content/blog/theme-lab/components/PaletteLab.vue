<script setup lang="ts">
/**
 * A paleta da marca em registro de terminal, com o número do contraste embaixo de
 * cada amostra.
 *
 * O ponto desta bancada não é escolher cores bonitas: é ver quais das cores que
 * já existem sobrevivem como texto. Metade da paleta CGA original reprova em
 * corpo de texto sobre preto, e é bom saber disso antes de adotar o visual dela.
 */
import { computed, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { composite, grade, parseHex, ratio, toHex, type Rgb } from './contrast'
import './fonts.css'

const REGISTERS: Record<string, { name: string; colours: Array<[string, string]> }> = {
  marca: {
    name: 'a marca, como está',
    colours: [
      ['vermelho', '#e30613'],
      ['verde', '#45b384'],
      ['amarelo', '#f5b200'],
      ['azul', '#0578be'],
      ['roxo', '#4b15a8'],
    ],
  },
  tintas: {
    name: 'as tintas do site (texto, apagado, link, friso e roxo)',
    colours: [
      ['texto, claro', '#332d23'],
      ['texto, escuro', '#e0dcd4'],
      ['apagado, claro', '#6b6353'],
      ['apagado, escuro', '#a8a29a'],
      ['link, claro', '#1a5c96'],
      ['link, escuro', '#7cc0ff'],
      ['friso, claro', '#ddd4bd'],
      ['friso, escuro', '#2b1f42'],
      ['roxo da marca', '#4b15a8'],
    ],
  },
  cga: {
    name: 'CGA/EGA 16 canônica',
    colours: [
      ['azul', '#0000aa'],
      ['verde', '#00aa00'],
      ['ciano', '#00aaaa'],
      ['vermelho', '#aa0000'],
      ['magenta', '#aa00aa'],
      ['marrom', '#aa5500'],
      ['cinza', '#aaaaaa'],
      ['azul claro', '#5555ff'],
      ['verde claro', '#55ff55'],
      ['ciano claro', '#55ffff'],
      ['vermelho claro', '#ff5555'],
      ['magenta claro', '#ff55ff'],
      ['amarelo', '#ffff55'],
      ['branco', '#ffffff'],
    ],
  },
  vga5153: {
    name: 'CGA medida no IBM 5153',
    colours: [
      ['azul', '#0000c4'],
      ['verde', '#00c400'],
      ['ciano', '#00c4c4'],
      ['vermelho', '#c40000'],
      ['magenta', '#c400c4'],
      ['marrom', '#c47e00'],
      ['cinza', '#c4c4c4'],
      ['azul claro', '#4e4edc'],
      ['verde claro', '#4edc4e'],
      ['ciano claro', '#4ef3f3'],
      ['vermelho claro', '#dc4e4e'],
      ['amarelo', '#f3f34e'],
      ['branco', '#ffffff'],
    ],
  },
  fosforo: {
    name: 'fósforo P39, o verde do IBM 5151',
    colours: [
      ['escuro', '#0a3d05'],
      ['médio', '#118a08'],
      ['normal', '#20c20e'],
      ['claro', '#6bff5c'],
    ],
  },
  ambar: {
    name: 'âmbar de terminal',
    colours: [
      ['escuro', '#4a3300'],
      ['médio', '#a67200'],
      ['normal', '#ffb000'],
      ['claro', '#ffd98a'],
    ],
  },
  dmg: {
    name: 'Game Boy DMG',
    colours: [
      ['mais escuro', '#0f380f'],
      ['escuro', '#306230'],
      ['claro', '#8bac0f'],
      ['mais claro', '#9bbc0f'],
    ],
  },
  campbell: {
    name: 'Campbell (Windows Terminal)',
    colours: [
      ['vermelho', '#c50f1f'],
      ['verde', '#13a10e'],
      ['amarelo', '#c19c00'],
      ['azul', '#0037da'],
      ['ciano', '#3a96dd'],
      ['vermelho claro', '#e74856'],
      ['verde claro', '#16c60c'],
      ['azul claro', '#3b78ff'],
      ['branco', '#f2f2f2'],
    ],
  },
}

const register = ref('marca')
const bgLightness = ref(8)
const lift = ref(0)
const bigText = ref(false)
// Default to the site's own dark ground: it's the real thing every colour
// above has to survive against, not an approximation of it.
const bgHue = ref('escuro')

const BG_HUES: Record<string, Rgb> = {
  neutro: [255, 255, 255],
  frio: [120, 160, 255],
  quente: [255, 190, 120],
  verde: [120, 255, 160],
}

// The blog's two page grounds, exact, not composited toward black like the
// tinted registers below. Escuro is #000000 on purpose, so OLED pixels switch
// off. Claro is the NieR Automata sepia the site actually reads on.
const SITE_GROUNDS: Record<string, string> = {
  escuro: '#000000',
  claro: '#f4efe0',
}

const BG_HUE_OPTIONS = [
  { id: 'escuro', name: 'fundo escuro do site (preto absoluto)' },
  { id: 'claro', name: 'fundo claro do site (sépia)' },
  { id: 'neutro', name: 'neutro' },
  { id: 'frio', name: 'azulado' },
  { id: 'quente', name: 'quente' },
  { id: 'verde', name: 'esverdeado' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const usingSiteGround = computed(() => Boolean(SITE_GROUNDS[bgHue.value]))

const background = computed(() => {
  const ground = SITE_GROUNDS[bgHue.value]
  if (ground) return ground
  return toHex(composite(BG_HUES[bgHue.value], [0, 0, 0], bgLightness.value / 100))
})

const swatches = computed(() =>
  REGISTERS[register.value].colours.map(([name, hex]) => {
    const base = parseHex(hex)
    const raised = composite([255, 255, 255], base, lift.value / 100)
    const value = ratio(raised, parseHex(background.value))
    return { name, hex: toHex(raised), value, verdict: grade(value) }
  }),
)

const floor = computed(() => (bigText.value ? 3 : 4.5))
const failing = computed(() => swatches.value.filter((s) => s.value < floor.value).length)

const decisionSettings = computed(() => [
  { label: 'paleta', value: REGISTERS[register.value].name },
  { label: 'tom do fundo', value: `${labelFor(BG_HUE_OPTIONS, bgHue.value)} (${background.value})` },
  {
    label: 'claridade do fundo',
    value: usingSiteGround.value ? 'usa o fundo do site, knob inativo' : `${bgLightness.value}%`,
  },
  { label: 'clarear as cores', value: `${lift.value}%` },
  { label: 'medir como texto grande (3:1)', value: bigText.value ? 'sim' : 'não' },
])

const decisionContext = computed(
  () =>
    `Fundo ${background.value}. ${failing.value} de ${swatches.value.length} cores deste registro ficam abaixo de ${floor.value}:1 com essa configuração.`,
)
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background }">
      <p :class="$style.path" :style="{ color: swatches[0]?.hex }">~/blog/content <span :class="$style.dim">$</span></p>
      <div :class="$style.swatches">
        <div v-for="swatch in swatches" :key="swatch.name" :class="$style.swatch">
          <span :class="$style['swatch-bar']" :style="{ background: swatch.hex }"></span>
          <span :class="$style.text" :style="{ color: swatch.hex }">Abstração vaza</span>
          <span :class="[$style.meta, { [$style.bad]: swatch.value < floor }]">
            {{ swatch.hex }} · {{ swatch.value.toFixed(2) }}:1 · {{ swatch.verdict }}
          </span>
        </div>
      </div>
    </div>

    <Panel label="registro">
      <Pick
        v-model="register"
        label="paleta"
        :options="Object.entries(REGISTERS).map(([id, value]) => ({ id, name: value.name }))"
      />
      <Pick v-model="bgHue" label="tom do fundo" :options="BG_HUE_OPTIONS" />
      <Knob
        v-if="!usingSiteGround"
        v-model="bgLightness"
        label="claridade do fundo"
        :min="0"
        :max="100"
        unit="%"
      />
      <Knob v-model="lift" label="clarear as cores" :min="0" :max="80" unit="%" />
      <Toggle v-model="bigText" label="medir como texto grande (3:1)" />
    </Panel>

    <p :class="$style.readout">
      Fundo {{ background }}. {{ failing }} de {{ swatches.length }} cores deste registro ficam abaixo de
      {{ floor }}:1 e não servem como texto corrido aí.
    </p>
    <p :class="$style.note">
      Dois números que valem guardar: o vermelho da CGA sobre preto dá 2,71:1 e o marrom dá 4,01:1, ou seja, o
      visual DOS autêntico reprova em texto. O verde e o amarelo da marca sobre o fundo escuro do site passam
      folgado; o vermelho da marca não passa, o que já é verdade hoje e é por isso que ele só aparece em link não
      escrito. "Clarear as cores" é a saída barata: mistura branco na cor até o número subir, ao custo de tirar
      saturação.
    </p>

    <DecisionCopy
      lab="paleta em registro de terminal"
      component="PaletteLab.vue"
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
  padding: clamp(1rem, 4%, 1.8rem);
}

.path {
  margin: 0 0 1rem;
  font-family: 'Departure Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
}

.dim {
  opacity: 0.6;
}

.swatches {
  display: grid;
  gap: 0.35rem;
}

.swatch {
  display: grid;
  grid-template-columns: 1.6rem minmax(8rem, 1fr) auto;
  gap: 0.7rem;
  align-items: center;
}

/* CSS modules rename this class, so it no longer collides with the global `.chip`. */
.swatch-bar {
  block-size: 1rem;
  inline-size: 100%;
}

.text {
  font-family: 'Departure Mono', ui-monospace, monospace;
  font-size: 0.95rem;
}

.meta {
  color: #8d9199;
  font-size: 0.66rem;
  letter-spacing: 0.04em;
  text-align: end;
}

.meta.bad {
  color: #ff8b93;
}

.readout,
.note {
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
