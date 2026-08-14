<script setup lang="ts">
/**
 * Fonte de bitmap só fica nítida em múltiplo inteiro do tamanho em que ela foi
 * desenhada. Dizer isso não convence ninguém, então aqui está a escada: a mesma
 * palavra de 8 a 32px, com os tamanhos que fecham no grid marcados. A PxPlus IBM
 * VGA 9x16 fecha em 16, 32 e 48. Qualquer valor no meio é interpolação, e a
 * interpolação de um traço de um pixel é um borrão cinza.
 *
 * As outras candidatas são vetoriais e escalam em qualquer tamanho. Elas parecem
 * pixeladas, mas não são bitmap.
 */
import { computed, ref } from 'vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import './fonts.css'

const CANDIDATES: Record<string, { stack: string; step: number; name: string }> = {
  ibmvga: { stack: "'PxPlus IBM VGA8', ui-monospace, monospace", step: 16, name: 'PxPlus IBM VGA 9x16 (bitmap)' },
  departure: { stack: "'Departure Mono', ui-monospace, monospace", step: 0, name: 'Departure Mono (vetorial)' },
  silkscreen: { stack: "'Silkscreen', sans-serif", step: 0, name: 'Silkscreen (vetorial)' },
  pressstart: { stack: "'Press Start 2P', ui-monospace, monospace", step: 0, name: 'Press Start 2P (vetorial)' },
  micro5: { stack: "'Micro 5', sans-serif", step: 0, name: 'Micro 5 (vetorial)' },
}

const SIZES = [8, 10, 11, 12, 14, 15, 16, 17, 18, 20, 22, 24, 28, 30, 32]
const WORD = 'ABSTRAÇÃO 0O1lI'

const which = ref('ibmvga')
const zoom = ref(1)
const crisp = ref(true)
const dark = ref(true)

const face = computed(() => CANDIDATES[which.value])
const bg = computed(() => (dark.value ? '#14161a' : '#fffdf9'))
const fg = computed(() => (dark.value ? '#e6e4e0' : '#1a1c20'))

const onGrid = (size: number) => face.value.step === 0 || size % face.value.step === 0

const crispStyle = computed(() =>
  crisp.value
    ? { WebkitFontSmoothing: 'none', MozOsxFontSmoothing: 'grayscale', fontSmooth: 'never', filter: 'contrast(100.00001%)' }
    : {},
)
</script>

<template>
  <div class="demo">
    <div class="stage" :style="{ background: bg, color: fg }">
      <div class="ladder" :style="{ zoom: zoom }">
        <div v-for="size in SIZES" :key="size" class="row" :class="{ grid: onGrid(size) }">
          <span class="size">{{ size }}px</span>
          <span class="sample" :style="{ fontFamily: face.stack, fontSize: `${size}px`, lineHeight: 1, ...crispStyle }">
            {{ WORD }}
          </span>
          <span class="verdict">{{ onGrid(size) ? '✔ no grid' : '✕ interpolada' }}</span>
        </div>
      </div>
    </div>

    <Panel label="escada">
      <Pick
        v-model="which"
        label="fonte"
        :options="Object.entries(CANDIDATES).map(([id, value]) => ({ id, name: value.name }))"
      />
      <Knob v-model="zoom" label="lupa" :min="1" :max="4" :step="1" unit="×" />
      <Toggle v-model="crisp" label="matar o antisserrilhado" />
      <Toggle v-model="dark" label="fundo escuro" />
    </Panel>

    <p class="note">
      A lupa usa `zoom`, que multiplica o tamanho em px por inteiro: o resultado continua nítido. Se ela usasse
      `transform: scale`, os mesmos 16px viravam 64px interpolados e tudo borrava, que é exatamente o problema que
      esta demonstração existe para mostrar.
    </p>
    <p class="note">
      O interruptor do antisserrilhado aplica a receita conhecida (`-webkit-font-smoothing: none` mais um
      `filter: contrast(100.00001%)` para desligar o subpixel). Ela funciona no Chrome e no Firefox em Linux e
      Windows, funciona no macOS, e no Safari o efeito é irregular porque ele informa uma densidade de pixel
      constante independente do zoom. Ou seja: um tema baseado em fonte de bitmap depende de um comportamento que
      um navegador não garante. Fonte vetorial pixelada não tem esse problema, e é o argumento mais forte a favor
      da Departure Mono.
    </p>
  </div>
</template>

<style scoped>
.demo {
  font-family: var(--font-mono);
}

.stage {
  padding: clamp(1rem, 4%, 1.8rem);
  overflow-x: auto;
}

.ladder {
  display: grid;
  gap: 0.55rem;
}

.row {
  display: grid;
  grid-template-columns: 4rem 1fr 7rem;
  gap: 0.8rem;
  align-items: baseline;
  padding-block-end: 0.4rem;
  border-block-end: 1px dashed currentColor;
  opacity: 0.55;
}

.row.grid {
  opacity: 1;
}

.size,
.verdict {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.verdict {
  text-align: end;
}

.sample {
  white-space: nowrap;
}

.note {
  margin: 0.7rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
