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
import { computed, ref } from 'vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { FACE_OPTIONS, faceById } from './faces'
import { CODE_SAMPLE, DECK, DIACRITICS, HEADING, PARAGRAPHS } from './copy'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const THEMES = {
  escuro: { bg: '#14161a', fg: '#e6e4e0', muted: '#9a9ea6' },
  claro: { bg: '#fffdf9', fg: '#1a1c20', muted: '#5d6169' },
  fosforo: { bg: '#000000', fg: '#20c20e', muted: '#118a08' },
  ambar: { bg: '#0a0704', fg: '#ffb000', muted: '#a67200' },
}

const face = ref('departure')
const size = ref(17)
const leading = ref(165)
const tracking = ref(0)
const words = ref(0)
const measure = ref(68)
const theme = ref<keyof typeof THEMES>('escuro')
const displayFace = ref('departure')
const crisp = ref(false)

const chosen = computed(() => faceById(face.value))
const display = computed(() => faceById(displayFace.value))
const colours = computed(() => THEMES[theme.value])
const contrast = computed(() => ratio(parseHex(colours.value.fg), parseHex(colours.value.bg)))
const mutedContrast = computed(() => ratio(parseHex(colours.value.muted), parseHex(colours.value.bg)))

/** WCAG 1.4.12: entrelinha >= 1.5, entreletra >= 0.12em, entrepalavra >= 0.16em. */
const spacingOk = computed(() => leading.value >= 150 && tracking.value >= 12 && words.value >= 16)

const offGrid = computed(() => chosen.value.pixelStep > 0 && size.value % chosen.value.pixelStep !== 0)

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
</script>

<template>
  <div class="demo">
    <div class="stage" :style="{ background: colours.bg }">
      <p class="kicker" :style="{ color: colours.muted, fontFamily: display.stack }">
        SEÇÃO 03 / {{ chosen.name.toUpperCase() }}
      </p>
      <h3
        class="title"
        :style="{ fontFamily: display.stack, color: colours.fg, fontSize: `${size * 2.1}px`, lineHeight: 1.15 }"
      >
        {{ HEADING }}
      </h3>
      <p class="deck" :style="{ ...bodyStyle, fontSize: `${size * 1.15}px`, color: colours.muted }">{{ DECK }}</p>
      <p v-for="paragraph in PARAGRAPHS" :key="paragraph" :style="bodyStyle">{{ paragraph }}</p>
      <p class="diacritics" :style="{ ...bodyStyle, fontSize: `${size * 1.4}px` }">{{ DIACRITICS }}</p>
      <pre class="code" :style="{ ...bodyStyle, fontSize: `${size * 0.92}px` }">{{ CODE_SAMPLE }}</pre>
    </div>

    <Panel label="tipo">
      <Pick v-model="face" label="fonte do corpo" :options="FACE_OPTIONS" />
      <Pick v-model="displayFace" label="fonte do título" :options="FACE_OPTIONS" />
      <Pick
        v-model="theme"
        label="fundo"
        :options="[
          { id: 'escuro', name: 'escuro do site' },
          { id: 'claro', name: 'claro do site' },
          { id: 'fosforo', name: 'fósforo P39' },
          { id: 'ambar', name: 'âmbar' },
        ]"
      />
      <Toggle v-model="crisp" label="sem antisserrilhado" />
    </Panel>

    <Panel label="medida">
      <Knob v-model="size" label="corpo" :min="10" :max="32" unit="px" />
      <Knob v-model="leading" label="entrelinha" :min="100" :max="220" unit="%" />
      <Knob v-model="tracking" label="entreletra" :min="-4" :max="30" unit="/100em" />
      <Knob v-model="words" label="entrepalavra" :min="0" :max="40" unit="/100em" />
      <Knob v-model="measure" label="medida" :min="30" :max="100" unit="ch" />
    </Panel>

    <dl class="facts">
      <div><dt>licença</dt><dd>{{ chosen.licence }}</dd></div>
      <div><dt>papel</dt><dd>{{ chosen.role }}</dd></div>
      <div><dt>largura</dt><dd>{{ chosen.mono ? 'monoespaçada' : 'proporcional' }}</dd></div>
      <div><dt>contraste</dt><dd>{{ contrast.toFixed(2) }}:1 · secundário {{ mutedContrast.toFixed(2) }}:1</dd></div>
      <div><dt>WCAG 1.4.12</dt><dd>{{ spacingOk ? 'passa no espaçamento mínimo' : 'abaixo do mínimo de espaçamento' }}</dd></div>
    </dl>

    <p class="note">{{ chosen.note }}</p>
    <p v-if="offGrid" class="warn">
      Fora do grid: esta é uma fonte de bitmap traçado e só fecha em múltiplos de {{ chosen.pixelStep }}px. Em
      {{ size }}px ela está sendo interpolada, e é isso que você está vendo de borrado.
    </p>
    <p class="note">
      A regra 1.4.12 do WCAG não pede que o texto já venha assim: pede que ele não quebre quando o leitor força
      entrelinha 1,5, entreletra 0,12em e entrepalavra 0,16em. Suba os três sliders até lá e veja se a coluna
      aguenta. Fonte pixel costuma melhorar com espaçamento, o que é a única coisa que a literatura sobre leitura
      e dislexia mostra de forma consistente.
    </p>
  </div>
</template>

<style scoped>
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

dt {
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

dd {
  margin: 0;
  color: var(--fg);
}

.note {
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}

.warn {
  margin: 0.7rem 0 0;
  padding-inline-start: 0.6rem;
  border-inline-start: 3px solid var(--brand-yellow);
  color: var(--fg);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
