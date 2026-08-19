<script setup lang="ts">
/**
 * As quatro marcas recusadas, ainda desenhando de verdade.
 *
 * Nenhum slider: a decisão fechou em `fio` e `lattice`, e um controle numa
 * decisão fechada só convida a reabrir, a mesma regra de `RetiredFaces.vue`.
 * Cada card renderiza a mesma silhueta 8x8 (`logoMarks.ts`, sem repetir a
 * trace) do jeito que aquele candidato a desenhava, com o motivo de ter
 * perdido logo abaixo.
 */
import { computed } from 'vue'
import {
  MARK_RECTS,
  RETIRED_MARKS,
  ROLE_TOKEN,
  SHAPE,
  ditherBlockAt,
  rampGlyph,
  wireGlyph,
} from './logoMarks-retiradas'

const MARK_SIZE = 96

const rows = computed(() => SHAPE.map((row, r) => [...row].map((_, c) => ({ r, c }))))
const ditherRows = computed(() => Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => ditherBlockAt(r, c))))
</script>

<template>
  <div :class="$style.wrap">
    <article v-for="mark in RETIRED_MARKS" :key="mark.id" :class="$style.card">
      <header :class="$style.head">
        <span :class="$style.name">{{ mark.name }}</span>
      </header>

      <div :class="$style.stage">
        <span :class="$style.mark" :style="{ '--mark-size': `${MARK_SIZE}px` }" aria-hidden="true">
          <span v-if="mark.id === 'mesh'" :class="[$style.grid, $style.mesh]">
            <svg viewBox="0 0 8 8" :class="$style.rings" aria-hidden="true">
              <ellipse cx="4" cy="4" rx="3.5" ry="1.3" />
              <ellipse cx="4" cy="4" rx="1.3" ry="3.5" transform="rotate(35 4 4)" />
            </svg>
            <span v-for="row in rows" :key="row[0].r" :class="$style.row">
              <span v-for="cell in row" :key="cell.c" :class="$style.cell">{{ wireGlyph(cell.r, cell.c) }}</span>
            </span>
          </span>

          <span v-else-if="mark.id === 'ramp'" :class="[$style.grid, $style.ramp]">
            <span v-for="row in rows" :key="row[0].r" :class="$style.row">
              <span v-for="cell in row" :key="cell.c" :class="$style.cell">{{ rampGlyph(cell.r, cell.c) }}</span>
            </span>
          </span>

          <span v-else-if="mark.id === 'dither'" :class="[$style.grid, $style.dither]">
            <span v-for="(row, r) in ditherRows" :key="r" :class="$style.row">
              <span v-for="(block, c) in row" :key="c" :class="$style.ditherCell" :style="{ color: block?.tone ?? 'transparent' }">{{
                block?.glyph ?? ' '
              }}</span>
            </span>
          </span>

          <svg v-else viewBox="0 0 64 64" :class="$style.svg">
            <g :class="$style.fringeRed">
              <rect v-for="(rect, i) in MARK_RECTS" :key="`r${i}`" :x="rect.x - 1.2" :y="rect.y" :width="rect.w" :height="rect.h" fill="var(--brand-red)" />
            </g>
            <g :class="$style.fringeBlue">
              <rect v-for="(rect, i) in MARK_RECTS" :key="`b${i}`" :x="rect.x + 1.2" :y="rect.y" :width="rect.w" :height="rect.h" fill="var(--brand-blue)" />
            </g>
            <rect v-for="(rect, i) in MARK_RECTS" :key="i" :x="rect.x" :y="rect.y" :width="rect.w" :height="rect.h" :fill="ROLE_TOKEN[rect.role]" />
            <rect x="67" y="6" width="2" height="5" fill="var(--brand-green)" opacity="0.4" />
            <rect x="-3" y="44" width="2" height="8" fill="var(--brand-blue)" opacity="0.32" />
            <rect x="71" y="30" width="2" height="12" fill="var(--brand-yellow)" opacity="0.24" />
          </svg>
        </span>
      </div>

      <p :class="$style.reason">{{ mark.reason }}</p>
    </article>
  </div>
</template>

<style module>
.wrap {
  font-family: var(--font-mono);
}

.card {
  margin-block-end: 0.8rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--rule);
  border-inline-start: 3px solid var(--rule);
}

.head {
  margin-block-end: 0.6rem;
}

.name {
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stage {
  display: flex;
  padding: 1rem;
  margin-block-end: 0.6rem;
  background: #000000;
}

.mark {
  position: relative;
  display: inline-flex;
  inline-size: var(--mark-size);
  block-size: var(--mark-size);
  flex-shrink: 0;
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

.grid {
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  block-size: 100%;
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
  color: #e0dcd4;
  font-size: calc(var(--mark-size) / 8);
}

.mesh {
  position: relative;
  background: color-mix(in oklab, var(--brand-blue) 35%, #000000);
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
  font-size: calc(var(--mark-size) / 4);
}

.reason {
  margin: 0;
  padding-block-start: 0.5rem;
  border-block-start: 1px dashed var(--rule);
  font-size: 0.68rem;
  line-height: 1.6;
  color: var(--muted);
}
</style>
