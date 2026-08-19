<script setup lang="ts">
/**
 * A decisão mais cara do redesenho, agora fechada: Literata no corpo, Atkinson
 * Hyperlegible como a opção sem serifa, cada uma com as medidas desta bancada.
 * Este componente não tem amostra própria: ele é só os controles.
 *
 * O que muda quando você mexe num knob é o post de verdade que fica logo
 * abaixo desta bancada, `#lab-post`, o mesmo texto que passa pelo remark e
 * pelo rehype de qualquer post do blog. Escolher fonte olhando quatro
 * parágrafos limpos escondia citação, bloco de código, nota de rodapé: tudo
 * que um post carrega e que decide se a fonte aguenta ou não.
 */
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { BODY_FACE_OPTIONS, faceById } from './faces'
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

const face = ref('literata')
const size = ref(18)
const leading = ref(163)
const tracking = ref(5)
const words = ref(15)
const measure = ref(68)
const theme = ref<keyof typeof THEMES>('escuro')
const crisp = ref(false)

const chosen = computed(() => faceById(face.value))
const colours = computed(() => THEMES[theme.value])
const contrast = computed(() => ratio(parseHex(colours.value.fg), parseHex(colours.value.bg)))
const mutedContrast = computed(() => ratio(parseHex(colours.value.muted), parseHex(colours.value.bg)))

// As duas foram escolhidas com medidas diferentes, e comparar as duas com as
// medidas de uma só é comparar errado: a Atkinson a 18px parece menor que a
// Literata a 18px. Trocar a fonte traz as medidas dela junto, que são as mesmas
// que o site aplica em src/styles/theme.css.
watch(face, (id) => {
  const { metrics } = faceById(id)
  size.value = metrics.size
  leading.value = metrics.leading
  tracking.value = metrics.tracking
  words.value = metrics.words
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

/** O que é aplicado no post de verdade, não numa amostra local. */
const targetStyle = computed(() => ({
  fontFamily: chosen.value.stack,
  fontSize: `${size.value}px`,
  lineHeight: String(leading.value / 100),
  letterSpacing: `${tracking.value / 100}em`,
  wordSpacing: `${words.value / 100}em`,
  maxInlineSize: `${measure.value}ch`,
  color: colours.value.fg,
  background: colours.value.bg,
  ...(crisp.value
    ? { WebkitFontSmoothing: 'none', fontSmooth: 'never', filter: 'contrast(100.00001%)' }
    : {}),
}))

function toStyleText(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([prop, value]) => `${prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value}`)
    .join('; ')
}

// Nada aqui toca o DOM antes de montar, e nada fica aplicado depois que este
// componente sai da página: o estilo original do post é guardado e devolvido
// no unmount. Sem o elemento (uma página que renderiza o espécime sozinho,
// sem o post abaixo), o watchEffect nunca é criado e nada quebra.
let target: HTMLElement | null = null
let baseStyleText = ''
let stopApplying: (() => void) | null = null

onMounted(() => {
  target = document.getElementById('lab-post')
  if (!target) return
  baseStyleText = target.getAttribute('style') ?? ''
  stopApplying = watchEffect(() => {
    if (!target) return
    const extra = toStyleText(targetStyle.value)
    target.setAttribute('style', baseStyleText ? `${baseStyleText}; ${extra}` : extra)
  })
})

onUnmounted(() => {
  stopApplying?.()
  if (!target) return
  if (baseStyleText) target.setAttribute('style', baseStyleText)
  else target.removeAttribute('style')
})
</script>

<template>
  <div :class="$style.demo">
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

.readout {
  margin: 0 0 0.9rem;
  padding-inline-start: 0.6rem;
  border-inline-start: 3px solid var(--accent);
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.6;
}

.readout code {
  color: var(--fg);
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

/*
 * Nada aqui pode tocar na cor de um `strong`. O negrito dentro de um post é um
 * chip de fundo amarelo com tinta escura, os dois vindos do theme.css, e trocar
 * a cor mantinha o amarelo e punha a tinta clara da página em cima, o que dava
 * 1,37:1. Vale em dobro agora que o post de verdade renderiza dentro do painel.
 */
</style>
