<script setup lang="ts">
/**
 * A marca, redesenhada depois do retorno do dono: os cinco candidatos
 * antigos coloriam ou recortavam os mesmos cinco retângulos do favicon, e por
 * isso liam como uma imagem. Os seis daqui desenham a mesma silhueta (ver
 * `logoMarks.ts`) inteira em caractere e célula: contorno vetorial, grade de
 * `+`, malha ciano, retrato em ramp, dither de dois tons, pixel glitched.
 *
 * O movimento também mudou de lugar. Os candidatos antigos giravam cor nos
 * acentos (ciclo, varredura, traço, pulso) porque a marca em si era a única
 * animação constante do site. Uma marca desenhada como wireframe ou lattice
 * não pede esse tipo de giro de cor, ele brigaria com o próprio desenho; o
 * lugar do movimento baixo e constante passou para o wordmark ao lado, que
 * agora digita e apaga como um terminal em vez de sumir com um fade.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { composite, grade, parseHex, ratio } from './contrast'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import { labelForMark, MARK_CANDIDATES, type MarkCandidateId } from './logoMarks'
import LogoMark from './LogoMark.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'

/**
 * Hex espelhando os tokens do site em modo escuro (`src/styles/theme.css`),
 * só para a matemática de contraste: o desenho de verdade usa `var(--fg)` etc,
 * isto existe porque `parseHex()` precisa de um hex de verdade para calcular.
 */
const BG_DARK = '#000000'
const FG_DARK = '#f3f1ee'
const MUTED_DARK = '#a8a29a'
const ACCENT_DARK = '#7cc0ff'
const RED_DARK = '#e6242f'
const BLUE_DARK = '#1480c2'

const markCandidate = ref<MarkCandidateId>('fio')

const inkContrast = computed<{ label: string; num: number }>(() => {
  if (markCandidate.value === 'mesh') {
    const tintedGround = composite(parseHex(BLUE_DARK), parseHex(BG_DARK), 0.35)
    return { label: 'malha (var(--accent)) sobre o fundo azulado', num: ratio(parseHex(ACCENT_DARK), tintedGround) }
  }
  if (markCandidate.value === 'lattice' || markCandidate.value === 'glitch') {
    return { label: 'cor mais fraca da marca (vermelho)', num: ratio(parseHex(RED_DARK), parseHex(BG_DARK)) }
  }
  if (markCandidate.value === 'dither') {
    return { label: 'tom mais fraco do dither (var(--muted))', num: ratio(parseHex(MUTED_DARK), parseHex(BG_DARK)) }
  }
  return { label: 'traço (var(--fg))', num: ratio(parseHex(FG_DARK), parseHex(BG_DARK)) }
})

// --- o wordmark: digita, para, apaga com backspace, para vazio, repete ---
const WORD = 'Lucas Santos'
const CHAR_MS = ref(90)
const HOLD_SECONDS = ref(1.6)
const visibleCount = ref(0)

let stepTimer: ReturnType<typeof setInterval> | null = null
let holdTimer: ReturnType<typeof setTimeout> | null = null

function clearStepTimer(): void {
  if (stepTimer) clearInterval(stepTimer)
  stepTimer = null
}

function clearHoldTimer(): void {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = null
}

function eraseBackward(): void {
  clearStepTimer()
  clearHoldTimer()
  stepTimer = setInterval(() => {
    visibleCount.value--
    if (visibleCount.value <= 0) {
      visibleCount.value = 0
      clearStepTimer()
      holdTimer = setTimeout(typeForward, HOLD_SECONDS.value * 500)
    }
  }, CHAR_MS.value)
}

function typeForward(): void {
  clearStepTimer()
  clearHoldTimer()
  stepTimer = setInterval(() => {
    visibleCount.value++
    if (visibleCount.value >= WORD.length) {
      clearStepTimer()
      holdTimer = setTimeout(eraseBackward, HOLD_SECONDS.value * 1000)
    }
  }, CHAR_MS.value)
}

function stopWordLoop(): void {
  clearStepTimer()
  clearHoldTimer()
  visibleCount.value = WORD.length // quadro estático do prefers-reduced-motion: o nome inteiro, parado
}

function replay(): void {
  if (animationsFrozen.value) return
  clearGlitch()
  visibleCount.value = 0
  typeForward()
  scheduleGlitch()
}

// --- cursor de bloco, baixa taxa de quadro, sem suavização ---
/**
 * 530ms por fase (sem easing, alternando de uma vez): o dobro dos 228,6ms do
 * cursor do menu do Doom (8 tics a 35 tics/s, docs/theming.md seção 3), porque
 * o mesmo trecho registra que um cursor de terminal pisca mais devagar que um
 * menu de jogo. É o mesmo número que o candidato "linha de DOS invertida" já
 * usa em `ChromeHeader.vue` (`1.06s steps(2, end)`), só que aqui dirigido por
 * `setInterval` para poder parar de vez sob `prefers-reduced-motion`.
 */
const CURSOR_MS = 530
const cursorOn = ref(true)
let cursorTimer: ReturnType<typeof setInterval> | null = null

function startCursor(): void {
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = setInterval(() => {
    cursorOn.value = !cursorOn.value
  }, CURSOR_MS)
}

function stopCursor(): void {
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = null
  cursorOn.value = true
}

// --- glitch: um caractere errado, um deslocamento de linha ou um rasgo de coluna, nunca os três juntos ---
const GLITCH_GLYPHS = ['#', '%', '&', '$', '@', '?', '~']
const glitchIndex = ref<number | null>(null)
const glitchGlyph = ref('')
const lineShift = ref(0)
const tearActive = ref(false)
const tearColumn = ref(0)
let glitchTimer: ReturnType<typeof setTimeout> | null = null
let glitchResetTimer: ReturnType<typeof setTimeout> | null = null

function clearGlitch(): void {
  if (glitchTimer) clearTimeout(glitchTimer)
  if (glitchResetTimer) clearTimeout(glitchResetTimer)
  glitchTimer = null
  glitchResetTimer = null
  glitchIndex.value = null
  lineShift.value = 0
  tearActive.value = false
}

function scheduleGlitch(): void {
  if (glitchTimer) clearTimeout(glitchTimer)
  glitchTimer = setTimeout(runGlitch, 2200 + Math.random() * 1800)
}

/**
 * Cada disparo troca no máximo uma letra, ou desloca a linha inteira em 1ch,
 * ou rasga uma coluna em 1px: uma área de uma única célula de caractere, bem
 * menor que a isenção de área da WCAG 2.3.1, e uma frequência de menos de
 * meia troca por segundo, bem abaixo do limite de três da mesma regra.
 * `Math.random()` aqui é decoração de execução (quando e qual glitch), não a
 * semente determinística que a capa do site exige.
 */
function runGlitch(): void {
  if (animationsFrozen.value || visibleCount.value === 0) {
    scheduleGlitch()
    return
  }
  const kind = Math.floor(Math.random() * 3)
  if (kind === 0) {
    glitchIndex.value = Math.floor(Math.random() * visibleCount.value)
    glitchGlyph.value = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]
  } else if (kind === 1) {
    lineShift.value = Math.random() < 0.5 ? -1 : 1
  } else {
    tearColumn.value = Math.floor(Math.random() * visibleCount.value)
    tearActive.value = true
  }
  glitchResetTimer = setTimeout(() => {
    glitchIndex.value = null
    lineShift.value = 0
    tearActive.value = false
    scheduleGlitch()
  }, 180)
}

// --- prefers-reduced-motion e pausa manual: a mesma regra forte do resto da bancada ---
const manualPause = ref(false)
const simulateReduced = ref(false)
const osReduced = ref(false)
let mediaQuery: MediaQueryList | null = null

function syncOsReduced(event: MediaQueryListEvent | MediaQueryList): void {
  osReduced.value = event.matches
}

const reducedMotionActive = computed(() => osReduced.value || simulateReduced.value)
const animationsFrozen = computed(() => reducedMotionActive.value || manualPause.value)

watch(animationsFrozen, (frozen) => {
  if (frozen) {
    stopWordLoop()
    stopCursor()
    clearGlitch()
  } else {
    visibleCount.value = 0
    typeForward()
    startCursor()
    scheduleGlitch()
  }
})

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = mediaQuery.matches
  mediaQuery.addEventListener('change', syncOsReduced)
  if (animationsFrozen.value) {
    stopWordLoop()
  } else {
    typeForward()
    startCursor()
    scheduleGlitch()
  }
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncOsReduced)
  clearStepTimer()
  clearHoldTimer()
  stopCursor()
  clearGlitch()
})

const decisionSettings = computed(() => [
  { label: 'marca', value: labelForMark(markCandidate.value) },
  { label: 'velocidade da digitação', value: `${CHAR_MS.value}ms/caractere` },
  { label: 'repouso antes de apagar', value: `${HOLD_SECONDS.value}s` },
  { label: 'taxa do cursor', value: `${CURSOR_MS}ms por fase, fixo (mesmo número do candidato DOS em ChromeHeader.vue)` },
  { label: `contraste (${inkContrast.value.label})`, value: `${inkContrast.value.num.toFixed(2)}:1 (${grade(inkContrast.value.num)})` },
])

const decisionContext =
  'prefers-reduced-motion trava num quadro estático (o nome inteiro, parado) e o laço nunca começa, a mesma regra ' +
  'forte do resto da bancada. O botão de pausa cobre WCAG 2.2.2. O nome acessível ("Lucas Santos") mora no ' +
  'aria-label do link, nunca no texto que digita e apaga; a marca e o wordmark visual são aria-hidden. Nenhuma ' +
  'transição usa opacidade, desfoque ou escala: isso foi removido de propósito, porque o dono pediu backspace no ' +
  'lugar de fade. O glitch troca no máximo uma letra, ou desloca a linha em 1ch, ou rasga uma coluna em 1px, a cada ' +
  '2,2 a 4 segundos, uma área de uma célula de caractere por vez, bem abaixo do limite de três trocas por segundo ' +
  'e da isenção de área da WCAG 2.3.1.'
</script>

<template>
  <div :class="$style.demo">
    <p :class="$style.stageLabel">
      a marca dentro de um cabeçalho de verdade (linha de DOS invertida, o candidato que o dono já pediu para manter)
    </p>
    <div :class="$style.stage">
      <header :class="$style.miniHeader">
        <span :class="$style.miniBadge">C:\LSANTOS&gt;</span>
        <a href="#" aria-label="Lucas Santos" :class="$style.brand" @click.prevent>
          <LogoMark :candidate="markCandidate" size="1.5em" />
          <span :class="$style.word" aria-hidden="true" :style="{ transform: `translateX(${lineShift}ch)` }">
            <span
              v-for="(ch, i) in WORD.split('')"
              :key="i"
              :class="[$style.letter, tearActive && i >= tearColumn && $style.torn]"
              >{{ i < visibleCount ? (i === glitchIndex ? glitchGlyph : ch) : '' }}</span
            >
            <span :class="[$style.cursor, cursorOn && $style.cursorOn]"></span>
          </span>
        </a>
        <nav :class="$style.miniNav" aria-hidden="true">
          <span :class="$style.navItem">posts</span>
          <span :class="$style.navItem">séries</span>
        </nav>
      </header>
    </div>

    <Panel label="marca">
      <Pick v-model="markCandidate" label="candidato" :options="MARK_CANDIDATES.map((c) => ({ id: c.id, name: c.name }))" />
      <Toggle v-model="manualPause" label="pausar animação (WCAG 2.2.2)" />
    </Panel>

    <Panel label="wordmark">
      <Knob v-model="CHAR_MS" label="velocidade da digitação" :min="40" :max="220" :step="10" unit="ms" />
      <Knob v-model="HOLD_SECONDS" label="repouso antes de apagar" :min="0.5" :max="4" :step="0.1" unit="s" />
      <button type="button" :class="$style.replay" :disabled="animationsFrozen" @click="replay">digitar de novo</button>
      <Toggle v-model="simulateReduced" label="simular prefers-reduced-motion" />
    </Panel>

    <p :class="$style.readout">
      {{
        reducedMotionActive
          ? 'Movimento reduzido: o nome fica parado por extenso, e o laço nunca começa.'
          : manualPause
            ? 'Pausado.'
            : 'Rodando.'
      }}
      Contraste do candidato "{{ labelForMark(markCandidate) }}": {{ inkContrast.num.toFixed(2) }}:1 ({{ grade(inkContrast.num) }}),
      medido contra o fundo escuro do site. O nome acessível ("Lucas Santos") mora no <code>aria-label</code> do
      link, não no texto que digita e apaga: a marca e o wordmark visual estão <code>aria-hidden</code>. O cursor
      pisca a cada {{ CURSOR_MS }}ms por fase, sem suavização, o dobro da taxa do menu do Doom (228,6ms), porque um
      terminal pisca mais devagar que um jogo. O glitch troca no máximo uma letra por vez, desloca a linha inteira
      em 1ch, ou rasga uma coluna em 1px, a cada 2,2 a 4 segundos: bem abaixo do limite de três trocas por segundo
      da WCAG 2.3.1, numa área de uma única célula de caractere.
    </p>

    <DecisionCopy lab="logo" component="LogoLab.vue" :settings="decisionSettings" :context="decisionContext" />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.stageLabel {
  margin: 0 0 0.4rem;
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stage {
  display: flex;
  padding: 1.6rem 1.2rem;
  background: light-dark(#f4efe0, #000000);
  overflow-x: auto;
}

.miniHeader {
  display: flex;
  align-items: center;
  inline-size: 100%;
  font-size: 0.85rem;
  white-space: nowrap;
}

.miniBadge {
  margin-inline-end: 0.7rem;
  padding: 0.15rem 0.45rem;
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
}

.brand {
  display: inline-flex;
  align-items: center;
  color: var(--fg);
  font-family: var(--font-display);
  font-size: 1.05rem;
  text-decoration: none;
}

.brand:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.word {
  position: relative;
  display: inline-flex;
  min-inline-size: 9ch;
  margin-inline-start: 0.55rem;
}

.letter {
  display: inline-block;
}

.torn {
  transform: translateY(1px);
}

.cursor {
  display: inline-block;
  inline-size: 0.55em;
  block-size: 1.1em;
  margin-inline-start: 1px;
  background: transparent;
  vertical-align: text-bottom;
}

.cursor.cursorOn {
  background: var(--fg);
}

.miniNav {
  display: inline-flex;
  margin-inline-start: auto;
  color: var(--muted);
  font-size: 0.78rem;
}

.navItem:not(:first-child) {
  margin-inline-start: 0.8rem;
}

.replay {
  justify-self: start;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: transparent;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.replay:hover:not(:disabled),
.replay:focus-visible {
  background: #ffffff12;
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.replay:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
