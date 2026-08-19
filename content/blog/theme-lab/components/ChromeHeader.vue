<script setup lang="ts">
/**
 * O cabeçalho, em cinco leituras da mesma direção, com a marca de verdade
 * dentro de cada uma. Todos usam só caracteres: nenhuma imagem, nenhum ícone,
 * nada que precise de requisição.
 *
 * Esta bancada absorveu a antiga seção 03 (`LogoLab.vue`, agora removida): o
 * dono pediu para fundir as duas, porque as duas mostravam a mesma marca
 * dentro do mesmo tipo de cabeçalho, só em lugares separados da página. O que
 * era exclusivo do logo (o wordmark que digita e apaga, o glitch, a pausa e o
 * `prefers-reduced-motion`) mora aqui agora, ao lado do que já era exclusivo
 * do cabeçalho (os cinco formatos, fonte, destaque, entreletra, respiro).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import {
  CURSOR_RATES,
  CURSOR_RATE_OPTIONS,
  labelForMark,
  MARK_ACCENT_ALL_ID,
  MARK_ACCENTS,
  MARK_CANDIDATES,
  MARK_DEFAULT_ACCENT,
  MARK_DEFAULT_PX,
  MARK_GRID_SIDE,
  MARK_MIN_PX,
  type MarkCandidateId,
} from './logoMarks'
import LogoMark from './LogoMark.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const STACKS: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  silkscreen: "'Silkscreen', sans-serif",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
  vt323: "'VT323', ui-monospace, monospace",
}

const ACCENTS: Record<string, string> = {
  verde: '#45b384',
  amarelo: '#f5b200',
  azul: '#7cc0ff',
  fosforo: '#20c20e',
}

const BG = '#14161a'
const INK = '#e6e4e0'
const MUTED = '#9a9ea6'

/**
 * Espelho em hex dos tokens de marca (`src/styles/theme.css`, modo escuro),
 * só para o número de contraste da marca. `todas` não tem entrada própria
 * aqui: `ROLE_HEX`, mais abaixo, lê os quatro papéis (vermelho, verde,
 * amarelo, azul) direto deste mesmo mapa em vez de duplicar os hex.
 */
const MARK_ACCENT_HEX: Record<string, string> = {
  verde: '#45b384',
  amarelo: '#f5b200',
  azul: '#7cc0ff',
  vermelho: '#e6242f',
  roxo: '#815bc2',
  traço: '#f3f1ee',
}

const NAV = ['posts', 'séries', 'tags', 'busca', 'sobre']

const SHAPE_OPTIONS = [
  { id: 'barra', name: 'barra de caixa ┌─┐' },
  { id: 'dos', name: 'linha de DOS invertida' },
  { id: 'minimo', name: 'mínimo, só uma régua' },
  { id: 'menu', name: 'menu de Game Boy ▸' },
  { id: 'ledger', name: 'razão, SEÇÃO 00 / ÍNDICE' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const shape = ref('barra')
const face = ref('departure')
const accent = ref('verde')
const tracking = ref(8)
const density = ref(10)
const caps = ref(true)

const accentHex = computed(() => ACCENTS[accent.value])
const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))
const accentContrast = computed(() => ratio(parseHex(accentHex.value), parseHex(BG)).toFixed(2))

/**
 * A marca: só dois candidatos sobrevivem, "fio" (wireframe Elite) e "lattice"
 * (grade de +). O slider de tamanho ia de 24 a 160px com um piso rígido por
 * candidato (`MARK_MIN_PX`, em `logoMarks.ts`); o dono pediu 0 a 300px
 * inteiro, então o piso virou só um aviso no relatório (`markBelowFloor`
 * abaixo), nunca mais um limite que o slider recusa.
 *
 * `MARK_DEFAULT_PX.fio` é só o valor de partida do ref. Um watcher que
 * reescrevia `markSizePx` para o padrão do novo candidato a cada troca
 * morava aqui: sobrou de quando o piso ainda travava o slider, para o
 * tamanho nunca ficar preso abaixo do piso do candidato novo. O piso é
 * consultivo agora (`markBelowFloor` já avisa sem travar nada), então
 * trocar de marca troca só a marca; o tamanho escolhido atravessa a troca.
 */
const markCandidate = ref<MarkCandidateId>('fio')
const markSizePx = ref(MARK_DEFAULT_PX.fio)
const markBelowFloor = computed(() => markSizePx.value < MARK_MIN_PX[markCandidate.value])

/**
 * A cor da marca: um seletor de acento único, a mesma ideia do "destaque" do
 * resto do cabeçalho, mais a exceção `todas` (`MARK_ACCENT_ALL_ID`), a marca
 * original de volta, cada célula na cor do seu próprio papel em vez de um
 * acento só.
 */
const markAccentId = ref(MARK_DEFAULT_ACCENT)
const markAccentColor = computed(() => MARK_ACCENTS[markAccentId.value])
const markAccentIsAll = computed(() => markAccentId.value === MARK_ACCENT_ALL_ID)

/**
 * `todas` pinta quatro papéis (`ROLE_TOKEN` só tem R/G/Y/B; roxo não entra em
 * nenhum retângulo de `MARK_RECTS`), não um só, então nenhuma razão única
 * descreve o desenho inteiro. Imprimir a razão do vermelho sozinho, por
 * exemplo, seria mentir sobre as outras três células visíveis. A leitura
 * honesta é a pior das quatro, porque é a parte que primeiro deixa de ser
 * legível contra o fundo: vermelho 4,67:1, azul 4,90:1, verde 8,03:1, amarelo
 * 11,25:1 sobre este fundo escuro, então o vermelho decide o número.
 */
const ROLE_HEX: Record<string, string> = {
  R: MARK_ACCENT_HEX.vermelho,
  G: MARK_ACCENT_HEX.verde,
  Y: MARK_ACCENT_HEX.amarelo,
  B: MARK_ACCENT_HEX.azul,
}
const markAccentContrast = computed(() => {
  if (markAccentIsAll.value) {
    const ratios = Object.values(ROLE_HEX).map((hex) => ratio(parseHex(hex), parseHex(BG)))
    return Math.min(...ratios).toFixed(2)
  }
  return ratio(parseHex(MARK_ACCENT_HEX[markAccentId.value]), parseHex(BG)).toFixed(2)
})

/**
 * Composição da marca: logo, texto, ou os dois. O candidato "linha de DOS
 * invertida" fica de fora desta escolha porque nele o próprio prompt já é a
 * marca (pedido do dono): colocar o logo ao lado seria redundante, então essa
 * leitura nunca mostra o `markSlot`, e o painel esconde o seletor quando ela
 * está selecionada.
 */
const BRAND_MODE_OPTIONS = [
  { id: 'ambos', name: 'logo + texto' },
  { id: 'logo', name: 'só o logo' },
  { id: 'texto', name: 'só o texto' },
]
const brandMode = ref('ambos')
const showLogoSlot = computed(() => shape.value !== 'dos' && brandMode.value !== 'texto')
const showTextSlot = computed(() => shape.value !== 'dos' && brandMode.value !== 'logo')

/** O prompt do candidato "dos": editável, pode ficar vazio, sem nenhuma marca ao lado. */
const dosPrompt = ref('C:\\BLOG>')

// --- o wordmark: "lsantos.dev", com cinco jeitos de aparecer na tela ---
const WORD = 'lsantos.dev'
const holdSeconds = ref(1.6)

const TEXT_ANIM_OPTIONS = [
  { id: 'teletipo', name: 'teletipo (Teletype ASR-33)' },
  { id: 'decifra', name: 'decifra (scramble)' },
  { id: 'pipboy', name: 'pipboy (scanline)' },
  { id: 'baud', name: 'baud (linha serial)' },
  { id: 'falha', name: 'falha (glitch RGB)' },
]
const textAnim = ref('teletipo')

// teletipo: Teletype Model 33 ASR, 10 caracteres/s a 110 baud, 100ms/caractere de verdade.
const charMs = ref(100)
// baud: a mesma conta de qualquer linha serial, 10 bits por caractere (start + stop + 8 de dado),
// então caracteres/s = baud/10 e ms/caractere = 10000/baud. 300 baud é a leitura de BBS clássica.
const BAUD_OPTIONS = [
  { id: '300', name: '300 baud (~30 c/s)' },
  { id: '1200', name: '1200 baud (~120 c/s)' },
  { id: '2400', name: '2400 baud (~240 c/s)' },
  { id: '9600', name: '9600 baud (~960 c/s)' },
]
const baudRate = ref(300)
// pipboy: não existe um número de hardware verificado para o Pip-Boy, só a convenção
// da comunidade de fã de 20 a 40ms por caractere; 32ms fica no meio dela. O site já
// recusou scanline de CRT de verdade (docs/theming.md seção 8); aqui é só uma decoração
// do wordmark nesta bancada, não uma proposta de trazer scanline de volta ao site.
const PIPBOY_MS = 32
const pipboyGlow = ref(false)
// decifra: sem taxa de quadro original (Sneakers, 1992, e o porte de soulwire inspirado em
// LOVE, 2011, não documentam uma), então o tique usado é o do próprio Doom, 28ms.
const DECIFRA_TICK_MS = 28
const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}—=+*^?#'.split('')
// falha: WCAG 2.3.1 proíbe mais de três trocas de luminância por segundo; o piso de 2s
// no knob abaixo garante isso mesmo no ajuste mais agressivo que o slider permite.
const falhaIntervalSeconds = ref(3)

const revealCount = ref(WORD.length) // repouso: nome inteiro, sem JS isto nunca muda
const decifraDisplay = ref<string[]>(WORD.split(''))
const falhaActive = ref(false)
const falhaShiftA = ref('0px')
const falhaShiftB = ref('0px')
const falhaTearBand = ref('inset(0 0 100% 0)')

const chars = computed<string[]>(() => {
  if (textAnim.value === 'decifra') return decifraDisplay.value
  if (textAnim.value === 'falha') return WORD.split('')
  return WORD.split('').map((ch, i) => (i < revealCount.value ? ch : ''))
})

let stepTimer: ReturnType<typeof setTimeout> | null = null
let holdTimer: ReturnType<typeof setTimeout> | null = null
let decifraTimer: ReturnType<typeof setInterval> | null = null
let falhaTimer: ReturnType<typeof setTimeout> | null = null

function clearStepTimer(): void {
  if (stepTimer) clearTimeout(stepTimer)
  stepTimer = null
}
function clearHoldTimer(): void {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = null
}
function clearDecifraTimer(): void {
  if (decifraTimer) clearInterval(decifraTimer)
  decifraTimer = null
}
function clearFalhaTimer(): void {
  if (falhaTimer) clearTimeout(falhaTimer)
  falhaTimer = null
}

/** ms por caractere da animação de revelação atualmente escolhida (teletipo, baud ou pipboy). */
function msPerCharForReveal(): number {
  if (textAnim.value === 'baud') return 10000 / baudRate.value
  if (textAnim.value === 'pipboy') return PIPBOY_MS
  return charMs.value
}

function eraseBackward(): void {
  clearStepTimer()
  clearHoldTimer()
  const step = () => {
    revealCount.value--
    if (revealCount.value <= 0) {
      revealCount.value = 0
      holdTimer = setTimeout(typeForward, holdSeconds.value * 500)
      return
    }
    stepTimer = setTimeout(step, msPerCharForReveal())
  }
  stepTimer = setTimeout(step, msPerCharForReveal())
}

function typeForward(): void {
  clearStepTimer()
  clearHoldTimer()
  const step = () => {
    revealCount.value++
    if (revealCount.value >= WORD.length) {
      holdTimer = setTimeout(eraseBackward, holdSeconds.value * 1000)
      return
    }
    stepTimer = setTimeout(step, msPerCharForReveal())
  }
  stepTimer = setTimeout(step, msPerCharForReveal())
}

function randomScrambleGlyph(): string {
  return SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]
}

/** Decifra: cada caractere escala um atraso próprio (20 a 80ms, mais o índice) e só então passa a trocar de glifo a cada 28ms até travar na letra final. */
function runDecifra(): void {
  clearDecifraTimer()
  clearHoldTimer()
  const queue = WORD.split('').map((ch, i) => {
    const start = i * DECIFRA_TICK_MS + 20 + Math.random() * 60
    return { ch, start, end: start + 5 * DECIFRA_TICK_MS }
  })
  let frame = 0
  decifraDisplay.value = queue.map(() => ' ')
  decifraTimer = setInterval(() => {
    frame += DECIFRA_TICK_MS
    let allLocked = true
    decifraDisplay.value = queue.map(({ ch, start, end }) => {
      if (frame < start) {
        allLocked = false
        return ' '
      }
      if (frame < end) {
        allLocked = false
        return randomScrambleGlyph()
      }
      return ch
    })
    if (allLocked) {
      clearDecifraTimer()
      holdTimer = setTimeout(runDecifra, holdSeconds.value * 1000)
    }
  }, DECIFRA_TICK_MS)
}

/** Falha: o texto fica sempre inteiro, e a cada intervalo (piso de 2s) um estouro de 80 a 150ms desloca duas cópias translúcidas dele para os lados. */
function scheduleFalha(): void {
  clearFalhaTimer()
  falhaTimer = setTimeout(runFalha, falhaIntervalSeconds.value * 1000)
}

function runFalha(): void {
  falhaShiftA.value = `${(Math.random() * 4 - 2).toFixed(1)}px`
  falhaShiftB.value = `${(Math.random() * 4 - 2).toFixed(1)}px`
  falhaTearBand.value = `inset(${Math.floor(Math.random() * 60)}% 0 ${Math.floor(Math.random() * 30)}% 0)`
  falhaActive.value = true
  const burstMs = 80 + Math.random() * 70
  falhaTimer = setTimeout(() => {
    falhaActive.value = false
    scheduleFalha()
  }, burstMs)
}

function stopTextAnim(): void {
  clearStepTimer()
  clearHoldTimer()
  clearDecifraTimer()
  clearFalhaTimer()
  falhaActive.value = false
  revealCount.value = WORD.length // quadro de repouso do prefers-reduced-motion: a palavra inteira, parada
  decifraDisplay.value = WORD.split('')
}

function startTextAnim(): void {
  stopTextAnim()
  if (textAnim.value === 'decifra') {
    revealCount.value = 0
    runDecifra()
    return
  }
  if (textAnim.value === 'falha') {
    scheduleFalha()
    return
  }
  revealCount.value = 0
  typeForward()
}

watch(textAnim, () => {
  if (!animationsFrozen.value) startTextAnim()
})

function replay(): void {
  if (animationsFrozen.value) return
  startTextAnim()
}

// --- cursor de bloco: era exclusivo do candidato "dos", agora é um efeito à parte que qualquer um pode ligar ---
const cursorEffectOn = ref(true)
const cursorRateId = ref('terminal')
const cursorOn = ref(true)
let cursorTimer: ReturnType<typeof setInterval> | null = null

function startCursor(): void {
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = setInterval(() => {
    cursorOn.value = !cursorOn.value
  }, CURSOR_RATES[cursorRateId.value])
}
function stopCursor(): void {
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = null
  cursorOn.value = true
}

watch(cursorRateId, () => {
  if (cursorEffectOn.value && !animationsFrozen.value) startCursor()
})
watch(cursorEffectOn, (on) => {
  if (animationsFrozen.value) return
  if (on) startCursor()
  else stopCursor()
})

// --- prefers-reduced-motion e pausa manual: trava tudo num quadro estático, nunca no meio ---
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
    stopTextAnim()
    stopCursor()
  } else {
    startTextAnim()
    if (cursorEffectOn.value) startCursor()
  }
})

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = mediaQuery.matches
  mediaQuery.addEventListener('change', syncOsReduced)
  if (!animationsFrozen.value) {
    startTextAnim()
    if (cursorEffectOn.value) startCursor()
  }
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncOsReduced)
  clearStepTimer()
  clearHoldTimer()
  clearDecifraTimer()
  clearFalhaTimer()
  stopCursor()
})

const decisionSettings = computed(() => [
  { label: 'candidato', value: labelFor(SHAPE_OPTIONS, shape.value) },
  { label: 'marca', value: labelForMark(markCandidate.value) },
  {
    label: 'tamanho da marca',
    value: `${markSizePx.value}px (piso de legibilidade do candidato: ${MARK_MIN_PX[markCandidate.value]}px, grade ${MARK_GRID_SIDE[markCandidate.value]}${markBelowFloor.value ? ', abaixo do piso' : ''})`,
  },
  {
    label: 'cor da marca',
    value: markAccentIsAll.value
      ? `todas (pior dos 4 papéis, vermelho: ${markAccentContrast.value}:1 sobre ${BG})`
      : `${markAccentId.value} (${markAccentContrast.value}:1 sobre ${BG})`,
  },
  { label: 'composição da marca', value: shape.value === 'dos' ? 'prompt (a marca é o próprio prompt)' : labelFor(BRAND_MODE_OPTIONS, brandMode.value) },
  { label: 'fonte', value: face.value },
  { label: 'destaque', value: `${accent.value} (${accentHex.value})` },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'respiro', value: String(density.value) },
  { label: 'caixa alta', value: caps.value ? 'sim' : 'não' },
  { label: 'animação do texto', value: labelFor(TEXT_ANIM_OPTIONS, textAnim.value) },
  { label: 'cursor de bloco', value: cursorEffectOn.value ? `ligado, ${labelFor(CURSOR_RATE_OPTIONS, cursorRateId.value)}` : 'desligado' },
  ...(shape.value === 'dos' ? [{ label: 'prompt do DOS', value: dosPrompt.value || '(vazio)' }] : []),
])

const decisionContext = computed(
  () =>
    `Texto ${inkContrast.value}:1 · secundário ${mutedContrast.value}:1 · destaque ${accentContrast.value}:1 sobre ${BG}. ` +
    'prefers-reduced-motion e a pausa manual travam o wordmark e o cursor no quadro de repouso (nome inteiro, sem cursor piscando), nunca no meio de um quadro.',
)

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  textTransform: caps.value ? ('uppercase' as const) : ('none' as const),
  padding: `${density.value / 10}rem ${density.value / 6}rem`,
  color: INK,
}))
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: BG }">
      <header v-if="shape === 'barra'" :class="$style.bar" :style="base">
        <span :class="$style.edge" :style="{ color: MUTED }">┌─</span>
        <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
          <span v-if="showLogoSlot" :class="$style.markSlot">
            <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" :glitch-enabled="!animationsFrozen" />
          </span>
          <span v-if="showTextSlot" :class="$style.brand" :style="{ color: accentHex }">
            <span :class="$style.wordChars" :style="{ '--falha-a': falhaShiftA, '--falha-b': falhaShiftB, '--falha-band': falhaTearBand }" :data-word="WORD" :data-falha="textAnim === 'falha' && falhaActive" :data-pipboy="textAnim === 'pipboy'" :data-glow="textAnim === 'pipboy' && pipboyGlow" aria-hidden="true">
              <span v-for="(ch, i) in chars" :key="i" :class="$style.letter">{{ ch }}</span>
            </span>
          </span>
          <span v-if="cursorEffectOn" :class="[$style.cursorBlock, cursorOn && $style.cursorOnState]"></span>
        </a>
        <span :class="$style.fill" :style="{ color: MUTED }">─────────────</span>
        <nav>
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
        <span :class="$style.edge" :style="{ color: MUTED }">─┐</span>
      </header>

      <header v-else-if="shape === 'dos'" :class="$style.dos" :style="base">
        <span :class="$style.badge" :style="{ background: accentHex, color: BG }">{{ dosPrompt }}</span>
        <span v-if="cursorEffectOn" :class="[$style.cursorBlock, cursorOn && $style.cursorOnState]"></span>
        <nav :class="$style.right">
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
      </header>

      <header v-else-if="shape === 'minimo'" :class="$style.minimo" :style="base">
        <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
          <span v-if="showLogoSlot" :class="$style.markSlot">
            <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" :glitch-enabled="!animationsFrozen" />
          </span>
          <span v-if="showTextSlot" :class="$style.brand" :style="{ color: accentHex }">
            <span :class="$style.wordChars" :style="{ '--falha-a': falhaShiftA, '--falha-b': falhaShiftB, '--falha-band': falhaTearBand }" :data-word="WORD" :data-falha="textAnim === 'falha' && falhaActive" :data-pipboy="textAnim === 'pipboy'" :data-glow="textAnim === 'pipboy' && pipboyGlow" aria-hidden="true">
              <span v-for="(ch, i) in chars" :key="i" :class="$style.letter">{{ ch }}</span>
            </span>
          </span>
          <span v-if="cursorEffectOn" :class="[$style.cursorBlock, cursorOn && $style.cursorOnState]"></span>
        </a>
        <nav :class="$style.right">
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
      </header>

      <header v-else-if="shape === 'menu'" :class="$style.menu" :style="base">
        <div :class="$style.frame" :style="{ borderColor: MUTED }">
          <span :class="$style.brandRow">
            <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
              <span v-if="showLogoSlot" :class="$style.markSlot">
                <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" :glitch-enabled="!animationsFrozen" />
              </span>
              <span v-if="showTextSlot" :class="$style.brand" :style="{ color: accentHex }">
                <span :class="$style.wordChars" :style="{ '--falha-a': falhaShiftA, '--falha-b': falhaShiftB, '--falha-band': falhaTearBand }" :data-word="WORD" :data-falha="textAnim === 'falha' && falhaActive" :data-pipboy="textAnim === 'pipboy'" :data-glow="textAnim === 'pipboy' && pipboyGlow" aria-hidden="true">
                  <span v-for="(ch, i) in chars" :key="i" :class="$style.letter">{{ ch }}</span>
                </span>
              </span>
              <span v-if="cursorEffectOn" :class="[$style.cursorBlock, cursorOn && $style.cursorOnState]"></span>
            </a>
          </span>
          <nav>
            <span v-for="(item, index) in NAV" :key="item" :class="[$style.item, $style.row]">
              <span :class="$style.pointer" :style="{ color: index === 0 ? accentHex : 'transparent' }">▸</span>{{ item }}
            </span>
          </nav>
        </div>
      </header>

      <header v-else :class="$style.ledger" :style="base">
        <p :class="$style.line" :style="{ color: MUTED }">seção 00 / índice · v0.0.1+42 · 449 páginas</p>
        <p :class="$style.brandline">
          <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
            <span v-if="showLogoSlot" :class="$style.markSlot">
              <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" :glitch-enabled="!animationsFrozen" />
            </span>
            <span v-if="showTextSlot" :style="{ color: accentHex }">
              <span :class="$style.wordChars" :style="{ '--falha-a': falhaShiftA, '--falha-b': falhaShiftB, '--falha-band': falhaTearBand }" :data-word="WORD" :data-falha="textAnim === 'falha' && falhaActive" :data-pipboy="textAnim === 'pipboy'" :data-glow="textAnim === 'pipboy' && pipboyGlow" aria-hidden="true">
                <span v-for="(ch, i) in chars" :key="i" :class="$style.letter">{{ ch }}</span>
              </span>
            </span>
            <span v-if="cursorEffectOn" :class="[$style.cursorBlock, cursorOn && $style.cursorOnState]"></span>
          </a>
          <span :style="{ color: MUTED }"> ······································ </span>
          <span>{{ NAV.join(' · ') }}</span>
        </p>
      </header>
    </div>

    <Panel label="cabeçalho">
      <Pick v-model="shape" label="candidato" :options="SHAPE_OPTIONS" />
      <Pick v-model="markCandidate" label="marca" :options="MARK_CANDIDATES.map((c) => ({ id: c.id, name: c.name }))" />
      <Knob v-model="markSizePx" label="tamanho da marca" :min="0" :max="300" :step="4" unit="px" />
      <Pick v-model="markAccentId" label="cor da marca" :options="Object.keys(MARK_ACCENTS).map((id) => ({ id, name: id }))" />
      <Pick v-if="shape !== 'dos'" v-model="brandMode" label="composição da marca" :options="BRAND_MODE_OPTIONS" />
      <label v-if="shape === 'dos'" :class="$style.textField">
        <span :class="$style.textFieldName">prompt do DOS</span>
        <input v-model="dosPrompt" type="text" :class="$style.textFieldInput" placeholder="(vazio)" />
      </label>
      <Pick
        v-model="face"
        label="fonte"
        :options="Object.keys(STACKS).map((id) => ({ id, name: id }))"
      />
      <Pick
        v-model="accent"
        label="destaque"
        :options="Object.keys(ACCENTS).map((id) => ({ id, name: id }))"
      />
      <Knob v-model="tracking" label="entreletra" :min="0" :max="30" unit="/100em" />
      <Knob v-model="density" label="respiro" :min="4" :max="30" />
      <Toggle v-model="caps" label="caixa alta" />
    </Panel>

    <Panel label="cursor">
      <Toggle v-model="cursorEffectOn" label="cursor de bloco" />
      <Pick v-model="cursorRateId" label="taxa" :options="CURSOR_RATE_OPTIONS" />
    </Panel>

    <Panel label="wordmark">
      <Pick v-model="textAnim" label="animação do texto" :options="TEXT_ANIM_OPTIONS" />
      <Knob v-if="textAnim === 'teletipo'" v-model="charMs" label="velocidade da digitação" :min="40" :max="220" :step="10" unit="ms" />
      <Pick v-if="textAnim === 'baud'" v-model.number="baudRate" label="taxa" :options="BAUD_OPTIONS" />
      <Toggle v-if="textAnim === 'pipboy'" v-model="pipboyGlow" label="brilho" />
      <Knob v-if="textAnim === 'falha'" v-model="falhaIntervalSeconds" label="intervalo entre falhas" :min="2" :max="6" :step="0.5" unit="s" />
      <Knob v-if="textAnim !== 'falha'" v-model="holdSeconds" label="repouso antes de repetir" :min="0.5" :max="4" :step="0.1" unit="s" />
      <button type="button" :class="$style.replay" :disabled="animationsFrozen" @click="replay">recomeçar</button>
      <Toggle v-model="manualPause" label="pausar animação (WCAG 2.2.2)" />
      <Toggle v-model="simulateReduced" label="simular prefers-reduced-motion" />
    </Panel>

    <p :class="$style.readout">
      texto {{ inkContrast }}:1 · secundário {{ mutedContrast }}:1 · destaque {{ accentContrast }}:1 sobre
      {{ BG }}. A entreletra é o que separa "terminal" de "costume": acima de 0,2em o cabeçalho vira fantasia e a
      leitura fica lenta. A marca está em {{ markSizePx }}px, na cor
      <template v-if="markAccentIsAll">todas (cada célula no papel dela, pior contraste entre os quatro: {{ markAccentContrast }}:1, o vermelho)</template>
      <template v-else>{{ markAccentId }} ({{ markAccentContrast }}:1)</template>;
      o piso de legibilidade do candidato "{{ labelForMark(markCandidate) }}" é {{ MARK_MIN_PX[markCandidate] }}px,
      porque um caractere por célula encolhe para uma mancha antes de simplesmente ficar menor, o que um vetor não
      faz. O slider vai de 0 a 300px sem parar nesse piso;
      <template v-if="markBelowFloor">o tamanho escolhido está abaixo dele agora.</template>
      <template v-else>o tamanho escolhido está acima dele agora.</template>
      No hover a marca em caractere vira o mesmo desenho sólido do favicon, nas cores de verdade, uma troca seca sem
      transição, desligada sob prefers-reduced-motion.
      {{
        reducedMotionActive
          ? ' Movimento reduzido: o wordmark fica parado por extenso e o cursor fica sólido, o laço nunca começa.'
          : manualPause
            ? ' Pausado.'
            : ' Rodando.'
      }}
      O cursor de bloco, quando ligado, pisca a cada {{ CURSOR_RATES[cursorRateId].toFixed(1) }}ms por fase
      ({{ labelFor(CURSOR_RATE_OPTIONS, cursorRateId) }}), e agora liga em qualquer um dos cinco candidatos, não só no
      "linha de DOS invertida".
    </p>

    <DecisionCopy
      lab="cabeçalho"
      component="ChromeHeader.vue"
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
  padding: 1.4rem 1rem;
  overflow-x: auto;
}

.stage header {
  font-size: 0.78rem;
}

.stage nav {
  display: inline-flex;
  gap: 0.9rem;
}

.markSlot {
  display: inline-flex;
  align-items: center;
  margin-inline-end: 0.5rem;
}

.brandRow {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
}

.item {
  cursor: pointer;
}

.item:hover {
  text-decoration: underline;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.fill {
  flex: 1;
  overflow: hidden;
}

.dos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.badge {
  padding: 0.15rem 0.4rem;
  font-weight: 700;
}

.right {
  margin-inline-start: auto;
}

.minimo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  border-block-end: 1px dotted currentColor;
}

.menu .frame {
  display: inline-grid;
  gap: 0.4rem;
  padding: 0.7rem 1.1rem 0.7rem 0.7rem;
  border: 3px double;
}

.row {
  display: block;
}

.pointer {
  display: inline-block;
  inline-size: 1.2em;
}

.ledger .line {
  margin: 0 0 0.4rem;
  font-size: 0.62rem;
}

.brandline {
  margin: 0;
}

/*
 * O link da marca vive dentro do corpo do post, que é `.prose`.
 * `src/styles/prose/links.css` dá sublinhado tracejado, seta depois e
 * inversão no hover a qualquer `.prose a`. Um cabeçalho de verdade fica em
 * `BaseLayout`, fora de `.prose`, e nunca pega essa regra; o link desta
 * bancada só pega porque ele mora dentro de um post de verdade. Desfazer isto
 * aqui mantém a bancada honesta sobre a aparência de um cabeçalho real, sem
 * mudar nada dos links de prosa de verdade do site. `.prose a` carrega uma
 * classe e um elemento (especificidade 0,1,1); repetir `.brandLink` vence com
 * CSS simples em vez de `!important`, porque duas classes (0,2,0) superam
 * uma classe mais um elemento.
 */
.brandLink.brandLink,
.brandLink.brandLink:hover,
.brandLink.brandLink:focus-visible {
  display: inline-flex;
  align-items: center;
  background: none;
  color: inherit;
  text-decoration-line: none;
}

.brandLink.brandLink::after {
  content: none;
}

.brandLink.brandLink:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.wordChars {
  position: relative;
  display: inline-flex;
  min-inline-size: 8ch;
}

.letter {
  display: inline-block;
}

/* Falha: duas cópias do texto, vermelha e ciano, deslocadas e misturadas por
   cima da real, só durante o estouro; o resto do tempo elas não existem. */
@media (prefers-reduced-motion: no-preference) {
  .wordChars[data-falha='true']::before,
  .wordChars[data-falha='true']::after {
    content: attr(data-word);
    position: absolute;
    inset: 0;
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .wordChars[data-falha='true']::before {
    color: #ff2b4d;
    transform: translateX(var(--falha-a, 0));
  }

  .wordChars[data-falha='true']::after {
    color: #21c8ff;
    transform: translateX(var(--falha-b, 0));
    clip-path: var(--falha-band, inset(0 0 100% 0));
  }
}

/*
 * Pipboy: listras finas por cima do wordmark, a convenção de fã do Pip-Boy da
 * Fallout, não um número de hardware. O site já recusou scanline de CRT de
 * verdade para si mesmo (docs/theming.md seção 8); esta é uma decoração só do
 * wordmark nesta bancada, não uma proposta de reabrir aquela decisão.
 */
.wordChars[data-pipboy='true'] {
  position: relative;
}

.wordChars[data-pipboy='true']::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(to bottom, #00000059 0, #00000059 1px, transparent 1px, transparent 3px);
  pointer-events: none;
}

.wordChars[data-glow='true'] {
  text-shadow:
    0 0 3px currentColor,
    0 0 6px currentColor;
}

.cursorBlock {
  display: inline-block;
  inline-size: 0.55em;
  block-size: 1.1em;
  margin-inline-start: 1px;
  background: transparent;
  vertical-align: text-bottom;
}

.cursorBlock.cursorOnState {
  background: currentColor;
}

.textField {
  display: grid;
  gap: 0.1rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.textFieldName {
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.textFieldInput {
  padding: 0.2rem 0.3rem;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: var(--bg);
  color: var(--fg);
  font: inherit;
}

.textFieldInput:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
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
