<script setup lang="ts">
/**
 * The mark alone, in whichever of the six character-art candidates is
 * selected. Both `ChromeHeader.vue` and `LogoLab.vue` render this component
 * rather than each drawing its own copy, so the header bench shows the real
 * mark in place and the logo bench shows the mark inside a real header
 * instead of the two benches quietly disagreeing on what the mark looks like.
 * Always `aria-hidden`: the accessible name lives on the link that wraps it,
 * in either bench, never in this markup.
 *
 * `sizePx` is a plain pixel number, never an `em`: a character grid has a
 * legibility floor a smooth vector does not, so the size cannot ride the
 * surrounding text's font size. Both callers compute it with
 * `effectiveMarkPx()` from `logoMarks.ts`, which never lets it drop under the
 * candidate's own `MARK_MIN_PX`.
 *
 * `glitchEnabled` is opt-in and only ever does anything for `fio`: the owner
 * asked for the wireframe specifically to glitch, occasionally, the same
 * vocabulary as the wordmark (a swapped glyph, a torn column, a line offset
 * by one cell). Callers that have no reduced-motion/pause state of their own
 * (`ChromeHeader.vue`) simply never pass it, so the mark there stays still
 * rather than gaining a second automatic motion source with no pause control.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  GLITCH_GLYPHS,
  MARK_RECTS,
  ROLE_TOKEN,
  SHAPE,
  ditherBlockAt,
  rampGlyph,
  roleAt,
  wireGlyph,
  type MarkCandidateId,
} from './logoMarks'

const props = defineProps<{ candidate: MarkCandidateId; sizePx: number; glitchEnabled?: boolean }>()

const rows = computed(() => SHAPE.map((row, r) => [...row].map((_, c) => ({ r, c }))))
const ditherRows = computed(() => Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => ditherBlockAt(r, c))))

// --- glitch do contorno: só "fio" usa isto, ocasional, o mesmo vocabulário do wordmark ---
const glitchCell = ref<{ r: number; c: number } | null>(null)
const glitchGlyph = ref('')
const tornColumn = ref<number | null>(null)
const lineOffsetCells = ref(0)
let glitchTimer: ReturnType<typeof setTimeout> | null = null
let glitchResetTimer: ReturnType<typeof setTimeout> | null = null

function clearMarkGlitch(): void {
  if (glitchTimer) clearTimeout(glitchTimer)
  if (glitchResetTimer) clearTimeout(glitchResetTimer)
  glitchTimer = null
  glitchResetTimer = null
  glitchCell.value = null
  tornColumn.value = null
  lineOffsetCells.value = 0
}

function scheduleMarkGlitch(): void {
  if (glitchTimer) clearTimeout(glitchTimer)
  glitchTimer = setTimeout(runMarkGlitch, 2200 + Math.random() * 1800)
}

/**
 * Uma célula trocada, uma coluna rasgada em 1px, ou a grade inteira deslocada
 * em 1 célula: uma área pequena por vez, a cada 2,2 a 4 segundos, a mesma
 * conta de segurança do glitch do wordmark em `LogoLab.vue`.
 */
function runMarkGlitch(): void {
  if (!props.glitchEnabled || props.candidate !== 'fio') {
    scheduleMarkGlitch()
    return
  }
  const kind = Math.floor(Math.random() * 3)
  if (kind === 0) {
    glitchCell.value = { r: Math.floor(Math.random() * 8), c: Math.floor(Math.random() * 8) }
    glitchGlyph.value = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]
  } else if (kind === 1) {
    tornColumn.value = Math.floor(Math.random() * 8)
  } else {
    lineOffsetCells.value = Math.random() < 0.5 ? -1 : 1
  }
  glitchResetTimer = setTimeout(() => {
    glitchCell.value = null
    tornColumn.value = null
    lineOffsetCells.value = 0
    scheduleMarkGlitch()
  }, 180)
}

watch(
  () => [props.glitchEnabled, props.candidate] as const,
  ([enabled, candidate]) => {
    if (enabled && candidate === 'fio') scheduleMarkGlitch()
    else clearMarkGlitch()
  },
  { immediate: true },
)

onUnmounted(clearMarkGlitch)

function glyphAt(row: number, col: number): string {
  if (glitchCell.value && glitchCell.value.r === row && glitchCell.value.c === col) return glitchGlyph.value
  return wireGlyph(row, col)
}
</script>

<template>
  <span :class="$style.mark" :style="{ '--mark-size': `${sizePx}px` }" aria-hidden="true">
    <span
      v-if="candidate === 'fio'"
      :class="[$style.grid, $style.fio]"
      :style="{ transform: `translateX(calc(var(--mark-size) / 8 * ${lineOffsetCells}))` }"
    >
      <span v-for="row in rows" :key="row[0].r" :class="$style.row">
        <span
          v-for="cell in row"
          :key="cell.c"
          :class="[$style.cell, tornColumn === cell.c && $style.torn]"
          >{{ glyphAt(cell.r, cell.c) }}</span
        >
      </span>
    </span>

    <span v-else-if="candidate === 'lattice'" :class="[$style.grid, $style.lattice]">
      <span v-for="row in rows" :key="row[0].r" :class="$style.row">
        <span
          v-for="cell in row"
          :key="cell.c"
          :class="$style.cell"
          :style="{
            color: roleAt(cell.r, cell.c) === '.' ? 'var(--rule)' : ROLE_TOKEN[roleAt(cell.r, cell.c)],
            opacity: roleAt(cell.r, cell.c) === '.' ? 0.35 : 1,
          }"
          >+</span
        >
      </span>
    </span>

    <span v-else-if="candidate === 'mesh'" :class="[$style.grid, $style.mesh]">
      <svg viewBox="0 0 8 8" :class="$style.rings" aria-hidden="true">
        <ellipse cx="4" cy="4" rx="3.5" ry="1.3" />
        <ellipse cx="4" cy="4" rx="1.3" ry="3.5" transform="rotate(35 4 4)" />
      </svg>
      <span v-for="row in rows" :key="row[0].r" :class="$style.row">
        <span v-for="cell in row" :key="cell.c" :class="$style.cell">{{ wireGlyph(cell.r, cell.c) }}</span>
      </span>
    </span>

    <span v-else-if="candidate === 'ramp'" :class="[$style.grid, $style.ramp]">
      <span v-for="row in rows" :key="row[0].r" :class="$style.row">
        <span v-for="cell in row" :key="cell.c" :class="$style.cell">{{ rampGlyph(cell.r, cell.c) }}</span>
      </span>
    </span>

    <span v-else-if="candidate === 'dither'" :class="[$style.grid, $style.dither]">
      <span v-for="(row, r) in ditherRows" :key="r" :class="$style.row">
        <span v-for="(block, c) in row" :key="c" :class="$style.ditherCell" :style="{ color: block?.tone ?? 'transparent' }">{{
          block?.glyph ?? ' '
        }}</span>
      </span>
    </span>

    <svg v-else viewBox="0 0 64 64" :class="$style.svg">
      <!-- franja cromática amolecida: desfoque leve e deslocamento menor, o suficiente para ler
           como uma máquina falhando, não como uma cópia nítida e deliberada. -->
      <g :class="$style.fringeRed">
        <rect v-for="(rect, i) in MARK_RECTS" :key="`r${i}`" :x="rect.x - 1.2" :y="rect.y" :width="rect.w" :height="rect.h" fill="var(--brand-red)" />
      </g>
      <g :class="$style.fringeBlue">
        <rect v-for="(rect, i) in MARK_RECTS" :key="`b${i}`" :x="rect.x + 1.2" :y="rect.y" :width="rect.w" :height="rect.h" fill="var(--brand-blue)" />
      </g>
      <rect v-for="(rect, i) in MARK_RECTS" :key="i" :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" :fill="ROLE_TOKEN[rect.role]" />
      <!-- pixels perdidos, mais apagados que antes: uma falha ao fundo, não um detalhe desenhado. -->
      <rect x="67" y="6" width="2" height="5" fill="var(--brand-green)" opacity="0.4" :class="$style.strayPixel" />
      <rect x="-3" y="44" width="2" height="8" fill="var(--brand-blue)" opacity="0.32" :class="$style.strayPixel" />
      <rect x="71" y="30" width="2" height="12" fill="var(--brand-yellow)" opacity="0.24" :class="$style.strayPixel" />
    </svg>
  </span>
</template>

<style module>
.mark {
  --mark-size: 72px;
  position: relative;
  display: inline-flex;
  inline-size: var(--mark-size);
  block-size: var(--mark-size);
  flex-shrink: 0;
  /* O piso de legibilidade vem do tamanho pedido, nunca de um glifo maior que
     a própria célula: sem isto, um font-size desproporcional podia pintar
     fora da caixa da marca e colidir com o que vem depois dela na linha. */
  overflow: hidden;
}

.svg {
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.fringeRed,
.fringeBlue {
  mix-blend-mode: screen;
  opacity: 0.32;
  filter: blur(0.6px);
}

.strayPixel {
  filter: blur(0.4px);
}

.grid {
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  block-size: 100%;
  font-family: var(--font-mono);
  line-height: 1;
}

.row {
  display: flex;
  flex: 1;
}

.cell {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--fg);
  /* A grade tem 8 colunas, então o glifo tem que caber em mark-size/8: um
     divisor menor (era 6) desenhava um caractere maior que a própria célula,
     que a fonte não recorta sozinha, e a marca pintava por cima do que vinha
     depois dela na linha. */
  font-size: calc(var(--mark-size) / 8);
}

.fio .cell {
  /* O pedido foi "mais definido": um traço mais grosso lê como contorno
     desenhado, não como texto fino. */
  font-weight: 700;
}

.torn {
  transform: translateY(1px);
}

.mesh {
  position: relative;
  background: color-mix(in oklab, var(--brand-blue) 35%, var(--bg));
}

.mesh .cell {
  color: var(--accent);
}

.rings {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  fill: none;
  stroke: var(--accent);
  stroke-width: 0.4;
  opacity: 0.55;
  pointer-events: none;
}

.ditherCell {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  /* A grade de dither tem 4 colunas, então mark-size/4 é a célula real; era
     /3.2, maior que a célula, pelo mesmo motivo do .cell acima. */
  font-size: calc(var(--mark-size) / 4);
}
</style>
