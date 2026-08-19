<script setup lang="ts">
/**
 * Candidato 1: o título do post sobre um campo de caracteres animado, desenhado
 * pelo textmode.js em WebGL2.
 *
 * O texto é HTML de verdade por cima da tela, não é desenhado no canvas. Isso é
 * de propósito: o título continua selecionável, continua no DOM para o leitor de
 * tela e para o buscador, e o canvas fica `aria-hidden`. Se o WebGL falhar, o
 * título continua lá.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
// Os compartilhados continuam no laboratório vivo: ver o comentário em TmSolid.vue.
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const RAMPS: Record<string, string> = {
  blocos: ' ░▒▓█',
  pontos: ' .·:•',
  ansi: ' ─│┼╬',
  binario: ' 01',
  sinais: ' .-+=*#',
}

const PALETTE: Record<string, string> = {
  verde: '#45b384',
  azul: '#0578be',
  amarelo: '#f5b200',
  vermelho: '#e30613',
  fosforo: '#33ff33',
  ambar: '#ffb000',
}

// #000000: --bg do site no escuro, preto absoluto para o OLED apagar o pixel.
const BG = '#000000'

const MODE_OPTIONS = [
  { id: 'onda', name: 'onda concêntrica' },
  { id: 'chuva', name: 'chuva de coluna' },
  { id: 'ruido', name: 'ruído perlin' },
  { id: 'grade', name: 'grade cruzada' },
]

const RAMP_OPTIONS = [
  { id: 'blocos', name: '░ ▒ ▓ █' },
  { id: 'pontos', name: '. · : •' },
  { id: 'ansi', name: '─ │ ┼ ╬' },
  { id: 'binario', name: '0 1' },
  { id: 'sinais', name: '. - + = * #' },
]

const HUE_OPTIONS = [
  { id: 'verde', name: 'verde da marca' },
  { id: 'azul', name: 'azul da marca' },
  { id: 'amarelo', name: 'amarelo da marca' },
  { id: 'vermelho', name: 'vermelho da marca' },
  { id: 'fosforo', name: 'fósforo P1' },
  { id: 'ambar', name: 'âmbar P3' },
]

const ACCENT_OPTIONS = [
  { id: 'amarelo', name: 'amarelo' },
  { id: 'verde', name: 'verde' },
  { id: 'azul', name: 'azul' },
  { id: 'vermelho', name: 'vermelho' },
]

const FACE_OPTIONS = [
  { id: 'departure', name: 'Departure Mono' },
  { id: 'ibmvga', name: 'PxPlus IBM VGA' },
  { id: 'silkscreen', name: 'Silkscreen' },
  { id: 'pixelify', name: 'Pixelify Sans' },
  { id: 'jersey', name: 'Jersey 10' },
  { id: 'plex', name: 'IBM Plex Mono' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const cell = ref(14)
const speed = ref(60)
const density = ref(45)
const ramp = ref('blocos')
const mode = ref('onda')
const hue = ref('verde')
const accent = ref('amarelo')
const face = ref('departure')
const tracking = ref(4)
const frozen = ref(false)

const stacks: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  silkscreen: "'Silkscreen', sans-serif",
  pixelify: "'Pixelify Sans', sans-serif",
  jersey: "'Jersey 10', sans-serif",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
}

const canvas = ref<HTMLCanvasElement | null>(null)
const stage = ref<HTMLDivElement | null>(null)
const instance = shallowRef<any>(null)
const failed = ref('')

const fieldContrast = computed(() => ratio(parseHex(PALETTE[hue.value]), parseHex(BG)).toFixed(2))
// #e0dcd4: --fg do site no escuro.
const titleContrast = computed(() => ratio(parseHex('#e0dcd4'), parseHex(BG)).toFixed(2))
const accentContrast = computed(() => ratio(parseHex(PALETTE[accent.value]), parseHex(BG)).toFixed(2))

const decisionSettings = computed(() => [
  { label: 'movimento', value: labelFor(MODE_OPTIONS, mode.value) },
  { label: 'conjunto', value: labelFor(RAMP_OPTIONS, ramp.value) },
  { label: 'célula', value: `${cell.value}px` },
  { label: 'velocidade', value: `${speed.value}%` },
  { label: 'densidade', value: `${density.value}%` },
  { label: 'congelar', value: frozen.value ? 'sim' : 'não' },
  { label: 'campo', value: `${labelFor(HUE_OPTIONS, hue.value)} (${PALETTE[hue.value]})` },
  { label: 'palavra em destaque', value: `${labelFor(ACCENT_OPTIONS, accent.value)} (${PALETTE[accent.value]})` },
  { label: 'fonte do título', value: labelFor(FACE_OPTIONS, face.value) },
  { label: 'entreletra', value: `${tracking.value}/100em` },
])

const decisionContext = computed(
  () =>
    `Contraste sobre ${BG}: título ${titleContrast.value}:1, destaque ${accentContrast.value}:1, campo ${fieldContrast.value}:1 (decorativo, some atrás do texto).`,
)

function paint(tm: any) {
  const chars = RAMPS[ramp.value]
  const [r, g, b] = parseHex(PALETTE[hue.value])
  const t = frozen.value ? 120 : tm.frameCount * (speed.value / 1000)
  const cols = tm.grid.cols
  const rows = tm.grid.rows
  const cut = 1 - density.value / 100

  tm.background(0, 0, 0, 0)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col - cols / 2
      const y = row - rows / 2
      let value = 0
      if (mode.value === 'onda') {
        value = (Math.sin(Math.sqrt(x * x + y * y) * 0.35 - t * 3) + 1) / 2
      } else if (mode.value === 'chuva') {
        const seed = Math.sin(col * 12.9898) * 43758.5453
        value = ((seed - Math.floor(seed) + row / rows - t * 0.6) % 1 + 1) % 1
        value = value ** 3
      } else if (mode.value === 'ruido') {
        value = tm.noise(col * 0.12, row * 0.22, t * 0.4)
      } else {
        value = (Math.sin(col * 0.5 + t * 2) * Math.cos(row * 0.8 - t) + 1) / 2
      }

      if (value < cut) continue
      const step = (value - cut) / (1 - cut || 1)
      const glyph = chars[Math.min(chars.length - 1, Math.floor(step * chars.length))]
      if (glyph === ' ') continue

      tm.push()
      tm.translate(x, y, 0)
      tm.char(glyph)
      tm.charColor(r, g, b, 40 + step * 150)
      tm.point()
      tm.pop()
    }
  }
}

let stop: (() => void) | null = null

onMounted(async () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reduced.matches) frozen.value = true

  try {
    const { textmode } = await import('textmode.js')
    const element = canvas.value
    const box = stage.value
    if (!element || !box) return
    // A biblioteca usa um canvas externo como está, e um <canvas> sem atributos
    // mede 300×150: o primeiro quadro saía nesse tamanho e, com o loop parado,
    // ficava impresso no canto como uma cópia menor da cena. Medir antes de
    // criar faz o primeiro quadro já nascer no tamanho certo.
    const first = box.getBoundingClientRect()
    element.width = Math.round(first.width)
    element.height = Math.round(first.height)
    // Sem a tela de abertura, e o noLoop só depois do setup: congelar no meio
    // do fade do splash deixava a moldura dele impressa por cima da cena.
    const tm = textmode.create({ canvas: element, fontSize: cell.value, loadingScreen: { transition: 'none' } })
    instance.value = tm
    tm.draw(() => paint(tm))
    tm.setup(() => {
      if (!frozen.value) return
      tm.noLoop()
      tm.redraw(1)
    })

    const observer = new ResizeObserver(() => {
      const rect = box.getBoundingClientRect()
      tm.resizeCanvas(Math.round(rect.width), Math.round(rect.height))
      // Um redimensionamento com o loop parado compõe o quadro através de um
      // buffer da medida antiga e deixa uma cópia menor da cena impressa no
      // canto. Dois quadros extras assentam o pipeline.
      if (frozen.value) tm.redraw(2)
    })
    observer.observe(box)
    stop = () => {
      observer.disconnect()
      tm.destroy()
    }
  } catch (error) {
    failed.value = String(error)
  }
})

onBeforeUnmount(() => stop?.())

watch(cell, (size) => instance.value?.fontSize(size))
watch(frozen, (still) => {
  const tm = instance.value
  if (!tm) return
  if (!still) {
    tm.loop()
    return
  }
  tm.noLoop()
  tm.redraw(1)
})

watch([mode, ramp, density, hue, speed], () => frozen.value && instance.value?.redraw(1))
</script>

<template>
  <div :class="$style.demo">
    <div ref="stage" :class="$style.stage" :style="{ background: BG }">
      <canvas ref="canvas" aria-hidden="true"></canvas>
      <div :class="$style.text" :style="{ fontFamily: stacks[face], letterSpacing: `${tracking / 100}em` }">
        <p :class="$style.kicker">SEÇÃO 00 / TÍTULO</p>
        <p :class="$style.title">
          O que você vai <span :class="$style.accent" :style="{ color: PALETTE[accent] }">construir</span>?
        </p>
        <p :class="$style.deck">Cada post começa com um arquivo vazio.</p>
      </div>
    </div>
    <p v-if="failed" :class="$style.failed">WebGL2 não subiu: {{ failed }}</p>

    <Panel label="campo animado">
      <Pick v-model="mode" label="movimento" :options="MODE_OPTIONS" />
      <Pick v-model="ramp" label="conjunto" :options="RAMP_OPTIONS" />
      <Knob v-model="cell" label="célula" :min="6" :max="32" unit="px" />
      <Knob v-model="speed" label="velocidade" :min="0" :max="200" unit="%" />
      <Knob v-model="density" label="densidade" :min="0" :max="100" unit="%" />
      <Toggle v-model="frozen" label="congelar" />
    </Panel>

    <Panel label="cor e tipo">
      <Pick v-model="hue" label="campo" :options="HUE_OPTIONS" />
      <Pick v-model="accent" label="palavra em destaque" :options="ACCENT_OPTIONS" />
      <Pick v-model="face" label="fonte do título" :options="FACE_OPTIONS" />
      <Knob v-model="tracking" label="entreletra" :min="-2" :max="20" unit="/100em" />
    </Panel>

    <p :class="$style.readout">
      contraste sobre {{ BG }} · título {{ titleContrast }}:1 · destaque {{ accentContrast }}:1 · campo
      {{ fieldContrast }}:1 (decorativo, some atrás do texto)
    </p>

    <DecisionCopy
      lab="campo animado (título)"
      component="TmHeading.vue"
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
  position: relative;
  display: grid;
  place-items: center;
  min-block-size: 15rem;
  overflow: hidden;
}

.stage canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
}

.text {
  position: relative;
  padding: 1.5rem;
  /* #e0dcd4: --fg do site no escuro. */
  color: #e0dcd4;
  text-align: center;
}

.kicker {
  margin: 0 0 0.9rem;
  color: #9a9ea6;
  font-size: 0.68rem;
  letter-spacing: 0.22em;
}

.title {
  margin: 0;
  font-size: clamp(1.4rem, 5vw, 2.4rem);
  line-height: 1.15;
  text-wrap: balance;
}

.deck {
  margin: 0.9rem 0 0;
  color: #9a9ea6;
  font-size: 0.82rem;
}

.failed {
  margin: 0.5rem 0 0;
  color: var(--brand-red);
  font-size: 0.72rem;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
