<script setup lang="ts">
/**
 * The mark alone, in whichever of the two surviving character-art candidates
 * is selected. `ChromeHeader.vue` renders this component rather than drawing
 * its own copy, so every header shape shows the real mark in place.
 * Always `aria-hidden`: the accessible name lives on the link that wraps it,
 * never in this markup.
 *
 * `sizePx` is a plain pixel number, never an `em`: a character grid has a
 * legibility floor a smooth vector does not, so the size cannot ride the
 * surrounding text's font size. `MARK_MIN_PX` in `logoMarks.ts` is the floor
 * for each candidate; it used to be enforced here as a hard clamp, and now it
 * is only advisory (the owner asked for the full 0-300px range), so whatever
 * `sizePx` the caller passes is drawn as given.
 *
 * `accentColor` is the single brand colour both candidates draw in for every
 * solid-accent choice in the picker, the same "one accent, not a rainbow per
 * cell" idea `ChromeHeader.vue` already uses for the rest of the header.
 *
 * `multiAccent` is the owner's request for the rainbow back, as an option
 * rather than the only mode: when true, `accentColor` is ignored and each
 * cell instead takes the brand colour of the region it belongs to
 * (`ROLE_TOKEN`, resolved through `rectRoleAt` in `logoMarks.ts`), the same
 * five colours the hover-solid mark and `public/favicon.svg` already draw.
 * Both candidates support it; `cellColor` below is the single place that
 * decides between the two modes per cell.
 *
 * On hover (the parent link's hover, via `:global(a):hover`), the character
 * art swaps to the true five-rectangle solid mark traced from
 * `public/favicon.svg`, drawn in the mark's own real colours rather than
 * whatever `accentColor` was chosen: a hard swap rather than a cross-fade, to
 * stay in the site's pixel-era vocabulary. `prefers-reduced-motion: reduce`
 * turns the whole hover rule off, and both boxes are absolutely positioned
 * inside the same fixed-size `.mark`, so nothing shifts layout either way.
 *
 * `glitchEnabled` is opt-in and only ever does anything for `fio`: the owner
 * asked for the wireframe specifically to glitch, occasionally, the same
 * vocabulary as the wordmark (a swapped glyph, a torn column, a line offset
 * by one cell). Callers with no reduced-motion/pause state of their own
 * simply never pass it, so the mark stays still rather than gaining a second
 * automatic motion source with no pause control.
 *
 * `glitchPulse` is who decides when: this component never schedules its own
 * glitch anymore. It used to run its own 2.2-4s loop internally; the winning
 * header now drives one shared ambient schedule (4-20s, bursts of 1-3) for
 * both the wordmark and the mark, so `ChromeHeader.vue` increments this
 * number once per pulse and this component just reacts, the same visual
 * glitch as before, a different caller deciding the rhythm.
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { GLITCH_GLYPHS, MARK_RECTS, rectRoleAt, ROLE_TOKEN, roleAt, wireGlyph, type MarkCandidateId } from './logoMarks'

const props = withDefaults(
  defineProps<{ candidate: MarkCandidateId; sizePx: number; accentColor?: string; multiAccent?: boolean; glitchEnabled?: boolean; glitchPulse?: number }>(),
  { accentColor: 'var(--fg)', multiAccent: false, glitchPulse: 0 },
)

const rows = computed(() => Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ r, c }))))

// --- glitch do contorno: só "fio" usa isto, disparado de fora (glitchPulse), nunca por um relógio próprio ---
const glitchCell = ref<{ r: number; c: number } | null>(null)
const glitchGlyph = ref('')
const tornColumn = ref<number | null>(null)
const lineOffsetCells = ref(0)
let glitchResetTimer: ReturnType<typeof setTimeout> | null = null

function resetMarkGlitch(): void {
  if (glitchResetTimer) clearTimeout(glitchResetTimer)
  glitchResetTimer = null
  glitchCell.value = null
  tornColumn.value = null
  lineOffsetCells.value = 0
}

/**
 * Uma célula trocada, uma coluna rasgada em 1px, ou a grade inteira deslocada
 * em 1 célula: uma área pequena por vez, por 180ms, a cada pulso que
 * `glitchPulse` anuncia.
 */
function fireMarkGlitch(): void {
  if (!props.glitchEnabled || props.candidate !== 'fio') return
  if (glitchResetTimer) clearTimeout(glitchResetTimer)
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
  }, 180)
}

watch(() => props.glitchPulse, fireMarkGlitch)

// prefers-reduced-motion e a pausa manual chegam aqui como `glitchEnabled: false`; a marca trava no
// quadro de repouso na hora, nunca no meio de um glitch em andamento.
watch(
  () => props.glitchEnabled,
  (enabled) => {
    if (!enabled) resetMarkGlitch()
  },
)

onUnmounted(resetMarkGlitch)

function glyphAt(row: number, col: number): string {
  if (glitchCell.value && glitchCell.value.r === row && glitchCell.value.c === col) return glitchGlyph.value
  return wireGlyph(row, col)
}

/**
 * A cor de uma célula, para os dois candidatos: vazia usa a régua do fundo, e
 * preenchida usa `accentColor` sempre que `multiAccent` está desligado (o
 * modo de hoje). Ligado, cada célula preenchida troca para a cor do papel que
 * `rectRoleAt` resolve para ela, a marca original de volta como opção.
 */
function cellColor(row: number, col: number): string {
  if (roleAt(row, col) === '.') return 'var(--rule)'
  if (!props.multiAccent) return 'var(--mark-ink)'
  return ROLE_TOKEN[rectRoleAt(row, col)] ?? 'var(--mark-ink)'
}
</script>

<template>
  <span :class="$style.mark" :style="{ '--mark-size': `${sizePx}px`, '--mark-ink': accentColor }" aria-hidden="true">
    <span :class="$style.charArt">
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
            :style="{ color: cellColor(cell.r, cell.c) }"
            >{{ glyphAt(cell.r, cell.c) }}</span
          >
        </span>
      </span>

      <span v-else :class="[$style.grid, $style.lattice]">
        <span v-for="row in rows" :key="row[0].r" :class="$style.row">
          <span
            v-for="cell in row"
            :key="cell.c"
            :class="$style.cell"
            :style="{
              color: cellColor(cell.r, cell.c),
              opacity: roleAt(cell.r, cell.c) === '.' ? 0.35 : 1,
            }"
            >+</span
          >
        </span>
      </span>
    </span>

    <svg viewBox="0 0 64 64" :class="$style.solid" aria-hidden="true">
      <rect v-for="(rect, i) in MARK_RECTS" :key="i" :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" :fill="ROLE_TOKEN[rect.role]" />
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

/* Contorno em caractere e marca sólida ocupam a mesma caixa, então trocar de
   um para o outro no hover nunca move nada ao redor: o tamanho de `.mark` não
   muda, só qual dos dois filhos está visível. */
.charArt,
.solid {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
}

.solid {
  display: none;
  overflow: visible;
}

/* Troca seca, sem opacidade nem transição: o vocabulário pixel do site troca
   de quadro, não esmaece de um para o outro. Sob prefers-reduced-motion:
   reduce a regra de hover inteira some, e a marca em caractere nunca muda. */
@media (prefers-reduced-motion: no-preference) {
  :global(a):hover .mark .charArt {
    display: none;
  }

  :global(a):hover .mark .solid {
    display: block;
  }
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
  color: var(--mark-ink);
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
</style>
