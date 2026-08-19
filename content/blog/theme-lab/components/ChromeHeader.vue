<script setup lang="ts">
/**
 * O cabeçalho decidido: a barra de caixa `┌─┐`, com a marca de verdade dentro
 * dela. Só caractere, nenhuma imagem, nenhum ícone, nada que precise de
 * requisição.
 *
 * Esta bancada absorveu a antiga seção 03 (`LogoLab.vue`, agora removida): o
 * dono pediu para fundir as duas, porque as duas mostravam a mesma marca
 * dentro do mesmo tipo de cabeçalho, só em lugares separados da página. O que
 * era exclusivo do logo (o wordmark que digita e apaga, o glitch, a pausa e o
 * `prefers-reduced-motion`) mora aqui agora, ao lado do que já era exclusivo
 * do cabeçalho (fonte, destaque, entreletra, respiro).
 *
 * Cinco formas disputaram esta moldura; só a barra de caixa venceu. As outras
 * quatro (linha de DOS invertida, mínimo, menu de Game Boy, razão SEÇÃO 00 /
 * ÍNDICE) moraram aqui e agora estão em
 * `content/blog/theme-lab-arquivo/components/RetiredChromeHeaderShapes.vue`,
 * funcionando, com o motivo de cada uma. O `dosPrompt` editável, exclusivo da
 * forma "dos", foi junto: esta bancada não tem mais nenhuma leitura em que a
 * marca é o próprio prompt.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import {
  CURSOR_RAMP_FRAMES,
  CURSOR_RAMP_MS,
  CURSOR_RATES,
  CURSOR_RATE_OPTIONS,
  labelForMark,
  MARK_ACCENT_ALL_ID,
  MARK_ACCENTS,
  MARK_CANDIDATES,
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

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

// Os valores de partida são a decisão, não um palpite: é o que a bancada mostra ao abrir.
const face = ref('departure')
const accent = ref('amarelo')
const tracking = ref(6)
const density = ref(4)
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
 * abaixo), nunca mais um limite que o slider recusa. Trocar de marca troca só
 * a marca; o tamanho escolhido atravessa a troca, nenhum watcher reescreve
 * `markSizePx` sozinho.
 */
const markCandidate = ref<MarkCandidateId>('fio')
// 36px é abaixo do piso de legibilidade do "fio" (72px, ver `MARK_MIN_PX`), de propósito: o dono viu o piso
// e escolheu ficar abaixo dele mesmo assim. `markBelowFloor` só avisa, nunca trava o slider.
const markSizePx = ref(36)
const markBelowFloor = computed(() => markSizePx.value < MARK_MIN_PX[markCandidate.value])

/**
 * A cor da marca: um seletor de acento único, a mesma ideia do "destaque" do
 * resto do cabeçalho, mais a exceção `todas` (`MARK_ACCENT_ALL_ID`), a marca
 * original de volta, cada célula na cor do seu próprio papel em vez de um
 * acento só. A decisão foi exatamente essa exceção.
 */
const markAccentId = ref(MARK_ACCENT_ALL_ID)
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
 * Composição da marca: logo, texto, ou os dois. A decisão foi "ambos". O
 * candidato "linha de DOS invertida", a única leitura em que o próprio prompt
 * já era a marca e o logo nunca aparecia ao lado, perdeu e está arquivado em
 * `theme-lab-arquivo/components/RetiredChromeHeaderShapes.vue`; esta bancada
 * não precisa mais da exceção que ele exigia aqui.
 */
const BRAND_MODE_OPTIONS = [
  { id: 'ambos', name: 'logo + texto' },
  { id: 'logo', name: 'só o logo' },
  { id: 'texto', name: 'só o texto' },
]
const brandMode = ref('ambos')
const showLogoSlot = computed(() => brandMode.value !== 'texto')
const showTextSlot = computed(() => brandMode.value !== 'logo')

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
// A decisão foi "decifra", a única das cinco arquivada como opção do candidato vencedor
// (as outras quatro seguem aqui, no painel "wordmark" abaixo).
const textAnim = ref('decifra')

// teletipo: Teletype Model 33 ASR, 10 caracteres/s a 110 baud, 100ms/caractere de verdade.
// A bancada não abre nesse número: o dono pediu mais devagar, então o padrão aqui é 220ms
// (o teto do knob), e o 100ms de verdade fica só registrado neste comentário.
const charMs = ref(220)
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
// LOVE, 2011, não documentam uma). Chegou a usar o tique do próprio Doom, 28ms, rápido demais
// perto do cursor de bloco ao lado: o dono pediu o mesmo tempo do cursor, então o tique agora
// é `CURSOR_RATES.terminal`, 530ms, a mesma fase da taxa "terminal" do cursor. Cada caractere
// ainda escalona 5 tiques antes de travar (`queue` abaixo), então resolver o nome inteiro leva
// vários segundos agora, de propósito: é o mesmo "um terminal é paciente" que já justifica a
// taxa "terminal" do cursor.
const DECIFRA_TICK_MS = CURSOR_RATES.terminal
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

/**
 * Decifra: cada caractere escala um atraso próprio (20 a 80ms, mais o índice a `DECIFRA_TICK_MS`) e só
 * então passa a trocar de glifo a cada `DECIFRA_TICK_MS` até travar na letra final. Uma vez travado, o
 * nome fica resolvido: nenhum `holdTimer` reagenda `runDecifra` de novo, o decidido foi "toca uma vez e
 * fica". Ver o botão "recomeçar" abaixo para tocar de novo, e o glitch ambiente (`scheduleAmbientGlitch`)
 * para o que mantém o cabeçalho vivo depois que o nome resolve.
 */
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
    if (allLocked) clearDecifraTimer()
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

/**
 * Glitch ambiente: o que substitui o antigo laço de "decifra resolve, espera, decifra de novo".
 * Agora que decifra resolve uma vez só, o cabeçalho ficaria parado para sempre sem isto. A cada
 * 4 a 20 segundos (sorteado de novo a cada disparo, `Math.random()` de verdade, não hash: isto é
 * uma animação ao vivo, não uma capa de build que precisa reproduzir), uma rajada de 1 a 3
 * glitches em sequência mexe no wordmark e na marca ao mesmo tempo.
 *
 * O wordmark reaproveita o mesmo mecanismo visual do "falha" (`falhaActive`/`falhaShiftA`/
 * `falhaShiftB`/`falhaTearBand`), só que disparado por este relógio em vez do de `runFalha`; por
 * isso `data-falha` no template não olha mais para `textAnim === 'falha'`, olha só para
 * `falhaActive`. A marca reaproveita o glitch que `LogoMark.vue` já tinha para o candidato "fio"
 * (`glitchPulse`, abaixo): nenhum glitch novo foi escrito, só uma segunda origem para o mesmo.
 *
 * Cada pulso dura 80 a 150ms, o mesmo estouro curto do "falha", bem abaixo de qualquer piso da
 * WCAG 2.3.1, e no máximo três pulsos a cada 4 segundos é uma fração do limite de três trocas
 * por segundo daquela regra.
 */
const AMBIENT_GLITCH_MIN_S = 4
const AMBIENT_GLITCH_MAX_S = 20
const markGlitchPulse = ref(0)
let ambientTimer: ReturnType<typeof setTimeout> | null = null
let ambientPulseTimer: ReturnType<typeof setTimeout> | null = null

function clearAmbientTimers(): void {
  if (ambientTimer) clearTimeout(ambientTimer)
  if (ambientPulseTimer) clearTimeout(ambientPulseTimer)
  ambientTimer = null
  ambientPulseTimer = null
}

function scheduleAmbientGlitch(): void {
  clearAmbientTimers()
  const delayMs = (AMBIENT_GLITCH_MIN_S + Math.random() * (AMBIENT_GLITCH_MAX_S - AMBIENT_GLITCH_MIN_S)) * 1000
  ambientTimer = setTimeout(() => runAmbientBurst(1 + Math.floor(Math.random() * 3)), delayMs)
}

function pulseAmbientGlitch(): void {
  falhaShiftA.value = `${(Math.random() * 4 - 2).toFixed(1)}px`
  falhaShiftB.value = `${(Math.random() * 4 - 2).toFixed(1)}px`
  falhaTearBand.value = `inset(${Math.floor(Math.random() * 60)}% 0 ${Math.floor(Math.random() * 30)}% 0)`
  falhaActive.value = true
  markGlitchPulse.value += 1
  ambientPulseTimer = setTimeout(() => {
    falhaActive.value = false
  }, 80 + Math.random() * 70)
}

function runAmbientBurst(remaining: number): void {
  pulseAmbientGlitch()
  if (remaining > 1) {
    ambientTimer = setTimeout(() => runAmbientBurst(remaining - 1), 200 + Math.random() * 200)
    return
  }
  scheduleAmbientGlitch()
}

function stopAmbientGlitch(): void {
  clearAmbientTimers()
  falhaActive.value = false // quadro de repouso: sem franja, sem deslocamento
}

// --- cursor de bloco: era exclusivo do candidato "dos", agora é um efeito à parte que qualquer um pode ligar ---
const cursorEffectOn = ref(true)
const cursorRateId = ref('terminal')
const cursorFrame = ref(0)
let cursorTimer: ReturnType<typeof setInterval> | null = null

/**
 * A tabela de opacidade de um ciclo inteiro, montada a partir da taxa escolhida.
 *
 * Um ciclo são duas fases (aceso, apagado) e cada fase dura exatamente o ritmo escolhido,
 * então trocar de taxa não muda nada além do que ela já mudava antes. Dentro da fase, os
 * quadros ficam parados no valor dela até os últimos `CURSOR_RAMP_FRAMES`, que interpolam
 * até o valor da próxima. A rampa cabe dentro da fase em vez de se somar a ela: é isso que
 * mantém o ciclo em 2x o ritmo e não em 6x, que foi o problema da tentativa anterior.
 *
 * Todo quadro é um degrau duro, com o relógio rodando a `CURSOR_RAMP_MS` (90ms, ~11 quadros
 * por segundo). A taxa de quadros baixa é o ponto: é ela que dá a leitura de máquina antiga.
 * Uma transição CSS no mesmo intervalo daria um fade liso, que é exatamente o que não se
 * quer aqui.
 *
 * O quadro 0 é sempre o aceso cheio, então travar em repouso é voltar o índice a 0.
 */
const cursorFrames = computed(() => {
  const perPhase = Math.max(CURSOR_RAMP_FRAMES + 1, Math.round(CURSOR_RATES[cursorRateId.value] / CURSOR_RAMP_MS))
  const hold = perPhase - CURSOR_RAMP_FRAMES
  const frames: number[] = []
  for (const [from, to] of [
    [1, 0],
    [0, 1],
  ]) {
    for (let i = 0; i < hold; i += 1) frames.push(from)
    // +1 no divisor para que a rampa nunca chegue no destino antes da hora: o destino é o
    // primeiro quadro da próxima fase, não o último desta.
    for (let i = 1; i <= CURSOR_RAMP_FRAMES; i += 1) frames.push(from + ((to - from) * i) / (CURSOR_RAMP_FRAMES + 1))
  }
  return frames
})
const cursorOpacity = computed(() => cursorFrames.value[cursorFrame.value % cursorFrames.value.length] ?? 1)

/**
 * WCAG 2.3.1 honestamente, não por contagem de degraus, a mesma leitura que `docs/design.md`
 * já fez para a taxa de geração do Conway: em 228,6ms (Doom) o cursor troca de degrau cerca
 * de 4,4 vezes por segundo, acima de "três trocas por segundo" só de contar trocas. Mas
 * 2.3.1 não conta trocas: define flash como uma troca de luminância pareada de 10% ou mais
 * do máximo, numa área de cerca de 21.824px². O cursor desta bancada mede 0,55em por 1,1em,
 * bem abaixo de 100px² no tamanho de tipo do bench, ordens de grandeza abaixo do piso de
 * área, em qualquer uma das três taxas. E um degrau de sombra troca menos densidade de tinta
 * do que um blink binário cheio trocaria (25% por degrau contra 100% de um aceso/apagado),
 * então o argumento de luminância fica mais folgado aqui do que no cursor binário de antes,
 * não mais apertado. Nenhuma das três taxas aciona 2.3.1, nem a mais rápida.
 */
function startCursor(): void {
  if (cursorTimer) clearInterval(cursorTimer)
  // O relógio bate na taxa de quadros da rampa, não no ritmo do pisca: o ritmo já está
  // embutido no comprimento da tabela, então uma taxa mais lenta só produz mais quadros
  // parados antes da rampa, nunca uma rampa mais arrastada.
  cursorTimer = setInterval(() => {
    cursorFrame.value = (cursorFrame.value + 1) % cursorFrames.value.length
  }, CURSOR_RAMP_MS)
}
function stopCursor(): void {
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = null
  cursorFrame.value = 0 // quadro de repouso: aceso cheio, nunca um degrau intermediário
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
    stopAmbientGlitch()
  } else {
    startTextAnim()
    if (cursorEffectOn.value) startCursor()
    scheduleAmbientGlitch()
  }
})

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = mediaQuery.matches
  mediaQuery.addEventListener('change', syncOsReduced)
  if (!animationsFrozen.value) {
    startTextAnim()
    if (cursorEffectOn.value) startCursor()
    scheduleAmbientGlitch()
  }
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncOsReduced)
  clearStepTimer()
  clearHoldTimer()
  clearDecifraTimer()
  clearFalhaTimer()
  stopCursor()
  clearAmbientTimers()
})

const decisionSettings = computed(() => [
  { label: 'candidato', value: 'barra de caixa ┌─┐ (decidido, as outras quatro formas estão em theme-lab-arquivo)' },
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
  { label: 'composição da marca', value: labelFor(BRAND_MODE_OPTIONS, brandMode.value) },
  { label: 'fonte', value: face.value },
  { label: 'destaque', value: `${accent.value} (${accentHex.value})` },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'respiro', value: String(density.value) },
  { label: 'caixa alta', value: caps.value ? 'sim' : 'não' },
  { label: 'animação do texto', value: labelFor(TEXT_ANIM_OPTIONS, textAnim.value) },
  {
    label: 'cursor de bloco',
    value: cursorEffectOn.value
      ? `ligado, ${labelFor(CURSOR_RATE_OPTIONS, cursorRateId.value)} por fase, troca em ${CURSOR_RAMP_FRAMES} quadros de opacidade a ${CURSOR_RAMP_MS}ms cada`
      : 'desligado',
  },
  {
    label: 'glitch ambiente',
    value: `entre ${AMBIENT_GLITCH_MIN_S} e ${AMBIENT_GLITCH_MAX_S}s, sorteado a cada disparo, rajada de 1 a 3 no wordmark e na marca`,
  },
])

const decisionContext = computed(
  () =>
    `Texto ${inkContrast.value}:1 · secundário ${mutedContrast.value}:1 · destaque ${accentContrast.value}:1 sobre ${BG}. ` +
    'prefers-reduced-motion e a pausa manual travam o wordmark, o cursor e o glitch ambiente no quadro de repouso (nome inteiro, sem cursor piscando, sem franja), nunca no meio de um quadro.',
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
      <header :class="$style.bar" :style="base">
        <span :class="$style.edge" :style="{ color: MUTED }">┌─</span>
        <a href="#" aria-label="lsantos.dev" :class="$style.brandLink" @click.prevent>
          <span v-if="showLogoSlot" :class="$style.markSlot">
            <LogoMark :candidate="markCandidate" :size-px="markSizePx" :accent-color="markAccentColor" :multi-accent="markAccentIsAll" :glitch-enabled="!animationsFrozen" :glitch-pulse="markGlitchPulse" />
          </span>
          <span v-if="showTextSlot" :class="$style.brand" :style="{ color: accentHex }">
            <span :class="$style.wordChars" :style="{ '--falha-a': falhaShiftA, '--falha-b': falhaShiftB, '--falha-band': falhaTearBand }" :data-word="WORD" :data-falha="falhaActive" :data-pipboy="textAnim === 'pipboy'" :data-glow="textAnim === 'pipboy' && pipboyGlow" aria-hidden="true">
              <span v-for="(ch, i) in chars" :key="i" :class="$style.letter">{{ ch }}</span>
            </span>
          </span>
          <span
            v-if="cursorEffectOn"
            :class="$style.cursorBlock"
            :style="{ opacity: cursorOpacity }"
            aria-hidden="true"
            ></span
          >
        </a>
        <span :class="$style.fill" :style="{ color: MUTED }">─────────────</span>
        <nav>
          <span v-for="item in NAV" :key="item" :class="$style.item">{{ item }}</span>
        </nav>
        <span :class="$style.edge" :style="{ color: MUTED }">─┐</span>
      </header>
    </div>

    <Panel label="cabeçalho">
      <Pick v-model="markCandidate" label="marca" :options="MARK_CANDIDATES.map((c) => ({ id: c.id, name: c.name }))" />
      <Knob v-model="markSizePx" label="tamanho da marca" :min="0" :max="300" :step="4" unit="px" />
      <Pick v-model="markAccentId" label="cor da marca" :options="Object.keys(MARK_ACCENTS).map((id) => ({ id, name: id }))" />
      <Pick v-model="brandMode" label="composição da marca" :options="BRAND_MODE_OPTIONS" />
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
      <Knob v-if="textAnim !== 'falha' && textAnim !== 'decifra'" v-model="holdSeconds" label="repouso antes de repetir" :min="0.5" :max="4" :step="0.1" unit="s" />
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
      O cursor de bloco, quando ligado, fica {{ CURSOR_RATES[cursorRateId].toFixed(1) }}ms em cada fase
      ({{ labelFor(CURSOR_RATE_OPTIONS, cursorRateId) }}), então o ciclo inteiro dura
      {{ (CURSOR_RATES[cursorRateId] * 2).toFixed(0) }}ms, o mesmo de sempre. O que mudou é a troca entre aceso e
      apagado: ela passa por {{ CURSOR_RAMP_FRAMES }} quadros de opacidade a {{ CURSOR_RAMP_MS }}ms cada, cerca de
      {{ (1000 / CURSOR_RAMP_MS).toFixed(0) }} quadros por segundo, baixo de propósito. A rampa cabe dentro da fase
      em vez de somar a ela, que foi o erro da tentativa de antes com os quatro sombreados do CP437: seis degraus de
      uma fase cada davam {{ (CURSOR_RATES[cursorRateId] * 6).toFixed(0) }}ms de ciclo. Sobre WCAG 2.3.1: mesmo
      Doom, a mais rápida das três taxas, o critério pede uma troca de luminância pareada de 10% ou mais numa área
      de cerca de 21.824px², e este cursor mede bem menos de 100px² no tipo do bench, então nenhuma das três taxas
      aciona a regra, e um degrau de opacidade move menos luminância que o aceso/apagado cheio movia. O cursor virou
      efeito à parte de qualquer forma de cabeçalho, não mais exclusivo de nenhuma leitura.
    </p>
    <p :class="$style.readout">
      A animação "decifra" agora tica no mesmo {{ DECIFRA_TICK_MS }}ms da fase "terminal" do cursor, em
      vez dos 28ms do menu do Doom: o mesmo tempo, não mais rápido. Ela resolve uma vez e para, sem repetir sozinha;
      o botão "recomeçar" acima toca de novo sob demanda. Depois de resolver, um glitch ambiente mexe no wordmark e
      na marca a um intervalo sorteado entre {{ AMBIENT_GLITCH_MIN_S }} e {{ AMBIENT_GLITCH_MAX_S }}s, em rajadas de
      1 a 3, com sorteio de verdade a cada disparo, nunca reproduzível. prefers-reduced-motion, a simulação
      da bancada e a pausa manual travam os três (wordmark, cursor, glitch) no quadro de repouso: o nome inteiro,
      sem cursor piscando e sem franja de glitch.
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

/*
 * Bloco liso de sempre, 0,55em por 1,1em, perto do aspecto 9:16 (0,5625) da PxPlus IBM VGA8.
 * A opacidade vem do estilo inline, quadro a quadro, e não há transição CSS nenhuma aqui de
 * propósito: uma transição faria a troca virar um fade liso, e o degrau duro é justamente a
 * leitura de baixa taxa de quadros que se quer.
 */
.cursorBlock {
  display: inline-block;
  inline-size: 0.55em;
  block-size: 1.1em;
  margin-inline-start: 1px;
  background: currentColor;
  line-height: 1.1em;
  vertical-align: text-bottom;
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
