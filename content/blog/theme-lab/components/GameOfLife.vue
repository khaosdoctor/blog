<script setup lang="ts">
/**
 * O pedido: Conway rodando atrás do site inteiro, apagado, espalhado, células
 * grandes, um clique em qualquer lugar acende uma célula. Isto é a bancada, não
 * o site: o "palco" abaixo é um retângulo com o próprio artigo simulado dentro,
 * do tamanho que este componente ocupa na página, não a janela inteira. O
 * mecanismo de exclusão e de clique é o mesmo que o site real usaria.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { HEADING, PARAGRAPHS } from './copy'
import { composite, grade, parseHex, ratio } from './contrast'

/** As duas terras reais do site (`src/styles/theme.css`), não uma aproximação. */
const GROUNDS: Record<string, { name: string; bg: string; fg: string }> = {
  escuro: { name: 'escuro do site (#000000)', bg: '#000000', fg: '#e0dcd4' },
  claro: { name: 'claro do site (#f4efe0)', bg: '#f4efe0', fg: '#332d23' },
}

const CLICK_MODES: Array<{ id: string; name: string }> = [
  { id: 'celula', name: 'uma célula' },
  { id: 'planador', name: 'planador (glider)' },
]

/** Deslocamentos do planador clássico, a partir da célula clicada, numa caixa 3x3. */
const GLIDER_BASE: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
]

/** Gira uma forma 90° dentro de uma caixa `size`x`size`, para não repetir a mesma direção sempre. */
function rotate90(cells: Array<[number, number]>, size: number): Array<[number, number]> {
  return cells.map(([c, r]) => [size - 1 - r, c])
}

/** As quatro rotações do planador, uma por diagonal: sem isso todo planador andaria para o mesmo lado. */
const GLIDER_ORIENTATIONS: Array<Array<[number, number]>> = [GLIDER_BASE]
for (let i = 0; i < 3; i++) GLIDER_ORIENTATIONS.push(rotate90(GLIDER_ORIENTATIONS[GLIDER_ORIENTATIONS.length - 1], 3))

/** Células de folga entre o planador e a borda da grade, para não nascer e sair da tela em poucas gerações. */
const EDGE_MARGIN = 3
/** O planador cabe numa caixa 3x3 em qualquer uma das quatro rotações. */
const GLIDER_BOX = 3

const ground = ref('escuro')
const cellSize = ref(18)
const densityPct = ref(4)
const gps = ref(2)
const dimnessPct = ref(6)
const clickMode = ref('celula')
const columnCh = ref(46)
const manualPause = ref(false)
const simulateReduced = ref(false)
/** Segundos entre planadores automáticos. 0 é a posição desligada: sem alimentação, o campo só esvazia. */
const autoSeedSeconds = ref(4)

const stageRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const articleRef = ref<HTMLDivElement | null>(null)

const cols = ref(0)
const rows = ref(0)
const generation = ref(0)
const aliveCount = ref(0)
const costMs = ref(0)
/** Quantos planadores automáticos já entraram no campo, para o leitor ver a alimentação acontecendo. */
const autoFedCount = ref(0)

// Estado do grid vive fora da reatividade do Vue: uma célula é lida e escrita
// milhares de vezes por geração, e um Proxy nesse caminho custa mais do que o
// próprio jogo.
let grid = new Uint8Array(0)
let excluded = new Uint8Array(0)
const costSamples: number[] = []

const groundColours = computed(() => GROUNDS[ground.value])

const dimmedCell = computed(() => composite(parseHex(groundColours.value.fg), parseHex(groundColours.value.bg), dimnessPct.value / 100))
const cellContrast = computed(() => ratio(dimmedCell.value, parseHex(groundColours.value.bg)))
const cellGrade = computed(() => grade(cellContrast.value))

const osReduced = ref(false)
const tabHidden = ref(false)
const reducedActive = computed(() => osReduced.value || simulateReduced.value)
const running = computed(() => !reducedActive.value && !manualPause.value && !tabHidden.value)

function indexOf(col: number, row: number): number {
  return row * cols.value + col
}

/**
 * A caixa do artigo, medida de verdade, com uma célula de folga ao redor:
 * exatamente o que `src/components/PostToc.astro` faz para o próprio índice,
 * só que aqui o resultado é uma máscara de células e não uma posição em `px`.
 * Qualquer célula viva que a máscara passe a cobrir é apagada na hora, então
 * um redimensionamento nunca deixa uma célula presa atrás do texto.
 */
function computeExclusion(): void {
  const canvas = canvasRef.value
  const article = articleRef.value
  if (!canvas || !article || cols.value === 0 || rows.value === 0) return

  const canvasBox = canvas.getBoundingClientRect()
  const articleBox = article.getBoundingClientRect()
  const pad = cellSize.value

  const colStart = Math.max(0, Math.floor((articleBox.left - canvasBox.left - pad) / cellSize.value))
  const colEnd = Math.min(cols.value - 1, Math.ceil((articleBox.right - canvasBox.left + pad) / cellSize.value))
  const rowStart = Math.max(0, Math.floor((articleBox.top - canvasBox.top - pad) / cellSize.value))
  const rowEnd = Math.min(rows.value - 1, Math.ceil((articleBox.bottom - canvasBox.top + pad) / cellSize.value))

  excluded.fill(0)
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const idx = indexOf(col, row)
      excluded[idx] = 1
      grid[idx] = 0
    }
  }
  draw()
}

function seed(): void {
  const total = cols.value * rows.value
  for (let i = 0; i < total; i++) grid[i] = excluded[i] === 1 ? 0 : Math.random() < densityPct.value / 100 ? 1 : 0
  generation.value = 0
  aliveCount.value = grid.reduce((sum, v) => sum + v, 0)
  draw()
}

/** Redimensiona o canvas para o tamanho real do palco, reconstrói o grid e a
 * máscara de exclusão do zero, e semeia de novo: o mesmo gatilho que o texto
 * mudando de fonte dispararia no site real, porque muda quantos pixels cabem
 * em um `ch`. */
function resizeGrid(): void {
  const stage = stageRef.value
  const canvas = canvasRef.value
  if (!stage || !canvas) return

  const width = stage.clientWidth
  const height = stage.clientHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

  cols.value = Math.max(1, Math.floor(width / cellSize.value))
  rows.value = Math.max(1, Math.floor(height / cellSize.value))
  grid = new Uint8Array(cols.value * rows.value)
  excluded = new Uint8Array(cols.value * rows.value)
  computeExclusion()
  seed()
}

function step(): void {
  const c = cols.value
  const r = rows.value
  const next = new Uint8Array(c * r)
  for (let row = 0; row < r; row++) {
    for (let col = 0; col < c; col++) {
      const idx = row * c + col
      if (excluded[idx] === 1) continue
      let neighbours = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = row + dr
          const cc = col + dc
          if (rr < 0 || rr >= r || cc < 0 || cc >= c) continue
          neighbours += grid[rr * c + cc]
        }
      }
      const alive = grid[idx] === 1
      next[idx] = alive ? (neighbours === 2 || neighbours === 3 ? 1 : 0) : neighbours === 3 ? 1 : 0
    }
  }
  grid = next
  generation.value++
  aliveCount.value = grid.reduce((sum, v) => sum + v, 0)
}

function draw(): void {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = stage.clientWidth
  const height = stage.clientHeight
  ctx.clearRect(0, 0, width, height)

  const [r, g, b] = parseHex(groundColours.value.fg)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dimnessPct.value / 100})`
  const size = cellSize.value
  for (let row = 0; row < rows.value; row++) {
    for (let col = 0; col < cols.value; col++) {
      const idx = indexOf(col, row)
      if (grid[idx] === 1) ctx.fillRect(col * size, row * size, size, size)
    }
  }
}

function recordCost(ms: number): void {
  costSamples.push(ms)
  if (costSamples.length > 20) costSamples.shift()
  costMs.value = costSamples.reduce((sum, v) => sum + v, 0) / costSamples.length
}

let rafId: number | null = null
let lastStep = 0
let lastAutoSeed = 0

function tick(timestamp: number): void {
  rafId = requestAnimationFrame(tick)

  // Mesmo laço que já para para pausa manual, prefers-reduced-motion e aba escondida: um
  // setInterval à parte continuaria batendo com o campo parado, e ninguém o cancelaria.
  if (autoSeedSeconds.value > 0 && timestamp - lastAutoSeed >= autoSeedSeconds.value * 1000) {
    lastAutoSeed = timestamp
    feedGlider()
  }

  const interval = 1000 / gps.value
  if (timestamp - lastStep < interval) return
  lastStep = timestamp
  const t0 = performance.now()
  step()
  draw()
  recordCost(performance.now() - t0)
}

function startLoop(): void {
  stopLoop()
  lastStep = 0
  lastAutoSeed = 0
  rafId = requestAnimationFrame(tick)
}

function stopLoop(): void {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
}

/** `orientation` por padrão é a forma clássica: o clique do leitor sempre planta a mesma, previsível. */
function placeGlider(col: number, row: number, orientation: Array<[number, number]> = GLIDER_BASE): void {
  for (const [dc, dr] of orientation) {
    const c = col + dc
    const r = row + dr
    if (c < 0 || c >= cols.value || r < 0 || r >= rows.value) continue
    const idx = indexOf(c, r)
    if (excluded[idx] === 1) continue
    grid[idx] = 1
  }
}

/** Testa a caixa `GLIDER_BOX`x`GLIDER_BOX` inteira contra a máscara de exclusão, não célula por
 * célula: um planador automático que nascesse parcialmente atrás do texto nasceria cortado e
 * morreria sozinho na próxima geração, o oposto do que a alimentação deveria fazer. */
function boxOverlapsExclusion(col: number, row: number): boolean {
  for (let dr = 0; dr < GLIDER_BOX; dr++) {
    for (let dc = 0; dc < GLIDER_BOX; dc++) {
      if (excluded[indexOf(col + dc, row + dr)] === 1) return true
    }
  }
  return false
}

/**
 * Alimenta o campo: um planador novo, em posição e rotação aleatórias, para o campo raramente
 * morrer de vez sozinho, já que a maioria das sementes aleatórias vira still life ou apaga.
 * `Math.random()` aqui é decoração de execução (posição e rotação de um efeito visual ao vivo), não
 * a semente determinística que a capa do site exige; não precisa da mesma restrição.
 */
function feedGlider(): void {
  const c = cols.value
  const r = rows.value
  const colSpan = c - EDGE_MARGIN * 2 - GLIDER_BOX
  const rowSpan = r - EDGE_MARGIN * 2 - GLIDER_BOX
  if (colSpan < 0 || rowSpan < 0) return // grade pequena demais pra caber um planador com folga

  for (let attempt = 0; attempt < 20; attempt++) {
    const col = EDGE_MARGIN + Math.floor(Math.random() * (colSpan + 1))
    const row = EDGE_MARGIN + Math.floor(Math.random() * (rowSpan + 1))
    if (boxOverlapsExclusion(col, row)) continue
    const orientation = GLIDER_ORIENTATIONS[Math.floor(Math.random() * GLIDER_ORIENTATIONS.length)]
    placeGlider(col, row, orientation)
    autoFedCount.value++
    aliveCount.value = grid.reduce((sum, v) => sum + v, 0)
    draw()
    return
  }
}

/*
 * O clique tem que respeitar o texto: clicar numa palavra do artigo tem que
 * selecionar a palavra, não acender uma célula atrás dela. Não existe
 * pointer-events: none em lugar nenhum aqui. O <canvas> ocupa o palco inteiro
 * e vem antes do artigo na árvore, então é pintado por baixo dele; o artigo é
 * um elemento comum, com a própria caixa, sentado por cima. O navegador só
 * entrega o clique ao elemento mais alto embaixo do cursor: dentro da caixa do
 * artigo esse elemento é o parágrafo, e o clique seleciona texto como sempre;
 * fora dela não existe nada no caminho, e o clique cai direto no canvas.
 */
function onCanvasClick(event: MouseEvent): void {
  const canvas = canvasRef.value
  if (!canvas || cols.value === 0) return
  const box = canvas.getBoundingClientRect()
  const col = Math.floor((event.clientX - box.left) / cellSize.value)
  const row = Math.floor((event.clientY - box.top) / cellSize.value)
  if (col < 0 || col >= cols.value || row < 0 || row >= rows.value) return
  const idx = indexOf(col, row)
  if (excluded[idx] === 1) return
  if (clickMode.value === 'planador') placeGlider(col, row)
  else grid[idx] = 1
  aliveCount.value = grid.reduce((sum, v) => sum + v, 0)
  draw()
}

let stageObserver: ResizeObserver | null = null
let articleObserver: ResizeObserver | null = null
let reducedQuery: MediaQueryList | null = null

function syncOsReduced(event: MediaQueryListEvent | MediaQueryList): void {
  osReduced.value = event.matches
}

watch(running, (isRunning) => (isRunning ? startLoop() : stopLoop()))

// A regra forte para prefers-reduced-motion não é pausar, é nunca começar: um
// quadro parado, semeado de novo para não mostrar o instante exato em que o
// laço foi cortado.
watch(reducedActive, (isReduced) => {
  if (!isReduced) return
  stopLoop()
  seed()
})

watch(cellSize, resizeGrid)
watch(densityPct, seed)

const decisionSettings = computed(() => [
  { label: 'fundo', value: groundColours.value.name },
  { label: 'tamanho da célula', value: `${cellSize.value}px` },
  { label: 'densidade da semente', value: `${densityPct.value}%` },
  { label: 'gerações por segundo', value: `${gps.value}/s` },
  { label: 'apagamento da célula', value: `${dimnessPct.value}%` },
  { label: 'clique adiciona', value: CLICK_MODES.find((m) => m.id === clickMode.value)?.name ?? clickMode.value },
  { label: 'medida da coluna simulada', value: `${columnCh.value}ch` },
  { label: 'contraste da célula acesa contra o fundo', value: `${cellContrast.value.toFixed(2)}:1 (${cellGrade.value})` },
  {
    label: 'alimentação automática',
    value: autoSeedSeconds.value === 0 ? 'desligada, o campo só esvazia' : `um planador a cada ${autoSeedSeconds.value}s`,
  },
])

const decisionContext =
  'Isso contradiz de frente a decisão já registrada em docs/design.md: o site carrega quase nenhuma ' +
  'animação, com a marca do cabeçalho como única exceção. Este candidato reabre aquela decisão, não a ' +
  'ignora. prefers-reduced-motion trava num quadro só e nunca inicia o laço; o botão de pausa cobre WCAG ' +
  '2.2.2; a taxa de geração fica bem abaixo do limite de três trocas por segundo de WCAG 2.3.1. Gerações ' +
  'por segundo, células vivas e custo por geração são medidos ao vivo pelo próprio componente, abaixo do ' +
  'palco. Bateria e o efeito numa rolagem longa não foram medidos: esta máquina não tem navegador.'

onMounted(() => {
  reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = reducedQuery.matches
  reducedQuery.addEventListener('change', syncOsReduced)

  resizeGrid()

  stageObserver = new ResizeObserver(resizeGrid)
  if (stageRef.value) stageObserver.observe(stageRef.value)
  articleObserver = new ResizeObserver(computeExclusion)
  if (articleRef.value) articleObserver.observe(articleRef.value)

  document.addEventListener('visibilitychange', onVisibility)

  if (running.value) startLoop()
})

function onVisibility(): void {
  tabHidden.value = document.hidden
}

onUnmounted(() => {
  stopLoop()
  reducedQuery?.removeEventListener('change', syncOsReduced)
  stageObserver?.disconnect()
  articleObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div :class="$style.demo">
    <p :class="$style.stageLabel">simulação de página, com o artigo em cima</p>
    <div ref="stageRef" :class="$style.stage" :style="{ background: groundColours.bg }">
      <canvas ref="canvasRef" :class="$style.canvas" aria-hidden="true" @click="onCanvasClick"></canvas>
      <div ref="articleRef" :class="$style.article" :style="{ inlineSize: `${columnCh}ch`, color: groundColours.fg }">
        <h4 :class="$style.heading">{{ HEADING }}</h4>
        <p>{{ PARAGRAPHS[0] }}</p>
      </div>
    </div>

    <Panel label="célula">
      <Pick v-model="ground" label="fundo" :options="Object.entries(GROUNDS).map(([id, g]) => ({ id, name: g.name }))" />
      <Knob v-model="cellSize" label="tamanho da célula (zoom)" :min="8" :max="32" :step="2" unit="px" />
      <Knob v-model="densityPct" label="densidade da semente" :min="1" :max="20" unit="%" />
      <Knob v-model="gps" label="gerações por segundo" :min="0.5" :max="8" :step="0.5" unit="/s" />
      <Knob v-model="dimnessPct" label="apagamento da célula" :min="2" :max="30" unit="%" />
      <Knob
        v-model="autoSeedSeconds"
        label="alimentação: segundos por planador novo (0 desliga)"
        :min="0"
        :max="20"
        unit="s"
      />
    </Panel>

    <Panel label="clique e coluna">
      <Pick v-model="clickMode" label="clique adiciona" :options="CLICK_MODES" />
      <Knob v-model="columnCh" label="medida da coluna simulada" :min="28" :max="70" :step="2" unit="ch" />
      <Toggle v-model="manualPause" label="pausar (WCAG 2.2.2)" />
      <Toggle v-model="simulateReduced" label="simular prefers-reduced-motion" />
      <button type="button" :class="$style.reseed" @click="seed">semear de novo</button>
    </Panel>

    <p :class="$style.readout">
      Grade de {{ cols }}×{{ rows }} células ({{ cols * rows }} no total). Geração {{ generation }}, {{ aliveCount }}
      vivas. Custo medido por geração (média móvel): {{ costMs.toFixed(3) }}ms.
      Contraste da célula acesa contra o fundo: {{ cellContrast.toFixed(2) }}:1 ({{ cellGrade }}), bem abaixo do 3:1 de
      texto grande de propósito: isto tem que ler como textura, não como conteúdo.
      {{
        reducedActive
          ? 'Movimento reduzido: um quadro só, o laço nunca inicia.'
          : running
            ? 'Rodando.'
            : 'Pausado.'
      }}
      {{
        autoSeedSeconds === 0
          ? 'Alimentação automática desligada: o campo só esvazia daqui pra frente, sem planador novo entrando.'
          : `Campo alimentado: um planador novo a cada ${autoSeedSeconds}s, em posição e rotação aleatórias, nunca dentro da coluna de leitura nem perto da borda. ${autoFedCount} entraram até agora.`
      }}
      A aba escondida cancela o laço (visibilitychange + cancelAnimationFrame), mas isso não foi visto rodando de
      verdade nesta máquina, que não tem navegador; o mesmo vale para bateria e para o efeito numa rolagem longa de
      post. Interação é só de mouse: o canvas não recebe foco de teclado, então quem navega só com teclado não
      acende nenhuma célula.
    </p>

    <DecisionCopy lab="jogo da vida" component="GameOfLife.vue" :settings="decisionSettings" :context="decisionContext" />
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 22rem;
  overflow: hidden;
  border: 1px solid var(--rule);
}

.canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  cursor: crosshair;
  touch-action: manipulation;
}

.article {
  position: relative;
  z-index: 1;
  max-inline-size: 90%;
  padding: 1.25rem 1.5rem;
  /* Sem fundo próprio de propósito: a coluna de leitura real também não tem
     um, então se a máscara de exclusão errar por um pixel uma célula acesa
     aparece direto atrás da letra, em vez de escondida atrás de um retângulo
     opaco que disfarçaria o erro. */
  background: transparent;
  font-size: 0.85rem;
  line-height: 1.6;
}

.heading {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
}

.reseed {
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

.reseed:hover,
.reseed:focus-visible {
  background: #ffffff12;
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
