<script setup lang="ts">
/**
 * A única animação constante do site inteiro é a marca no cabeçalho. Esta
 * bancada existe para escolher qual. Cinco candidatos, cada um respeitando
 * `prefers-reduced-motion`, com o nome acessível preso ao link (não ao texto
 * que some) e um jeito de parar o movimento, porque WCAG 2.2.2 cobra isso de
 * qualquer coisa que se mexa por mais de cinco segundos.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'

/**
 * MARCA PROVISÓRIA. A fonte real (o vetor da marca) não está acessível desta
 * máquina, então isto é o `public/favicon.svg` deste mesmo repo, copiado
 * retângulo por retângulo (mesmo viewBox 64x64, mesmas cinco formas, mesmas
 * cores da marca). Trocar pela arte definitiva é editar só este array.
 */
const MARK_RECTS = [
  { role: 'l', x: 0, y: 0, w: 14, h: 31 }, // L, haste vertical
  { role: 'l', x: 0, y: 31, w: 37, h: 15 }, // L, pé
  { role: 'green', x: 26, y: 5, w: 38, h: 14 }, // barra verde
  { role: 'yellow', x: 53, y: 31, w: 11, h: 15 }, // bloco amarelo
  { role: 'blue', x: 11, y: 59, w: 53, h: 5 }, // sublinhado azul
] as const

const ROLE_COLOR: Record<string, string> = {
  l: 'var(--brand-red)',
  green: 'var(--brand-green)',
  yellow: 'var(--brand-yellow)',
  blue: 'var(--brand-blue)',
}

/**
 * Mesma marca, rasterizada a mão numa grade 8x8 (uma célula por 8 unidades do
 * viewBox de 64), para o candidato "ramp de caracteres". Cada letra é a cor
 * majoritária daquela célula segundo os retângulos acima (limiar de ~20% de
 * área para contar, senão fica em branco); é uma aproximação grosseira e
 * assume-se isso: o bloco amarelo, que já é pequeno na marca real, encolhe
 * para uma faixa de duas células, e os vãos entre as formas viram uma coluna
 * ou linha em branco só, sem gradação.
 */
const MARK_GRID = ['RR.GGGGG', 'RR.GGGGG', 'RR.GGGGG', 'RR......', 'RRRRR.YY', 'RRRRR.YY', '........', '.BBBBBBB']
const GRID_ROLE: Record<string, string> = { R: 'l', G: 'green', Y: 'yellow', B: 'blue' }

/** Pequeno conjunto de blocos e símbolos, o mesmo espírito do scramble do textmode.js. */
const SCRAMBLE_RAMP = ['▓', '▒', '░', '▚', '▞', '▪', '▫']

function randomGlyph(): string {
  return SCRAMBLE_RAMP[Math.floor(Math.random() * SCRAMBLE_RAMP.length)]
}

const CANDIDATES = [
  { id: 'ciclo', name: 'ciclo de cor nos acentos' },
  { id: 'varredura', name: 'varredura de brilho' },
  { id: 'ramp', name: 'ramp de caracteres' },
  { id: 'traco', name: 'traço em sequência' },
  { id: 'pulso', name: 'pulso dos acentos' },
] as const
type CandidateId = (typeof CANDIDATES)[number]['id']

function labelFor(id: string): string {
  return CANDIDATES.find((candidate) => candidate.id === id)?.name ?? id
}

const candidate = ref<CandidateId>('ciclo')
const cycleSeconds = ref(3.4)
const sweepWidth = ref(12)
const shuffleFrames = ref(6)
const staggerMs = ref(160)
const minOpacityPct = ref(35)
const manualPause = ref(false)
const simulateReduced = ref(false)
const delaySeconds = ref(5)

const osReduced = ref(false)
let mediaQuery: MediaQueryList | null = null
function syncOsReduced(event: MediaQueryListEvent | MediaQueryList) {
  osReduced.value = event.matches
}

const reducedMotionActive = computed(() => osReduced.value || simulateReduced.value)
const animationsFrozen = computed(() => reducedMotionActive.value || manualPause.value)

const markStyle = computed(() => ({
  '--cycle-dur': `${cycleSeconds.value}s`,
  '--stagger': `${staggerMs.value}ms`,
  '--min-opacity': String(minOpacityPct.value / 100),
}))

// --- candidato "ramp de caracteres": rajadas periódicas de embaralhar ---
const burstActive = ref(false)
const burstFrame = ref(0)
let burstTimer: ReturnType<typeof setInterval> | null = null
let cycleTimer: ReturnType<typeof setInterval> | null = null

function stopShuffleTimers() {
  if (burstTimer) clearInterval(burstTimer)
  if (cycleTimer) clearInterval(cycleTimer)
  burstTimer = null
  cycleTimer = null
  burstActive.value = false
  burstFrame.value = 0
}

function runBurst() {
  burstActive.value = true
  burstFrame.value = 0
  if (burstTimer) clearInterval(burstTimer)
  burstTimer = setInterval(() => {
    burstFrame.value++
    if (burstFrame.value >= shuffleFrames.value) {
      if (burstTimer) clearInterval(burstTimer)
      burstTimer = null
      burstActive.value = false
    }
  }, 55)
}

function startShuffleLoop() {
  stopShuffleTimers()
  cycleTimer = setInterval(() => {
    if (animationsFrozen.value || candidate.value !== 'ramp') return
    runBurst()
  }, cycleSeconds.value * 1000)
}

function glyphAt(row: number, col: number): string {
  if (!burstActive.value) return '█'
  const seed = row * 8 + col + burstFrame.value * 13
  return SCRAMBLE_RAMP[seed % SCRAMBLE_RAMP.length]
}

watch([candidate, cycleSeconds], startShuffleLoop)
watch(animationsFrozen, (frozen) => {
  if (frozen) stopShuffleTimers()
})

// --- o wordmark "Lucas Santos": some sozinho, some para dentro da marca ---
const WORD = 'Lucas Santos'
const letters = ref<string[]>([...WORD])
const wordCollapsed = ref(false)
let scrambleTimer: ReturnType<typeof setInterval> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function stopWordTimers() {
  if (scrambleTimer) clearInterval(scrambleTimer)
  if (hideTimer) clearTimeout(hideTimer)
  scrambleTimer = null
  hideTimer = null
}

function collapseWord() {
  wordCollapsed.value = true
  let ticks = 0
  const maxTicks = 7
  scrambleTimer = setInterval(() => {
    ticks++
    letters.value = letters.value.map((ch) => (ch === ' ' ? ' ' : randomGlyph()))
    if (ticks >= maxTicks && scrambleTimer) {
      clearInterval(scrambleTimer)
      scrambleTimer = null
    }
  }, 55)
}

function scheduleCollapse() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(collapseWord, delaySeconds.value * 1000)
}

function replay() {
  if (reducedMotionActive.value) return
  stopWordTimers()
  letters.value = [...WORD]
  wordCollapsed.value = false
  scheduleCollapse()
}

watch(delaySeconds, () => {
  if (!wordCollapsed.value && !reducedMotionActive.value) scheduleCollapse()
})

watch(reducedMotionActive, (isReduced) => {
  if (isReduced) {
    stopWordTimers()
    letters.value = [...WORD]
    wordCollapsed.value = false
  } else if (!hideTimer) {
    scheduleCollapse()
  }
})

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = mediaQuery.matches
  mediaQuery.addEventListener('change', syncOsReduced)
  if (!reducedMotionActive.value) scheduleCollapse()
  startShuffleLoop()
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncOsReduced)
  stopWordTimers()
  stopShuffleTimers()
})

const decisionSettings = computed(() => {
  const settings = [
    { label: 'candidato', value: labelFor(candidate.value) },
    { label: 'velocidade do ciclo', value: `${cycleSeconds.value}s` },
    { label: 'atraso do wordmark', value: `${delaySeconds.value}s` },
  ]
  if (candidate.value === 'varredura') settings.push({ label: 'largura do feixe', value: `${sweepWidth.value}/64` })
  if (candidate.value === 'ramp') settings.push({ label: 'quadros de embaralhar', value: String(shuffleFrames.value) })
  if (candidate.value === 'traco') settings.push({ label: 'espaçamento entre acentos', value: `${staggerMs.value}ms` })
  if (candidate.value === 'pulso') settings.push({ label: 'opacidade mínima', value: `${minOpacityPct.value}%` })
  return settings
})

const decisionContext =
  'prefers-reduced-motion trava tudo num estado de repouso, com o wordmark simplesmente parado. ' +
  'O nome acessível vem de aria-label no link, não do texto que some. O botão de pausa desta bancada ' +
  'é provisório: no cabeçalho de verdade ele precisa estar preso à preferência de desligar animação do ' +
  'leitor, que ainda não existe.'
</script>

<template>
  <div :class="$style.demo">
    <p :class="$style.stageLabel">cabeçalho em tamanho real</p>
    <div :class="$style.stage">
      <a href="#" aria-label="Lucas Santos" :class="$style.brand" @click.prevent>
        <span :class="[$style.markBox, animationsFrozen && $style.frozen]" :style="markStyle" aria-hidden="true">
          <svg v-if="candidate !== 'ramp'" viewBox="0 0 64 64" :class="$style.svg">
            <rect
              v-for="(rect, index) in MARK_RECTS"
              :key="index"
              :x="rect.x"
              :y="rect.y"
              :width="rect.w"
              :height="rect.h"
              :fill="ROLE_COLOR[rect.role]"
              :class="[
                $style.part,
                rect.role !== 'l' && $style[`part-${rect.role}`],
                rect.role !== 'l' && $style[`anim-${candidate}`],
              ]"
              :style="candidate === 'traco' && rect.role !== 'l' ? { animationDelay: `calc(var(--stagger) * ${index - 2})` } : undefined"
            />
            <rect
              v-if="candidate === 'varredura'"
              :x="-sweepWidth"
              y="0"
              :width="sweepWidth"
              height="64"
              :class="$style.sweep"
            />
          </svg>
          <div v-else :class="$style.grid">
            <template v-for="(row, r) in MARK_GRID" :key="r">
              <span
                v-for="(cell, c) in row.split('')"
                :key="c"
                :class="$style.cell"
                :style="{ color: cell === '.' ? 'transparent' : ROLE_COLOR[GRID_ROLE[cell]] }"
                >{{ cell === '.' ? '' : GRID_ROLE[cell] === 'l' ? '█' : glyphAt(r, c) }}</span
              >
            </template>
          </div>
        </span>
        <span :class="[$style.word, wordCollapsed && $style.collapsed]" aria-hidden="true">
          <span v-for="(ch, i) in letters" :key="i">{{ ch === ' ' ? ' ' : ch }}</span>
        </span>
      </a>
    </div>

    <Panel label="candidato">
      <Pick v-model="candidate" label="candidato" :options="CANDIDATES.map((c) => ({ id: c.id, name: c.name }))" />
      <Knob v-model="cycleSeconds" label="velocidade do ciclo" :min="0.8" :max="8" :step="0.2" unit="s" />
      <Knob v-if="candidate === 'varredura'" v-model="sweepWidth" label="largura do feixe" :min="4" :max="28" unit="/64" />
      <Knob v-if="candidate === 'ramp'" v-model="shuffleFrames" label="quadros de embaralhar" :min="2" :max="14" />
      <Knob v-if="candidate === 'traco'" v-model="staggerMs" label="espaçamento entre acentos" :min="40" :max="500" :step="10" unit="ms" />
      <Knob v-if="candidate === 'pulso'" v-model="minOpacityPct" label="opacidade mínima" :min="0" :max="90" unit="%" />
      <Toggle v-model="manualPause" label="pausar animação (WCAG 2.2.2)" />
    </Panel>

    <Panel label="wordmark">
      <Knob v-model="delaySeconds" label="atraso antes de sumir" :min="1" :max="10" :step="0.5" unit="s" />
      <button type="button" :class="$style.replay" :disabled="reducedMotionActive" @click="replay">
        repetir agora
      </button>
      <Toggle v-model="simulateReduced" label="simular prefers-reduced-motion" />
    </Panel>

    <p :class="$style.readout">
      {{ reducedMotionActive ? 'Movimento reduzido: a marca está parada e o wordmark não some.' : 'Movimento ligado.' }}
      O nome acessível ("Lucas Santos") está no <code>aria-label</code> do link, então sobrevive ao texto sumindo:
      a marca e o wordmark visual estão marcados <code>aria-hidden</code>. O botão de pausa aqui é o WCAG 2.2.2
      pedindo um jeito de parar; no cabeçalho de verdade ele ainda precisa ser ligado à preferência de animação do
      leitor, que está planejada e não existe ainda.
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

.brand {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  color: var(--fg);
  font-family: var(--font-display);
  font-size: 1.15rem;
  text-decoration: none;
}

.brand:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.markBox {
  --mark-size: 1.5em;
  display: inline-block;
  inline-size: var(--mark-size);
  block-size: var(--mark-size);
  flex-shrink: 0;
}

.svg {
  inline-size: 100%;
  block-size: 100%;
  overflow: hidden;
}

.grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  inline-size: 100%;
  block-size: 100%;
  font-size: calc(var(--mark-size) / 7);
  line-height: 1;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sweep {
  fill: white;
  opacity: 0.45;
  mix-blend-mode: overlay;
  animation: sweep var(--cycle-dur) linear infinite;
}

.frozen .sweep {
  animation: none !important;
  opacity: 0;
}

.frozen .part {
  animation: none !important;
  opacity: 1 !important;
  filter: none !important;
  clip-path: none !important;
}

@keyframes sweep {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(84px);
  }
}

.anim-ciclo.part-green {
  --c1: var(--brand-green);
  --c2: var(--brand-yellow);
  --c3: var(--brand-blue);
  animation: colorCycle var(--cycle-dur) linear infinite;
}

.anim-ciclo.part-yellow {
  --c1: var(--brand-yellow);
  --c2: var(--brand-blue);
  --c3: var(--brand-green);
  animation: colorCycle var(--cycle-dur) linear infinite;
  animation-delay: calc(var(--cycle-dur) / -3);
}

.anim-ciclo.part-blue {
  --c1: var(--brand-blue);
  --c2: var(--brand-green);
  --c3: var(--brand-yellow);
  animation: colorCycle var(--cycle-dur) linear infinite;
  animation-delay: calc(var(--cycle-dur) / -3 * 2);
}

@keyframes colorCycle {
  0%,
  100% {
    fill: var(--c1);
  }
  33% {
    fill: var(--c2);
  }
  66% {
    fill: var(--c3);
  }
}

.anim-traco {
  animation: drawIn var(--cycle-dur) ease-in-out infinite;
}

@keyframes drawIn {
  0% {
    clip-path: inset(0 100% 0 0);
  }
  35%,
  60% {
    clip-path: inset(0 0 0 0);
  }
  100% {
    clip-path: inset(0 100% 0 0);
  }
}

.anim-pulso {
  animation: pulse var(--cycle-dur) ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: var(--min-opacity);
  }
}

.word {
  display: inline-flex;
  max-inline-size: 14ch;
  overflow: hidden;
  white-space: nowrap;
  opacity: 1;
  filter: blur(0);
  transform: translateX(0) scale(1);
  transform-origin: left center;
  transition:
    max-inline-size 0.55s ease-in,
    opacity 0.5s ease-in,
    transform 0.55s ease-in,
    filter 0.5s ease-in;
}

.word.collapsed {
  max-inline-size: 0;
  opacity: 0;
  transform: translateX(-0.8em) scale(0.4);
  filter: blur(3px);
}

@media (prefers-reduced-motion: reduce) {
  .part,
  .sweep {
    animation: none !important;
  }
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
