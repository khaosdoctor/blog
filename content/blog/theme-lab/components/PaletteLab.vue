<script setup lang="ts">
/**
 * A paleta é uma só: as cinco cores da marca mais as tintas que o site já usa
 * para texto, apagado, link e friso. Um bloco por cor, cada um com duas
 * amostras, uma no fundo escuro do site e outra no claro, porque a cor certa
 * num fundo não é a mesma no outro.
 *
 * Cada amostra tem seu próprio seletor de tom, com uma rampa que escurece
 * (fundo claro) ou clareia (fundo escuro) a partir da cor original. O rótulo
 * de cada opção carrega o hex e o contraste medido, porque uma lista de
 * amostras sem número só muda o lugar do chute. Cada seletor já abre no
 * primeiro tom da rampa que passa em 4.5:1, porque a pergunta é "o que já
 * funciona", não "e se eu mexer".
 */
import { reactive } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Pick from './Pick.vue'
import { composite, grade, parseHex, ratio, toHex, type Rgb } from './contrast'
import './fonts.css'

const FLOOR = 4.5
const RAMP_STEP = 6
const RAMP_MAX = 60

const BG = { escuro: '#000000', claro: '#f4efe0' }

// A cor de cada bloco, uma base por fundo. As cinco da marca partem do mesmo
// hex nos dois fundos; as tintas do site (src/styles/theme.css: --fg, --muted,
// --accent, --rule) já são um par por modo, então cada uma parte do próprio
// valor existente naquele modo, não de uma base inventada.
const MERGED_PALETTE: Array<{ name: string; escuro: string; claro: string }> = [
  { name: 'vermelho', escuro: '#e30613', claro: '#e30613' },
  { name: 'azul', escuro: '#0578be', claro: '#0578be' },
  { name: 'roxo', escuro: '#4b15a8', claro: '#4b15a8' },
  { name: 'verde', escuro: '#45b384', claro: '#45b384' },
  { name: 'amarelo', escuro: '#f5b200', claro: '#f5b200' },
  { name: 'texto', escuro: '#e0dcd4', claro: '#332d23' },
  { name: 'apagado', escuro: '#a8a29a', claro: '#6b6353' },
  { name: 'link', escuro: '#7cc0ff', claro: '#1a5c96' },
  { name: 'friso', escuro: '#2b1f42', claro: '#ddd4bd' },
]

interface Shade {
  id: string
  name: string
  hex: string
  value: number
}

/** Rampa de 0% a RAMP_MAX%, escurecendo (`claro`) ou clareando (`escuro`) a partir de `base`. */
function rampFor(base: Rgb, bg: Rgb, mode: 'escuro' | 'claro'): Shade[] {
  const target: Rgb = mode === 'claro' ? [0, 0, 0] : [255, 255, 255]
  const shades: Shade[] = []
  for (let pct = 0; pct <= RAMP_MAX; pct += RAMP_STEP) {
    const mixed = composite(target, base, pct / 100)
    const value = ratio(mixed, bg)
    const hex = toHex(mixed)
    const pass = value >= FLOOR ? 'passa' : 'reprova'
    shades.push({ id: String(pct), name: `${pct}% · ${hex} · ${value.toFixed(2)}:1 · ${pass}`, hex, value })
  }
  return shades
}

/** O primeiro tom da rampa que passa em FLOOR, ou o mais forte dela se nenhum passar. */
function firstPassing(shades: Shade[]): string {
  return (shades.find((shade) => shade.value >= FLOOR) ?? shades[shades.length - 1]).id
}

interface ColourBlock {
  name: string
  escuroOptions: Shade[]
  claroOptions: Shade[]
  escuroShade: string
  claroShade: string
}

const blocks = reactive<ColourBlock[]>(
  MERGED_PALETTE.map(({ name, escuro, claro }) => {
    const escuroOptions = rampFor(parseHex(escuro), parseHex(BG.escuro), 'escuro')
    const claroOptions = rampFor(parseHex(claro), parseHex(BG.claro), 'claro')
    return {
      name,
      escuroOptions,
      claroOptions,
      escuroShade: firstPassing(escuroOptions),
      claroShade: firstPassing(claroOptions),
    }
  }),
)

function currentShade(options: Shade[], id: string): Shade {
  return options.find((shade) => shade.id === id) ?? options[0]
}

function decisionSettings() {
  return blocks.flatMap((block) => {
    const dark = currentShade(block.escuroOptions, block.escuroShade)
    const light = currentShade(block.claroOptions, block.claroShade)
    return [
      { label: `${block.name}, escuro`, value: `${dark.hex} · ${dark.value.toFixed(2)}:1` },
      { label: `${block.name}, claro`, value: `${light.hex} · ${light.value.toFixed(2)}:1` },
    ]
  })
}

const decisionContext =
  `Fundo escuro ${BG.escuro}, fundo claro ${BG.claro}, medidos contra ${FLOOR}:1. Cada linha é o tom ` +
  `escolhido naquele seletor, não a cor original da marca.`

/*
 * CGA canônica, CGA medida no IBM 5153, fósforo P39 e âmbar de terminal:
 * pesquisa que já foi feita e não serve mais como opção de paleta aqui, mas o
 * dono do blog quer um seletor de tema para o leitor (fósforo ou âmbar,
 * trocando o site inteiro) separado desta bancada. Os valores ficam guardados
 * aqui, sem uso nesta página, para esse seletor futuro os buscar.
 */
const FUTURE_READER_THEMES: Record<string, { name: string; colours: Array<[string, string]> }> = {
  cga: {
    name: 'CGA/EGA 16 canônica',
    colours: [
      ['azul', '#0000aa'],
      ['verde', '#00aa00'],
      ['ciano', '#00aaaa'],
      ['vermelho', '#aa0000'],
      ['magenta', '#aa00aa'],
      ['marrom', '#aa5500'],
      ['cinza', '#aaaaaa'],
      ['azul claro', '#5555ff'],
      ['verde claro', '#55ff55'],
      ['ciano claro', '#55ffff'],
      ['vermelho claro', '#ff5555'],
      ['magenta claro', '#ff55ff'],
      ['amarelo', '#ffff55'],
      ['branco', '#ffffff'],
    ],
  },
  vga5153: {
    name: 'CGA medida no IBM 5153',
    colours: [
      ['azul', '#0000c4'],
      ['verde', '#00c400'],
      ['ciano', '#00c4c4'],
      ['vermelho', '#c40000'],
      ['magenta', '#c400c4'],
      ['marrom', '#c47e00'],
      ['cinza', '#c4c4c4'],
      ['azul claro', '#4e4edc'],
      ['verde claro', '#4edc4e'],
      ['ciano claro', '#4ef3f3'],
      ['vermelho claro', '#dc4e4e'],
      ['amarelo', '#f3f34e'],
      ['branco', '#ffffff'],
    ],
  },
  fosforo: {
    name: 'fósforo P39, o verde do IBM 5151',
    colours: [
      ['escuro', '#0a3d05'],
      ['médio', '#118a08'],
      ['normal', '#20c20e'],
      ['claro', '#6bff5c'],
    ],
  },
  ambar: {
    name: 'âmbar de terminal',
    colours: [
      ['escuro', '#4a3300'],
      ['médio', '#a67200'],
      ['normal', '#ffb000'],
      ['claro', '#ffd98a'],
    ],
  },
  dmg: {
    name: 'Game Boy DMG',
    colours: [
      ['mais escuro', '#0f380f'],
      ['escuro', '#306230'],
      ['claro', '#8bac0f'],
      ['mais claro', '#9bbc0f'],
    ],
  },
  campbell: {
    name: 'Campbell (Windows Terminal)',
    colours: [
      ['vermelho', '#c50f1f'],
      ['verde', '#13a10e'],
      ['amarelo', '#c19c00'],
      ['azul', '#0037da'],
      ['ciano', '#3a96dd'],
      ['vermelho claro', '#e74856'],
      ['verde claro', '#16c60c'],
      ['azul claro', '#3b78ff'],
      ['branco', '#f2f2f2'],
    ],
  },
}
void FUTURE_READER_THEMES
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.grid">
      <div v-for="block in blocks" :key="block.name" :class="$style.block">
        <p :class="$style['block-name']">{{ block.name }}</p>

        <div :class="$style.shade">
          <div :class="$style.rect" :style="{ background: BG.escuro }">
            <span
              :class="$style['swatch-bar']"
              :style="{ background: currentShade(block.escuroOptions, block.escuroShade).hex }"
            ></span>
            <span
              :class="$style['rect-text']"
              :style="{ color: currentShade(block.escuroOptions, block.escuroShade).hex }"
            >
              Abstração vaza aqui.
            </span>
          </div>
          <div :class="$style.picker">
            <Pick v-model="block.escuroShade" label="escuro" :options="block.escuroOptions" />
          </div>
        </div>

        <div :class="$style.shade">
          <div :class="$style.rect" :style="{ background: BG.claro }">
            <span
              :class="$style['swatch-bar']"
              :style="{ background: currentShade(block.claroOptions, block.claroShade).hex }"
            ></span>
            <span
              :class="$style['rect-text']"
              :style="{ color: currentShade(block.claroOptions, block.claroShade).hex }"
            >
              Abstração vaza aqui.
            </span>
          </div>
          <div :class="$style.picker">
            <Pick v-model="block.claroShade" label="claro" :options="block.claroOptions" />
          </div>
        </div>
      </div>
    </div>

    <p :class="$style.note">
      Um controle único não dava conta: o vermelho pede uns 6% de escurecer para passar no fundo claro, o amarelo
      pede uns 48%, oito vezes mais. Por isso cada cor tem o próprio seletor, um por fundo, já aberto no primeiro
      tom que passa em {{ FLOOR }}:1. Isso tem precedente no código: <code>--em-italic-fg</code> em
      <code>src/styles/theme.css</code> já é <code>#8a6400</code> no modo claro, o amarelo da marca escurecido
      perto desse mesmo tanto, porque esse amarelo não se sustenta como texto sobre uma página clara. A escolha de
      cada seletor, cor por cor e fundo por fundo, é o que deveria virar token. O friso não é texto corrido, é o
      traço fino de uma régua, então um tom que só passa escurecido ou clareado bem além do original não quer dizer
      que o valor atual do site está errado, só que o piso de 4.5:1 é mais estrito do que o que ele precisa cumprir.
    </p>

    <DecisionCopy
      lab="paleta, tom por cor e por fundo"
      component="PaletteLab.vue"
      :settings="decisionSettings()"
      :context="decisionContext"
    />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

.block {
  display: grid;
  gap: 0.7rem;
  min-inline-size: 0;
  padding: 0.8rem;
  border: 1px solid var(--rule);
  background: transparent;
}

.block-name {
  margin: 0;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
}

/* Uma amostra (retângulo + seletor), empilhada: escuro em cima, claro embaixo. */
.shade {
  display: grid;
  gap: 0.4rem;
  min-inline-size: 0;
}

.rect {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
  padding: 0.5rem;
}

/* CSS modules rename this class, so it no longer collides with the global `.chip`. */
.swatch-bar {
  block-size: 0.5rem;
  inline-size: 100%;
}

.rect-text {
  min-inline-size: 0;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-tight);
}

.picker {
  inline-size: 100%;
  min-inline-size: 0;
}

/*
 * O Pick.vue compartilhado fixa o próprio tamanho de fonte (0,72rem) no rótulo
 * que envolve o select, então herdar um tamanho maior daqui não pega; o
 * !important força a leitura maior sem editar um componente que não é desta
 * bancada. inline-size e max-inline-size travam a largura do select no que o
 * bloco tem disponível; sem isso, o texto comprido de cada opção empurra a
 * caixa para fora da borda.
 */
.picker select {
  inline-size: 100%;
  max-inline-size: 100%;
  min-inline-size: 0;
  overflow: hidden;
  font-size: 0.85rem !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
