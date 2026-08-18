<script setup lang="ts">
/**
 * The mark alone, in whichever of the six character-art candidates is
 * selected. Both `ChromeHeader.vue` and `LogoLab.vue` render this component
 * rather than each drawing its own copy, so the header bench shows the real
 * mark in place and the logo bench shows the mark inside a real header
 * instead of the two benches quietly disagreeing on what the mark looks like.
 * Always `aria-hidden`: the accessible name lives on the link that wraps it,
 * in either bench, never in this markup.
 */
import { computed } from 'vue'
import { MARK_RECTS, ROLE_TOKEN, SHAPE, ditherBlockAt, rampGlyph, roleAt, wireGlyph, type MarkCandidateId } from './logoMarks'

withDefaults(defineProps<{ candidate: MarkCandidateId; size?: string }>(), { size: '1.5em' })

const rows = computed(() => SHAPE.map((row, r) => [...row].map((_, c) => ({ r, c }))))
const ditherRows = computed(() => Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => ditherBlockAt(r, c))))
</script>

<template>
  <span :class="$style.mark" :style="{ '--mark-size': size }" aria-hidden="true">
    <span v-if="candidate === 'fio'" :class="[$style.grid, $style.fio]">
      <span v-for="row in rows" :key="row[0].r" :class="$style.row">
        <span v-for="cell in row" :key="cell.c" :class="$style.cell">{{ wireGlyph(cell.r, cell.c) }}</span>
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
      <!-- franja cromática: uma cópia vermelha e uma azul, cada uma fora de registro por dois
           pixels, atrás da arte real. É a mesma ideia de um retrato em pixel art glitched. -->
      <g :class="$style.fringeRed">
        <rect v-for="(rect, i) in MARK_RECTS" :key="`r${i}`" :x="rect.x - 2" :y="rect.y" :width="rect.w" :height="rect.h" fill="var(--brand-red)" />
      </g>
      <g :class="$style.fringeBlue">
        <rect v-for="(rect, i) in MARK_RECTS" :key="`b${i}`" :x="rect.x + 2" :y="rect.y" :width="rect.w" :height="rect.h" fill="var(--brand-blue)" />
      </g>
      <rect v-for="(rect, i) in MARK_RECTS" :key="i" :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" :fill="ROLE_TOKEN[rect.role]" />
      <!-- pixels perdidos: colunas que se soltam da silhueta, estáticas de propósito, sem
           nenhum quadro a mais que pudesse virar uma pisca. -->
      <rect x="67" y="6" width="2" height="5" fill="var(--brand-green)" opacity="0.7" />
      <rect x="-3" y="44" width="2" height="8" fill="var(--brand-blue)" opacity="0.6" />
      <rect x="71" y="30" width="2" height="12" fill="var(--brand-yellow)" opacity="0.5" />
    </svg>
  </span>
</template>

<style module>
.mark {
  --mark-size: 1.5em;
  position: relative;
  display: inline-flex;
  inline-size: var(--mark-size);
  block-size: var(--mark-size);
  flex-shrink: 0;
}

.svg {
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
}

.fringeRed,
.fringeBlue {
  mix-blend-mode: screen;
  opacity: 0.5;
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
  font-size: calc(var(--mark-size) / 6);
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
  font-size: calc(var(--mark-size) / 3.2);
}
</style>
