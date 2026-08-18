<script setup lang="ts">
/**
 * Cinco botões, lado a lado, para escolher olhando. Todos são `<button>` de
 * verdade, com foco visível e alvo de toque acima de 44px quando o respiro passa
 * de 12, que é o mínimo que a norma pede para um dedo.
 */
import { computed, ref } from 'vue'
import DecisionCopy from '../../theme-lab/components/DecisionCopy.vue'
import Knob from '../../theme-lab/components/Knob.vue'
import Panel from '../../theme-lab/components/Panel.vue'
import Pick from '../../theme-lab/components/Pick.vue'
import Toggle from '../../theme-lab/components/Toggle.vue'
import { parseHex, ratio } from '../../theme-lab/components/contrast'
import '../../theme-lab/components/fonts.css'

const STACKS: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  silkscreen: "'Silkscreen', sans-serif",
  pressstart: "'Press Start 2P', ui-monospace, monospace",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
}

const ACCENTS: Record<string, string> = {
  verde: '#45b384',
  amarelo: '#f5b200',
  azul: '#7cc0ff',
  vermelho: '#ff6b74',
  fosforo: '#20c20e',
}

const BG = '#14161a'

// Os cinco desenhos ficam lado a lado de propósito, para escolher olhando: não
// existe um "candidato" que troque a vista, como nos outros labs. Este picker
// não muda nada na tela, só nomeia qual dos cinco entra na decisão copiada.
const STYLE_OPTIONS = [
  { id: 'colchetes', name: 'colchetes [ ]' },
  { id: 'bloco', name: 'bloco cheio' },
  { id: 'dupla', name: 'moldura dupla' },
  { id: 'prompt', name: 'prompt' },
  { id: 'cursor', name: 'cursor de menu' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const chosenStyle = ref('colchetes')
const face = ref('departure')
const accent = ref('verde')
const pad = ref(10)
const tracking = ref(5)
const label = ref('ler o post')
const solidText = ref(false)

const accentHex = computed(() => ACCENTS[accent.value])
const onDark = computed(() => ratio(parseHex(accentHex.value), parseHex(BG)))
const onSolid = computed(() => ratio(parseHex(BG), parseHex(accentHex.value)))
const touch = computed(() => Math.round(pad.value * 1.6 + 20))

const decisionSettings = computed(() => [
  { label: 'estilo escolhido', value: labelFor(STYLE_OPTIONS, chosenStyle.value) },
  { label: 'fonte', value: face.value },
  { label: 'cor', value: `${accent.value} (${accentHex.value})` },
  { label: 'respiro', value: String(pad.value) },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'texto branco no bloco cheio', value: solidText.value ? 'sim' : 'não' },
])

const decisionContext = computed(
  () =>
    `Contorno ${onDark.value.toFixed(2)}:1 sobre ${BG} · bloco cheio ${onSolid.value.toFixed(2)}:1 · alvo de toque ~${touch.value}px (a norma pede 44).`,
)

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  padding: `${pad.value / 16}rem ${pad.value / 9}rem`,
}))
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: BG }">
      <div :class="$style.rack">
        <figure>
          <button :class="$style.ghost" type="button" :style="{ ...base, color: accentHex, borderColor: '#ffffff29' }">
            [ {{ label }} ]
          </button>
          <figcaption>colchetes</figcaption>
        </figure>

        <figure>
          <button
            :class="$style.solid"
            type="button"
            :style="{ ...base, background: accentHex, color: solidText ? '#ffffff' : BG, borderColor: accentHex }"
          >
            {{ label }}
          </button>
          <figcaption>bloco cheio</figcaption>
        </figure>

        <figure>
          <button :class="$style.double" type="button" :style="{ ...base, color: accentHex, borderColor: accentHex }">
            {{ label }}
          </button>
          <figcaption>moldura dupla</figcaption>
        </figure>

        <figure>
          <button :class="$style.prompt" type="button" :style="{ ...base, color: accentHex }">
            <span :class="$style.sign">&gt;</span>{{ label }}
          </button>
          <figcaption>prompt</figcaption>
        </figure>

        <figure>
          <button :class="$style.cursor" type="button" :style="{ ...base, color: '#e6e4e0' }">
            <span :class="$style.pointer" :style="{ color: accentHex }">▸</span>{{ label }}
          </button>
          <figcaption>cursor de menu</figcaption>
        </figure>
      </div>
    </div>

    <Panel label="botão">
      <Pick v-model="chosenStyle" label="estilo escolhido" :options="STYLE_OPTIONS" />
      <Pick v-model="face" label="fonte" :options="Object.keys(STACKS).map((id) => ({ id, name: id }))" />
      <Pick v-model="accent" label="cor" :options="Object.keys(ACCENTS).map((id) => ({ id, name: id }))" />
      <Knob v-model="pad" label="respiro" :min="4" :max="26" />
      <Knob v-model="tracking" label="entreletra" :min="0" :max="25" unit="/100em" />
      <Toggle v-model="solidText" label="texto branco no bloco cheio" />
    </Panel>

    <p :class="[$style.readout, { [$style.bad]: onSolid < 4.5 && !solidText }]">
      contorno {{ onDark.toFixed(2) }}:1 sobre {{ BG }} · bloco cheio {{ onSolid.toFixed(2) }}:1 com texto escuro.
      Altura aproximada do alvo de toque: {{ touch }}px (a norma pede 44).
    </p>
    <p :class="$style.note">
      O bloco cheio é o único candidato em que a cor da marca precisa carregar texto por cima, e é onde ela
      quebra: amarelo com texto branco reprova, amarelo com texto escuro passa. É a mesma regra que já vale para o
      negrito do site hoje.
    </p>

    <DecisionCopy
      lab="botão"
      component="ChromeButton.vue"
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
  padding: clamp(1rem, 4%, 1.8rem);
}

.rack {
  display: flex;
  flex-wrap: wrap;
  gap: 1.4rem 1.8rem;
  align-items: flex-start;
}

.rack figure {
  margin: 0;
  text-align: center;
}

.rack figcaption {
  margin-block-start: 0.5rem;
  color: #9a9ea6;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.rack button {
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.rack button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.ghost:hover {
  background: #ffffff12;
}

.solid:hover {
  filter: brightness(1.15);
}

.double {
  border-width: 4px;
  border-style: double;
}

.double:hover {
  background: #ffffff12;
}

.prompt {
  border: 0;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.3em;
}

.sign {
  margin-inline-end: 0.5em;
  opacity: 0.7;
}

.cursor {
  border: 0;
}

.pointer {
  display: inline-block;
  inline-size: 1.4em;
  opacity: 0;
  transition: opacity 120ms ease;
}

.cursor:hover .pointer,
.cursor:focus-visible .pointer {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .rack button,
  .pointer {
    transition: none;
  }
}

.readout,
.note {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}

.readout.bad {
  color: var(--brand-red);
}
</style>
