<script setup lang="ts">
/**
 * Candidato 2: a capa gerada. Mesma biblioteca, uso completamente diferente.
 *
 * Aqui o textmode.js não faz um fundo ambiente: ele monta um cartão. Pinta o
 * fundo da célula (`cellColor`), que é a técnica de gradiente por sombreado do
 * ANSI, e desenha uma moldura de caracteres de caixa em volta. Uma capa é um PNG
 * parado, então o padrão desta demonstração é congelado: a animação existe só
 * para você escolher o quadro.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const SHADES = ' ░▒▓█'
const FRAME = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' }

// ink #e0dcd4 e bg #000000 são --fg e --bg do site no escuro. O amarelo cheio é
// fundo claro, então sua tinta é a #332d23 que o site usa como --fg no claro.
const PALETTE: Record<string, { ink: string; art: string; bg: string; name: string }> = {
  verde: { ink: '#e0dcd4', art: '#45b384', bg: '#000000', name: 'verde da marca' },
  azul: { ink: '#e0dcd4', art: '#0578be', bg: '#000000', name: 'azul da marca' },
  amarelo: { ink: '#332d23', art: '#f5b200', bg: '#f5b200', name: 'amarelo cheio' },
  vermelho: { ink: '#e0dcd4', art: '#e30613', bg: '#000000', name: 'vermelho da marca' },
  fosforo: { ink: '#20c20e', art: '#20c20e', bg: '#000000', name: 'fósforo P39 (IBM 5151)' },
  ambar: { ink: '#ffb000', art: '#ffb000', bg: '#000000', name: 'âmbar de terminal' },
}

const TITLES: Record<string, string> = {
  curto: 'Quando a abstração vaza',
  medio: 'O que acontece quando você chama fetch e a rede some no meio',
  longo: 'Um título de noventa caracteres existe e vai chegar aqui um dia, então ele precisa caber',
}

const PATTERN_OPTIONS = [
  { id: 'plasma', name: 'plasma (senos somados)' },
  { id: 'dither', name: 'vinheta pontilhada' },
  { id: 'grade', name: 'grade de terminal' },
  { id: 'ruido', name: 'ruído perlin' },
]

const TITLE_SIZE_OPTIONS = [
  { id: 'curto', name: '23 caracteres' },
  { id: 'medio', name: '58 caracteres' },
  { id: 'longo', name: '90 caracteres' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const cell = ref(12)
const pattern = ref('plasma')
const palette = ref('verde')
const seed = ref(7)
const titleSize = ref('curto')
const frame = ref(true)
const still = ref(true)
const contrastFloor = ref(70)

const canvas = ref<HTMLCanvasElement | null>(null)
const stage = ref<HTMLDivElement | null>(null)
const instance = shallowRef<any>(null)
const failed = ref('')

const colours = computed(() => PALETTE[palette.value])

// A caixa por trás do texto agora é sempre preta (ver .card), então é contra
// ela que o texto se lê, não contra o fundo da arte.
const CARD_BG = '#000000'
const inkContrast = computed(() => ratio(parseHex(colours.value.ink), parseHex(CARD_BG)))

// A moldura é desenhada 1 célula para dentro da borda (linha em row/col 1), com
// uma célula vazia antes dela. O texto precisa começar depois da própria linha,
// então a folga do cartão é 2 células, na mesma unidade que o knob "célula".
const cardPadding = computed(() => `${cell.value * 2}px`)

// Mesma escolha genérica de CoverLab: preto puro se ele ler melhor do que a
// tinta do cartão contra o fundo real da régua (a caixa preta), tinta caso
// contrário. Como o fundo da régua agora é sempre preto, preto contra preto dá
// razão 1 e a tinta ganha sempre, o que é o comportamento certo aqui.
const ruleColour = computed(() => {
  const onBlack = ratio(parseHex('#000000'), parseHex(CARD_BG))
  const onInk = ratio(parseHex(colours.value.ink), parseHex(CARD_BG))
  return onBlack >= onInk ? '#000000' : colours.value.ink
})

const ruleStyle = computed(() => ({
  marginInlineStart: `calc(-1 * ${cardPadding.value})`,
  inlineSize: `calc(75% + (${cardPadding.value} * 1.5))`,
  background: `linear-gradient(to right, ${ruleColour.value} 0%, transparent 100%)`,
}))

const decisionSettings = computed(() => [
  { label: 'padrão', value: labelFor(PATTERN_OPTIONS, pattern.value) },
  { label: 'paleta', value: `${colours.value.name} (arte ${colours.value.art}, fundo ${colours.value.bg}, tinta ${colours.value.ink})` },
  { label: 'célula', value: `${cell.value}px` },
  { label: 'semente', value: String(seed.value) },
  { label: 'teto da arte', value: `${contrastFloor.value}%` },
  { label: 'moldura ╔═╗', value: frame.value ? 'sim' : 'não' },
  { label: 'parada', value: still.value ? 'sim' : 'não' },
  { label: 'comprimento do título', value: labelFor(TITLE_SIZE_OPTIONS, titleSize.value) },
])

const decisionContext = computed(
  () => `Título ${inkContrast.value.toFixed(2)}:1 sobre a caixa preta atrás do texto (#000000).`,
)

function paint(tm: any) {
  const { art, bg } = colours.value
  const [ar, ag, ab] = parseHex(art)
  const [br, bg2, bb] = parseHex(bg)
  const cols = tm.grid.cols
  const rows = tm.grid.rows
  const t = still.value ? seed.value : tm.frameCount * 0.02 + seed.value
  const ceiling = contrastFloor.value / 100

  tm.background(br, bg2, bb)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col - cols / 2
      const y = row - rows / 2
      let value = 0
      if (pattern.value === 'plasma') {
        value = (Math.sin(col * 0.12 + t) + Math.sin(row * 0.2 - t * 0.7) + Math.sin((col + row) * 0.09 + t * 1.3)) / 6 + 0.5
      } else if (pattern.value === 'dither') {
        value = 1 - Math.min(1, Math.hypot(x / cols, y / rows) * 2.4)
      } else if (pattern.value === 'grade') {
        value = col % 4 === 0 || row % 3 === 0 ? 0.75 : 0.1
      } else {
        value = tm.noise(col * 0.09 + seed.value, row * 0.16, 0)
      }

      const shaded = Math.max(0, Math.min(1, value)) * ceiling
      const glyph = SHADES[Math.min(SHADES.length - 1, Math.floor(shaded * SHADES.length))]
      if (glyph === ' ') continue

      tm.push()
      tm.translate(x, y, 0)
      tm.char(glyph)
      tm.charColor(ar, ag, ab)
      tm.cellColor(br, bg2, bb)
      tm.point()
      tm.pop()
    }
  }

  if (!frame.value) return
  const edge = (col: number, row: number, glyph: string) => {
    tm.push()
    tm.translate(col - cols / 2, row - rows / 2, 0)
    tm.char(glyph)
    tm.charColor(ar, ag, ab)
    tm.cellColor(br, bg2, bb)
    tm.point()
    tm.pop()
  }
  for (let col = 1; col < cols - 1; col++) {
    edge(col, 1, FRAME.h)
    edge(col, rows - 2, FRAME.h)
  }
  for (let row = 1; row < rows - 1; row++) {
    edge(1, row, FRAME.v)
    edge(cols - 2, row, FRAME.v)
  }
  edge(1, 1, FRAME.tl)
  edge(cols - 2, 1, FRAME.tr)
  edge(1, rows - 2, FRAME.bl)
  edge(cols - 2, rows - 2, FRAME.br)
}

let stop: (() => void) | null = null

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) still.value = true
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
    // Sem a tela de abertura: parar o loop no meio do fade dela congelava a
    // moldura do splash por cima da cena. E o noLoop só depois do setup, senão
    // o primeiro quadro de verdade nunca chega a ser pintado.
    const tm = textmode.create({ canvas: element, fontSize: cell.value, loadingScreen: { transition: 'none' } })
    instance.value = tm
    tm.draw(() => paint(tm))
    tm.setup(() => {
      if (!still.value) return
      tm.noLoop()
      tm.redraw(1)
    })

    const observer = new ResizeObserver(() => {
      const rect = box.getBoundingClientRect()
      tm.resizeCanvas(Math.round(rect.width), Math.round(rect.height))
      // Um redimensionamento com o loop parado compõe o quadro através de um
      // buffer da medida antiga e deixa uma cópia menor da cena impressa no
      // canto. Dois quadros extras assentam o pipeline.
      if (still.value) tm.redraw(2)
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
watch(still, (frozen) => {
  const tm = instance.value
  if (!tm) return
  if (!frozen) {
    tm.loop()
    return
  }
  tm.noLoop()
  tm.redraw(1)
})
watch([pattern, palette, seed, frame, contrastFloor], () => still.value && instance.value?.redraw(1))
</script>

<template>
  <div :class="$style.demo">
    <div ref="stage" :class="$style.stage" :style="{ background: colours.bg }">
      <canvas ref="canvas" aria-hidden="true"></canvas>
      <div :class="$style.card" :style="{ color: colours.ink, padding: cardPadding, background: CARD_BG }">
        <p :class="$style.tag">BLOG.LSANTOS.DEV / META</p>
        <div :class="$style.rule" :style="ruleStyle"></div>
        <p :class="$style.title">{{ TITLES[titleSize] }}</p>
        <p :class="$style.byline">Lucas Santos · 14 AGO 2026</p>
      </div>
    </div>
    <p v-if="failed" :class="$style.failed">WebGL2 não subiu: {{ failed }}</p>

    <Panel label="arte">
      <Pick v-model="pattern" label="padrão" :options="PATTERN_OPTIONS" />
      <Pick
        v-model="palette"
        label="paleta"
        :options="Object.entries(PALETTE).map(([id, value]) => ({ id, name: value.name }))"
      />
      <Knob v-model="cell" label="célula" :min="6" :max="28" unit="px" />
      <Knob v-model="seed" label="semente" :min="0" :max="60" />
      <Knob v-model="contrastFloor" label="teto da arte" :min="10" :max="100" unit="%" />
      <Toggle v-model="frame" label="moldura ╔═╗" />
      <Toggle v-model="still" label="parada" />
    </Panel>

    <Panel label="texto do cartão">
      <Pick v-model="titleSize" label="comprimento do título" :options="TITLE_SIZE_OPTIONS" />
    </Panel>

    <p :class="$style.readout">
      título {{ inkContrast.toFixed(2) }}:1 sobre a caixa preta atrás do texto (#000000), não sobre o fundo da arte:
      é essa a superfície real onde a letra se lê agora. O "teto da arte" limita o quanto o sombreado chega perto
      do branco: baixe-o e a arte fica mais escura, suba-o e ela come mais tela ao redor da caixa. Uma capa de
      verdade seria gerada pelo `sharp` no build, com o mesmo cálculo.
    </p>

    <DecisionCopy lab="capa gerada" component="TmCover.vue" :settings="decisionSettings" :context="decisionContext" />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.stage {
  position: relative;
  display: grid;
  align-items: end;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
}

.stage canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
}

.card {
  position: relative;
  font-family: 'Departure Mono', ui-monospace, monospace;
}

.rule {
  margin-block: 0.6em 0.7em;
  block-size: 4px;
}

.tag {
  margin: 0 0 0.7rem;
  font-size: clamp(0.55rem, 1.4vw, 0.75rem);
  letter-spacing: 0.24em;
  opacity: 0.75;
}

.title {
  margin: 0;
  font-size: clamp(1rem, 3.6vw, 2rem);
  line-height: 1.2;
  text-wrap: balance;
}

.byline {
  margin: 0.8rem 0 0;
  font-size: clamp(0.55rem, 1.4vw, 0.75rem);
  letter-spacing: 0.1em;
  opacity: 0.75;
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
