<script setup lang="ts">
/**
 * Os efeitos de tubo, cada um com a conta do que custa.
 *
 * Tudo aqui começa em zero de propósito. A pergunta não é "quanto de scanline",
 * é "scanline serve para alguma coisa". Suba o slider e olhe o número do
 * contraste ao lado: ele cai enquanto você arrasta, e é a mesma queda que o
 * leitor sente sem saber nomear.
 *
 * Não existe curvatura de tela aqui, e não vai existir.
 */
import { computed, onMounted, ref } from 'vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { PARAGRAPHS } from './copy'
import { composite, grade, parseHex, ratio } from './contrast'
import './fonts.css'

const SKINS: Record<string, { name: string; bg: string; fg: string }> = {
  site: { name: 'o escuro do site', bg: '#14161a', fg: '#e6e4e0' },
  preto: { name: 'preto absoluto', bg: '#000000', fg: '#e8e8e8' },
  fosforo: { name: 'fósforo P39', bg: '#000000', fg: '#20c20e' },
  ambar: { name: 'âmbar', bg: '#000000', fg: '#ffb000' },
  claro: { name: 'claro do site', bg: '#fffdf9', fg: '#1a1c20' },
}

const skin = ref('site')
const scanlines = ref(0)
const pitch = ref(3)
const glow = ref(0)
const noise = ref(0)
const vignette = ref(0)
const flicker = ref(false)
const reduced = ref(false)

const colours = computed(() => SKINS[skin.value])

const baseRatio = computed(() => ratio(parseHex(colours.value.fg), parseHex(colours.value.bg)))

/** A linha escura da scanline é preto sobre tudo, texto incluído. É essa a pior linha. */
const effectiveRatio = computed(() => {
  const alpha = scanlines.value / 100
  const fg = composite([0, 0, 0], parseHex(colours.value.fg), alpha)
  const bg = composite([0, 0, 0], parseHex(colours.value.bg), alpha)
  return ratio(fg, bg)
})

const lost = computed(() => baseRatio.value - effectiveRatio.value)

const scanStyle = computed(() => ({
  backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,${scanlines.value / 100}) 0 1px, transparent 1px ${pitch.value}px)`,
}))

const vignetteStyle = computed(() => ({
  background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignette.value / 100}) 100%)`,
}))

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) flicker.value = false
})
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: colours.bg }">
      <div
        :class="[$style.copy, { [$style.flickering]: flicker && !reduced }]"
        :style="{
          color: colours.fg,
          textShadow: glow ? `0 0 ${glow / 8}em currentColor` : 'none',
        }"
      >
        <p v-for="paragraph in PARAGRAPHS.slice(0, 2)" :key="paragraph">{{ paragraph }}</p>
      </div>

      <svg v-if="noise" :class="$style.grain" :style="{ opacity: noise / 100 }" aria-hidden="true">
        <filter id="theme-lab-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#theme-lab-grain)" />
      </svg>
      <div v-if="vignette" :class="$style.layer" :style="vignetteStyle" aria-hidden="true"></div>
      <div v-if="scanlines" :class="$style.layer" :style="scanStyle" aria-hidden="true"></div>
    </div>

    <Panel label="efeitos, todos começando em zero">
      <Pick
        v-model="skin"
        label="fundo"
        :options="Object.entries(SKINS).map(([id, value]) => ({ id, name: value.name }))"
      />
      <Knob v-model="scanlines" label="scanline" :min="0" :max="50" unit="%" />
      <Knob v-model="pitch" label="passo da scanline" :min="2" :max="8" unit="px" />
      <Knob v-model="glow" label="brilho" :min="0" :max="80" unit="%" />
      <Knob v-model="noise" label="granulado" :min="0" :max="40" unit="%" />
      <Knob v-model="vignette" label="vinheta" :min="0" :max="70" unit="%" />
      <Toggle v-model="flicker" label="cintilação" />
    </Panel>

    <p :class="[$style.readout, { [$style.bad]: effectiveRatio < 4.5 }]">
      contraste sem efeito {{ baseRatio.toFixed(2) }}:1 · na linha escura da scanline
      {{ effectiveRatio.toFixed(2) }}:1 ({{ grade(effectiveRatio) }}) · custo {{ lost.toFixed(2) }}
    </p>
    <p :class="$style.note">
      Sobre preto absoluto o fundo não tem como escurecer mais, então a perda inteira cai no texto: 50% de
      scanline derruba âmbar sobre preto de 11,46:1 para 3,31:1, abaixo do mínimo de corpo de texto. A receita
      clássica de CSS usa 25%, o que dá 6,52:1. Um guia de 2026 recomenda 6%. A conclusão de bancada é que
      scanline só é segura numa faixa em que ela quase não aparece, e nessa faixa ela não está fazendo trabalho
      nenhum. É o argumento mais forte contra ela.
    </p>
    <p :class="$style.note">
      A cintilação é a única coisa desta página que pode disparar fotossensibilidade. O limite da norma é três
      mudanças por segundo; esta anima a 0,25 Hz, doze vezes abaixo. Ainda assim ela começa desligada e não liga
      para quem pediu <code>prefers-reduced-motion: reduce</code>.
    </p>
    <p :class="$style.note">
      O granulado é uma textura de <code>feTurbulence</code> desenhada pelo próprio navegador, sem imagem nenhuma
      no meio: um SVG inline, nada de arquivo, nada de <code>data:</code> URI. Isso importa porque a política de
      segurança do site é restritiva.
    </p>
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.stage {
  position: relative;
  padding: clamp(1rem, 4%, 1.8rem);
  overflow: hidden;
}

.copy {
  position: relative;
  z-index: 0;
  max-inline-size: 62ch;
  font-family: 'Departure Mono', ui-monospace, monospace;
  font-size: 0.95rem;
  line-height: 1.7;
}

.copy p {
  margin: 0 0 1em;
}

.copy p:last-child {
  margin-block-end: 0;
}

.layer,
.grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  inline-size: 100%;
  block-size: 100%;
  pointer-events: none;
}

.flickering {
  animation: crt-flicker 4s steps(2, end) infinite;
}

@keyframes crt-flicker {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0.93;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flickering {
    animation: none;
  }
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--fg);
  font-size: 0.72rem;
  line-height: 1.6;
}

.readout.bad {
  color: var(--brand-red);
}

.note {
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
