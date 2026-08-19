<script setup lang="ts">
/**
 * Candidato 3: um sólido girando, resolvido em caracteres.
 *
 * Terceiro uso da mesma biblioteca, e o mais distante dos outros dois: aqui quem
 * desenha é o pipeline 3D do textmode.js, com malha, câmera e luz. Serve para o
 * 404, para a página "sobre", ou como o único ornamento de um rodapé. É também o
 * candidato mais caro: é um loop de WebGL2 que nunca para sozinho.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
// Os controles e o cálculo de contraste continuam morando no laboratório vivo:
// um candidato aposentado não é motivo para duplicar quatro componentes. Se o
// arquivo crescer muito, o passo seguinte é mover os compartilhados para um
// lugar só, fora dos dois posts.
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'

const GLYPHS: Record<string, string> = {
  bloco: '█',
  meio: '▒',
  hash: '#',
  arroba: '@',
  ponto: '·',
  zero: '0',
}

const PALETTE: Record<string, string> = {
  verde: '#45b384',
  azul: '#0578be',
  amarelo: '#f5b200',
  vermelho: '#e30613',
  fosforo: '#20c20e',
  ambar: '#ffb000',
}

// #000000: --bg do site no escuro, preto absoluto para o OLED apagar o pixel.
const BG = '#000000'

const SHAPE_OPTIONS = [
  { id: 'torus', name: 'toro (o donut)' },
  { id: 'caixa', name: 'caixa' },
  { id: 'esfera', name: 'esfera' },
  { id: 'cone', name: 'cone' },
  { id: 'cilindro', name: 'cilindro' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const shape = ref('torus')
const glyph = ref('bloco')
const hue = ref('verde')
const cell = ref(10)
const size = ref(28)
const speed = ref(50)
const lit = ref(true)
const spinning = ref(true)

const canvas = ref<HTMLCanvasElement | null>(null)
const stage = ref<HTMLDivElement | null>(null)
const instance = shallowRef<any>(null)
const failed = ref('')

const solidContrast = () => ratio(parseHex(PALETTE[hue.value]), parseHex(BG)).toFixed(2)

const decisionSettings = computed(() => [
  { label: 'forma', value: labelFor(SHAPE_OPTIONS, shape.value) },
  { label: 'caractere', value: `${glyph.value} (${GLYPHS[glyph.value]})` },
  { label: 'cor', value: `${hue.value} (${PALETTE[hue.value]})` },
  { label: 'célula', value: `${cell.value}px` },
  { label: 'raio', value: `${size.value} células` },
  { label: 'rotação', value: `${speed.value}%` },
  { label: 'luz', value: lit.value ? 'sim' : 'não' },
  { label: 'girando', value: spinning.value ? 'sim' : 'não' },
])

const decisionContext = computed(() => `Contraste ${solidContrast()}:1 sobre ${BG} (decorativo, não é texto).`)

function paint(tm: any) {
  const [r, g, b] = parseHex(PALETTE[hue.value])
  const angle = spinning.value ? tm.frameCount * (speed.value / 100) : 45

  tm.background(0, 0, 0, 0)
  // Sem câmera a biblioteca começa DENTRO de um toro deste raio: a cena virava
  // um campo verde (a parede interna do tubo) com um buraco preto no meio.
  // A distância acompanha o raio para a forma caber inteira em qualquer tamanho.
  tm.perspective(58, 0.1, 4096)
  tm.camera(0, 0, size.value * 5.5)
  if (lit.value) {
    tm.ambientLight(r * 0.25, g * 0.25, b * 0.25)
    tm.pointLight(r, g, b, 120, -120, 220)
  } else {
    tm.noLights()
  }

  tm.push()
  tm.rotate(angle * 0.6, angle, angle * 0.3)
  tm.char(GLYPHS[glyph.value])
  tm.charColor(r, g, b)
  if (shape.value === 'torus') tm.torus(size.value, size.value / 2.6)
  else if (shape.value === 'caixa') tm.box(size.value * 1.4, size.value * 1.4, size.value * 1.4)
  else if (shape.value === 'esfera') tm.sphere(size.value)
  else if (shape.value === 'cone') tm.cone(size.value, size.value * 1.8)
  else tm.cylinder(size.value * 0.8, size.value * 1.8)
  tm.pop()
}

let stop: (() => void) | null = null

onMounted(async () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) spinning.value = false
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
      if (spinning.value) return
      tm.noLoop()
      tm.redraw(1)
    })

    const observer = new ResizeObserver(() => {
      const rect = box.getBoundingClientRect()
      tm.resizeCanvas(Math.round(rect.width), Math.round(rect.height))
      // Um redimensionamento com o loop parado compõe o quadro através de um
      // buffer da medida antiga e deixa uma cópia menor da cena impressa no
      // canto. Dois quadros extras assentam o pipeline.
      if (!spinning.value) tm.redraw(2)
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

watch(cell, (value) => instance.value?.fontSize(value))
watch(spinning, (running) => {
  const tm = instance.value
  if (!tm) return
  if (running) {
    tm.loop()
    return
  }
  tm.noLoop()
  tm.redraw(1)
})
watch([shape, glyph, hue, size, lit], () => !spinning.value && instance.value?.redraw(1))
</script>

<template>
  <div :class="$style.demo">
    <div ref="stage" :class="$style.stage">
      <canvas ref="canvas" role="img" aria-label="Um sólido girando, desenhado com caracteres"></canvas>
    </div>
    <p v-if="failed" :class="$style.failed">WebGL2 não subiu: {{ failed }}</p>

    <Panel label="sólido">
      <Pick v-model="shape" label="forma" :options="SHAPE_OPTIONS" />
      <Pick
        v-model="glyph"
        label="caractere"
        :options="Object.keys(GLYPHS).map((id) => ({ id, name: `${id} ${GLYPHS[id]}` }))"
      />
      <Pick
        v-model="hue"
        label="cor"
        :options="Object.keys(PALETTE).map((id) => ({ id, name: id }))"
      />
      <Knob v-model="cell" label="célula" :min="6" :max="24" unit="px" />
      <Knob v-model="size" label="raio" :min="8" :max="60" unit=" células" />
      <Knob v-model="speed" label="rotação" :min="0" :max="200" unit="%" />
      <Toggle v-model="lit" label="luz" />
      <Toggle v-model="spinning" label="girando" />
    </Panel>

    <p :class="$style.readout">
      {{ solidContrast() }}:1 sobre {{ BG }}. É decoração, não texto, então o número serve só para saber se a forma
      se lê. Com "girando" desmarcado o loop de WebGL2 para de verdade: nada de `requestAnimationFrame` rodando
      atrás. É esse o botão que a norma 2.2.2 exige de qualquer coisa que se mexe por mais de cinco segundos, e é
      o estado inicial de quem pediu `prefers-reduced-motion: reduce`.
    </p>

    <DecisionCopy
      lab="sólido girando"
      component="TmSolid.vue"
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
  min-block-size: 17rem;
  background: v-bind(BG);
}

.stage canvas {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
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
