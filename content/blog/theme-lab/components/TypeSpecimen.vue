<script setup lang="ts">
/**
 * A pergunta aberta mais cara do redesenho: um tipo pixelado aguenta três mil
 * palavras?
 *
 * Por isso este espécime não mostra uma linha bonita. Mostra quatro parágrafos
 * de português de verdade, com toda a acentuação da língua, no tamanho e na
 * medida em que o post vive. Se você não consegue ler o terceiro parágrafo sem
 * apertar os olhos, a fonte já respondeu.
 */
import { computed, ref, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { BODY_FACE_OPTIONS, SUBHEAD_FACE, TITLE_FACE, faceById } from './faces'
import { CODE_SAMPLE, DECK, DIACRITICS, HEADING, PARAGRAPHS } from './copy'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const THEME_OPTIONS = [
  { id: 'escuro', name: 'escuro do site' },
  { id: 'claro', name: 'claro do site' },
  { id: 'fosforo', name: 'fósforo P39' },
  { id: 'ambar', name: 'âmbar' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

// Os dois primeiros são os fundos de verdade do site, iguais aos tokens em
// src/styles/theme.css: preto absoluto no escuro e o sépia no claro. Eram
// #14161a e #fffdf9 antes da paleta ser decidida, o que fazia esta bancada medir
// contraste contra fundos que o site não usa mais.
const THEMES = {
  escuro: { bg: '#000000', fg: '#e0dcd4', muted: '#a8a29a' },
  claro: { bg: '#f4efe0', fg: '#332d23', muted: '#6b6353' },
  fosforo: { bg: '#000000', fg: '#20c20e', muted: '#118a08' },
  ambar: { bg: '#0a0704', fg: '#ffb000', muted: '#a67200' },
}

/** Handjet só sobrevive no corpo neste tamanho e espaçamento; ver faces.ts. */
const HANDJET_SIZE = 22
const HANDJET_TRACKING = 3

const face = ref('plex')
const size = ref(17)
const leading = ref(165)
const tracking = ref(0)
const words = ref(0)
const measure = ref(68)
const theme = ref<keyof typeof THEMES>('escuro')
const crisp = ref(false)

const chosen = computed(() => faceById(face.value))
const colours = computed(() => THEMES[theme.value])
const contrast = computed(() => ratio(parseHex(colours.value.fg), parseHex(colours.value.bg)))
const mutedContrast = computed(() => ratio(parseHex(colours.value.muted), parseHex(colours.value.bg)))

// O veredito sobre Handjet é condicional: só em 22px com ~0,03em de entreletra.
// Ao escolhê-la, o espécime pula direto para essa configuração.
watch(face, (id) => {
  if (id === 'handjet') {
    size.value = HANDJET_SIZE
    tracking.value = HANDJET_TRACKING
  }
})

/** WCAG 1.4.12: entrelinha >= 1.5, entreletra >= 0.12em, entrepalavra >= 0.16em. */
const spacingOk = computed(() => leading.value >= 150 && tracking.value >= 12 && words.value >= 16)

const decisionSettings = computed(() => [
  { label: 'fonte do corpo', value: `${chosen.value.name} (${chosen.value.licence})` },
  { label: 'fundo', value: labelFor(THEME_OPTIONS, theme.value) },
  { label: 'sem antisserrilhado', value: crisp.value ? 'sim' : 'não' },
  { label: 'corpo', value: `${size.value}px` },
  { label: 'entrelinha', value: `${leading.value}%` },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'entrepalavra', value: `${words.value}/100em` },
  { label: 'medida', value: `${measure.value}ch` },
])

const decisionContext = computed(
  () =>
    `Contraste ${contrast.value.toFixed(2)}:1 (secundário ${mutedContrast.value.toFixed(2)}:1) sobre ${colours.value.bg}. WCAG 1.4.12: ${spacingOk.value ? 'passa no espaçamento mínimo' : 'abaixo do mínimo de espaçamento'}.`,
)

const bodyStyle = computed(() => ({
  fontFamily: chosen.value.stack,
  fontSize: `${size.value}px`,
  lineHeight: String(leading.value / 100),
  letterSpacing: `${tracking.value / 100}em`,
  wordSpacing: `${words.value / 100}em`,
  maxInlineSize: `${measure.value}ch`,
  color: colours.value.fg,
  ...(crisp.value
    ? { WebkitFontSmoothing: 'none', fontSmooth: 'never', filter: 'contrast(100.00001%)' }
    : {}),
}))

const titleStyle = computed(() => ({
  fontFamily: TITLE_FACE.stack,
  color: colours.value.fg,
  fontSize: `${size.value * 2.1}px`,
  lineHeight: 1.15,
}))

const deckStyle = computed(() => ({
  fontFamily: SUBHEAD_FACE.stack,
  color: colours.value.muted,
  fontSize: `${size.value * 1.15}px`,
}))
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: colours.bg }">
      <p :class="$style.kicker" :style="{ color: colours.muted, fontFamily: titleStyle.fontFamily }">
        SEÇÃO 03 / CORPO EM TESTE: {{ chosen.name.toUpperCase() }}
      </p>
      <h3 :class="$style.title" :style="titleStyle">{{ HEADING }}</h3>
      <p :class="$style.deck" :style="deckStyle">{{ DECK }}</p>
      <p v-for="paragraph in PARAGRAPHS" :key="paragraph" :style="bodyStyle">{{ paragraph }}</p>
      <p :class="$style.diacritics" :style="{ ...bodyStyle, fontSize: `${size * 1.4}px` }">{{ DIACRITICS }}</p>
      <pre :class="$style.code" :style="{ ...bodyStyle, fontSize: `${size * 0.92}px` }">{{ CODE_SAMPLE }}</pre>
    </div>

    <p :class="$style.decided">
      Título e subtítulo já foram decididos: <strong>{{ TITLE_FACE.name }}</strong> ({{ TITLE_FACE.licence }}) no
      título, <strong>{{ SUBHEAD_FACE.name }}</strong> ({{ SUBHEAD_FACE.licence }}) no subtítulo. O corpo abaixo é a
      única variável ainda em aberto.
    </p>

    <Panel label="tipo">
      <Pick v-model="face" label="fonte do corpo" :options="BODY_FACE_OPTIONS" />
      <Pick v-model="theme" label="fundo" :options="THEME_OPTIONS" />
      <Toggle v-model="crisp" label="sem antisserrilhado" />
    </Panel>

    <Panel label="medida">
      <Knob v-model="size" label="corpo" :min="10" :max="32" unit="px" />
      <Knob v-model="leading" label="entrelinha" :min="100" :max="220" unit="%" />
      <Knob v-model="tracking" label="entreletra" :min="-4" :max="30" unit="/100em" />
      <Knob v-model="words" label="entrepalavra" :min="0" :max="40" unit="/100em" />
      <Knob v-model="measure" label="medida" :min="30" :max="100" unit="ch" />
    </Panel>

    <dl :class="$style.facts">
      <div><dt>licença</dt><dd>{{ chosen.licence }}</dd></div>
      <div><dt>papel</dt><dd>{{ chosen.role }}</dd></div>
      <div><dt>largura</dt><dd>{{ chosen.mono ? 'monoespaçada' : 'proporcional' }}</dd></div>
      <div><dt>contraste</dt><dd>{{ contrast.toFixed(2) }}:1 · secundário {{ mutedContrast.toFixed(2) }}:1</dd></div>
      <div><dt>WCAG 1.4.12</dt><dd>{{ spacingOk ? 'passa no espaçamento mínimo' : 'abaixo do mínimo de espaçamento' }}</dd></div>
    </dl>

    <p :class="$style.note">{{ chosen.note }}</p>
    <p :class="$style.note">
      A regra 1.4.12 do WCAG não pede que o texto já venha assim: pede que ele não quebre quando o leitor força
      entrelinha 1,5, entreletra 0,12em e entrepalavra 0,16em. Suba os três sliders até lá e veja se a coluna
      aguenta. Fonte pixel costuma melhorar com espaçamento, o que é a única coisa que a literatura sobre leitura
      e dislexia mostra de forma consistente.
    </p>

    <DecisionCopy
      lab="espécime de tipo (corpo)"
      component="TypeSpecimen.vue"
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
  padding: clamp(1.2rem, 5%, 2.2rem);
}

.kicker {
  margin: 0 0 0.8rem;
  font-size: 0.68rem;
  letter-spacing: 0.22em;
}

.title {
  margin: 0 0 1rem;
  text-wrap: balance;
}

.stage p {
  margin: 0 0 1em;
}

.diacritics {
  margin-block-start: 1.6em;
  opacity: 0.9;
}

.code {
  margin: 0;
  white-space: pre-wrap;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.2rem 1.2rem;
  margin: 0.9rem 0 0;
  padding-block-start: 0.6rem;
  border-block-start: 1px dashed var(--rule);
  font-size: 0.7rem;
}

.facts div {
  display: flex;
  gap: 0.5rem;
}

.facts dt {
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.facts dd {
  margin: 0;
  color: var(--fg);
}

.note {
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}

.decided {
  margin: 0.9rem 0 0;
  padding-inline-start: 0.6rem;
  border-inline-start: 3px solid var(--brand-green);
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.6;
}

/*
 * Deliberately no `color` on the strong here. A bold run inside a post is a
 * chip: yellow background, dark ink, both from theme.css. Setting the colour to
 * --fg kept the yellow and put the near-white page ink on top of it, which is
 * 1.37:1 and unreadable.
 */
</style>
