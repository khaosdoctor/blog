<script setup lang="ts">
/**
 * Seis leituras do mesmo parágrafo real, com um link não escrito, um interno e
 * um externo dentro dele, porque a decisão é sobre link dentro de texto corrido,
 * não sobre uma palavra isolada. O candidato 0 é o que o site tem hoje: nenhuma
 * regra de cor nem de sublinhado em `.prose a`, então quem decide é o navegador.
 * Os outros cinco vieram da pesquisa: o 1 é o que bpaulino.com faz de verdade
 * (lido direto do CSS compilado do site, não de uma captura de tela), os outros
 * quatro são leituras de terminal (tracejado, colchetes, bloco invertido, marcador
 * de prompt) que já aparecem nas referências de docs/theming.md.
 *
 * O ícone de âncora externa/interna e o vermelho de link não escrito (ambos já
 * existentes em src/styles/prose/links.css) continuam funcionando em todos os
 * candidatos sem nenhum código extra aqui: como o link não escrito não recebe a
 * cor do candidato (só a decoração), a regra global que pinta esse link de
 * vermelho nunca perde a disputa.
 */
import { computed, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const BG = { escuro: '#000000', claro: '#f4efe0' }

// Mesmos hexadecimais de src/styles/theme.css, guardados aqui porque a conta de
// contraste precisa de um número concreto: o mesmo padrão que MERGED_PALETTE usa
// em PaletteLab.vue e que ACCENTS usa em ChromeButton.vue. "atual" é o azul padrão
// do Chrome/Firefox para link não visitado (Safari varia um pouco), não um token
// do site; está aqui só para o candidato 0 poder imprimir um número também.
const TOKENS: Record<string, { escuro: string; claro: string }> = {
  accent: { escuro: '#7cc0ff', claro: '#1a5c96' },
  verde: { escuro: '#45b384', claro: '#45b384' },
  roxo: { escuro: '#4b15a8', claro: '#4b15a8' },
  fg: { escuro: '#e0dcd4', claro: '#332d23' },
  apagado: { escuro: '#a8a29a', claro: '#6b6353' },
  atual: { escuro: '#0000ee', claro: '#0000ee' },
  naoescrito: { escuro: '#ff8b93', claro: '#a4232e' },
}

const ROLE_LABEL: Record<string, string> = {
  accent: 'accent (--accent)',
  verde: 'verde (--brand-green)',
  roxo: 'roxo (--brand-purple)',
  fg: 'texto (--fg, mesma cor do corpo)',
  apagado: 'apagado (--muted)',
}

function hexFor(role: string, mode: 'escuro' | 'claro'): string {
  return TOKENS[role][mode]
}

function contrastFor(role: string): { escuro: number; claro: number } {
  return {
    escuro: ratio(parseHex(hexFor(role, 'escuro')), parseHex(BG.escuro)),
    claro: ratio(parseHex(hexFor(role, 'claro')), parseHex(BG.claro)),
  }
}

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

// Vermelho não entra em nenhum seletor de cor abaixo de propósito: essa cor já é
// o marcador de link não escrito em todo o site, e oferecê-la aqui deixaria os
// dois casos indistinguíveis.
const ROLE_OPTIONS = [
  { id: 'accent', name: 'accent' },
  { id: 'verde', name: 'verde' },
  { id: 'roxo', name: 'roxo' },
]
const ROLE_OPTIONS_COM_TEXTO = [...ROLE_OPTIONS, { id: 'fg', name: 'texto (sem contraste extra)' }]
const ROLE_OPTIONS_COM_APAGADO = [...ROLE_OPTIONS, { id: 'apagado', name: 'apagado' }]

// O parágrafo é o segundo de copy.ts, palavra por palavra: só ganhou três
// âncoras e um <code> em volta do que já era `try/catch` no texto original.
const P = {
  before: 'É por isso que ',
  unwritten: 'ler o código de uma dependência',
  mid1: ' é um exercício tão útil. Não para desconfiar dela, mas para saber onde ela desiste. Toda ',
  internal: 'biblioteca',
  mid2: ' tem uma fronteira, e a fronteira quase nunca está documentada. Ela aparece em um comentário de três linhas, em um ',
  code: 'try/catch',
  mid3: ' que engole ',
  external: 'um erro específico',
  after: ', ou em uma opção com um nome estranho que só faz sentido depois que você já foi mordido pelo caso que ela resolve.',
}
const HREF_UNWRITTEN = '/ler-o-codigo-de-uma-dependencia/'
const HREF_INTERNAL = '/tags/bibliotecas/'
const HREF_EXTERNAL = 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Statements/try...catch'
const TITLE_UNWRITTEN = 'ainda não escrito'

const chosen = ref('1')
const CANDIDATE_OPTIONS = [
  { id: '0', name: '0 · atual' },
  { id: '1', name: '1 · sublinhado apagado' },
  { id: '2', name: '2 · tracejado de terminal' },
  { id: '3', name: '3 · colchetes' },
  { id: '4', name: '4 · bloco invertido' },
  { id: '5', name: '5 · marcador de prompt' },
]

// Candidato 1: o que bpaulino.com faz de verdade.
const c1Role = ref('accent')
const c1Thickness = ref(1)
const c1Offset = ref(2)
const c1Alpha = ref(40)
const c1SkipInk = ref(true)
const c1Hover = ref('brilha')
const HOVER1_OPTIONS = [
  { id: 'brilha', name: 'sublinhado clareia até opaco' },
  { id: 'cor', name: 'só o padrão do site (texto vira --fg)' },
]

// Candidato 2: tracejado de terminal.
const c2Role = ref('accent')
const c2Style = ref('dashed')
const c2Thickness = ref(2)
const c2Offset = ref(4)
const c2Hover = ref('solido')
const STYLE2_OPTIONS = [
  { id: 'dashed', name: 'tracejado' },
  { id: 'dotted', name: 'pontilhado' },
  { id: 'solid', name: 'sólido' },
  { id: 'wavy', name: 'ondulado' },
]
const HOVER2_OPTIONS = [
  { id: 'solido', name: 'tracejado vira sólido' },
  { id: 'padrao', name: 'só o padrão do site' },
]

// Candidato 3: colchetes, sem sublinhado nenhum.
const c3Role = ref('accent')
const c3Bracket = ref('colchetes')
const c3Hover = ref('sublinha')
const BRACKET_OPTIONS = [
  { id: 'colchetes', name: '[ colchetes ]' },
  { id: 'angulos', name: '‹ ângulos ›' },
  { id: 'seta', name: '> flecha <' },
]
const BRACKET_PAIRS: Record<string, [string, string]> = {
  colchetes: ['[ ', ' ]'],
  angulos: ['‹ ', ' ›'],
  seta: ['> ', ' <'],
}
const HOVER3_OPTIONS = [
  { id: 'sublinha', name: 'ganha sublinhado pontilhado' },
  { id: 'clareia', name: 'brilho aumenta' },
]

// Candidato 4: bloco invertido, a seleção de terminal.
const c4Role = ref('accent')
const c4Rest = ref('pontilhado')
const c4Pad = ref(2)
const REST4_OPTIONS = [
  { id: 'pontilhado', name: 'sublinhado pontilhado fino' },
  { id: 'fundo', name: 'fundo levemente tintado' },
]

// Candidato 5: marcador de prompt, o mesmo `>` que ChromeButton.vue já usa em
// botão, agora dentro do texto corrido.
const c5Role = ref('accent')
const c5Marker = ref('seta')
const c5Style = ref('dotted')
const c5Hover = ref('sempre')
const MARKER_OPTIONS = [
  { id: 'seta', name: '❯' },
  { id: 'maior', name: '>' },
  { id: 'sublinha', name: '_' },
]
const MARKER_CHAR: Record<string, string> = { seta: '❯', maior: '>', sublinha: '_' }
const STYLE5_OPTIONS = [
  { id: 'dotted', name: 'pontilhado' },
  { id: 'solid', name: 'sólido' },
]
const HOVER5_OPTIONS = [
  { id: 'sempre', name: 'marcador sempre visível' },
  { id: 'aparece', name: 'marcador aparece só no hover' },
]

const decisionSettings = computed(() => {
  const common = [{ label: 'candidato', value: labelFor(CANDIDATE_OPTIONS, chosen.value) }]
  if (chosen.value === '0') {
    const c = contrastFor('atual')
    return [
      ...common,
      { label: 'cor', value: 'azul padrão do navegador, não é token do site' },
      { label: 'contraste', value: `${c.escuro.toFixed(2)}:1 escuro · ${c.claro.toFixed(2)}:1 claro` },
      { label: 'depende só de cor', value: 'não, o sublinhado do navegador já é o sinal' },
    ]
  }
  if (chosen.value === '1') {
    const c = contrastFor(c1Role.value)
    return [
      ...common,
      { label: 'cor', value: ROLE_LABEL[c1Role.value] },
      { label: 'espessura do sublinhado', value: `${c1Thickness.value}px` },
      { label: 'distância do texto', value: `${c1Offset.value}px` },
      { label: 'opacidade em repouso', value: `${c1Alpha.value}%` },
      { label: 'skip-ink', value: c1SkipInk.value ? 'auto' : 'none' },
      { label: 'hover', value: labelFor(HOVER1_OPTIONS, c1Hover.value) },
      { label: 'contraste', value: `${c.escuro.toFixed(2)}:1 escuro · ${c.claro.toFixed(2)}:1 claro` },
      { label: 'depende só de cor', value: 'não' },
    ]
  }
  if (chosen.value === '2') {
    const c = contrastFor(c2Role.value)
    return [
      ...common,
      { label: 'cor', value: ROLE_LABEL[c2Role.value] },
      { label: 'estilo', value: labelFor(STYLE2_OPTIONS, c2Style.value) },
      { label: 'espessura', value: `${c2Thickness.value}px` },
      { label: 'distância do texto', value: `${c2Offset.value}px` },
      { label: 'hover', value: labelFor(HOVER2_OPTIONS, c2Hover.value) },
      { label: 'contraste', value: `${c.escuro.toFixed(2)}:1 escuro · ${c.claro.toFixed(2)}:1 claro` },
      { label: 'depende só de cor', value: 'não' },
    ]
  }
  if (chosen.value === '3') {
    const c = contrastFor(c3Role.value)
    return [
      ...common,
      { label: 'cor', value: ROLE_LABEL[c3Role.value] },
      { label: 'moldura', value: labelFor(BRACKET_OPTIONS, c3Bracket.value) },
      { label: 'hover', value: labelFor(HOVER3_OPTIONS, c3Hover.value) },
      { label: 'contraste', value: `${c.escuro.toFixed(2)}:1 escuro · ${c.claro.toFixed(2)}:1 claro` },
      {
        label: 'depende só de cor',
        value: c3Role.value === 'fg' ? 'não: mesma cor do texto, mas a moldura ainda marca o link' : 'não',
      },
    ]
  }
  if (chosen.value === '4') {
    const c = contrastFor(c4Role.value)
    return [
      ...common,
      { label: 'cor', value: ROLE_LABEL[c4Role.value] },
      { label: 'repouso', value: labelFor(REST4_OPTIONS, c4Rest.value) },
      { label: 'respiro do bloco', value: `${c4Pad.value}px` },
      { label: 'contraste', value: `${c.escuro.toFixed(2)}:1 escuro · ${c.claro.toFixed(2)}:1 claro` },
      {
        label: 'depende só de cor',
        value: c4Rest.value === 'fundo' ? 'quase: o fundo tintado sozinho é só cor, prefira o pontilhado' : 'não',
      },
    ]
  }
  const c = contrastFor(c5Role.value)
  return [
    ...common,
    { label: 'cor', value: ROLE_LABEL[c5Role.value] },
    { label: 'marcador', value: MARKER_CHAR[c5Marker.value] },
    { label: 'estilo do sublinhado', value: labelFor(STYLE5_OPTIONS, c5Style.value) },
    { label: 'hover', value: labelFor(HOVER5_OPTIONS, c5Hover.value) },
    { label: 'contraste', value: `${c.escuro.toFixed(2)}:1 escuro · ${c.claro.toFixed(2)}:1 claro` },
    { label: 'depende só de cor', value: 'não' },
  ]
})

const decisionContext =
  `Fundo escuro ${BG.escuro}, fundo claro ${BG.claro}, contraste pela fórmula do WCAG 2.1. O candidato 0 é o azul ` +
  `padrão do navegador: hoje não existe regra de cor nem de sublinhado em .prose a. Em todos os candidatos o link ` +
  `não escrito continua vermelho (--link-unwritten) e o ícone de âncora externa/interna em .prose a::after continua aparecendo.`
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.chooser">
      <Pick v-model="chosen" label="candidato para a decisão" :options="CANDIDATE_OPTIONS" />
    </div>
    <p :class="$style.note">
      Este seletor não muda o que aparece embaixo, os seis candidatos ficam visíveis o tempo todo para comparar
      olhando: ele só nomeia qual entra na decisão copiada no fim da seção.
    </p>

    <!-- 0 · Atual -->
    <div :class="$style.candidate">
      <p :class="$style['candidate-title']">0 · Atual</p>
      <p :class="$style['candidate-origin']">
        O que o site tem hoje, não uma escolha: não existe regra de cor nem de sublinhado em <code>.prose a</code>,
        então quem decide azul e sublinhado é o navegador. O vermelho do link não escrito já é do site.
      </p>
      <div :class="$style.stage" :style="{ background: BG.escuro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'escuro') }">
          {{ P.before
          }}<a :href="HREF_UNWRITTEN" class="link-unwritten" :title="TITLE_UNWRITTEN">{{ P.unwritten }}</a
          >{{ P.mid1 }}<a :href="HREF_INTERNAL">{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3 }}<a :href="HREF_EXTERNAL">{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <div :class="$style.stage" :style="{ background: BG.claro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'claro') }">
          {{ P.before
          }}<a :href="HREF_UNWRITTEN" class="link-unwritten" :title="TITLE_UNWRITTEN">{{ P.unwritten }}</a
          >{{ P.mid1 }}<a :href="HREF_INTERNAL">{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3 }}<a :href="HREF_EXTERNAL">{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <p :class="$style.readout">
        contraste do azul padrão: {{ contrastFor('atual').escuro.toFixed(2) }}:1 no escuro ·
        {{ contrastFor('atual').claro.toFixed(2) }}:1 no claro. Não depende só de cor, o sublinhado do navegador já
        marca o link.
      </p>
    </div>

    <!-- 1 · Sublinhado apagado, bpaulino.com -->
    <div :class="$style.candidate">
      <p :class="$style['candidate-title']">1 · Sublinhado apagado</p>
      <p :class="$style['candidate-origin']">
        De bpaulino.com, lido direto do CSS compilado do site (não de uma captura de tela):
        <code>text-decoration: underline 1px</code>, <code>text-underline-offset: 2px</code> e a cor do sublinhado
        num tom translúcido do próprio accent (a cor cheia fica só para o texto), que sobe para opaco no hover. Aqui
        a cor e a espessura viraram slider, e o <code>text-decoration-skip-ink</code> virou um toggle porque é
        exatamente a propriedade que decide se o traço quebra ao redor de letras com descendente como esta frase
        tem em "próprio" e "página".
      </p>
      <div :class="$style.stage" :style="{ background: BG.escuro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'escuro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="$style.c1deco"
            :style="{
              '--c1-thickness': `${c1Thickness}px`,
              '--c1-offset': `${c1Offset}px`,
              '--c1-skip-ink': c1SkipInk ? 'auto' : 'none',
            }"
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c1deco, $style.c1color, { [$style.c1hoverBrighten]: c1Hover === 'brilha' }]"
            :style="{
              '--link-color': hexFor(c1Role, 'escuro'),
              '--c1-thickness': `${c1Thickness}px`,
              '--c1-offset': `${c1Offset}px`,
              '--c1-alpha': `${c1Alpha}%`,
              '--c1-skip-ink': c1SkipInk ? 'auto' : 'none',
            }"
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c1deco, $style.c1color, { [$style.c1hoverBrighten]: c1Hover === 'brilha' }]"
            :style="{
              '--link-color': hexFor(c1Role, 'escuro'),
              '--c1-thickness': `${c1Thickness}px`,
              '--c1-offset': `${c1Offset}px`,
              '--c1-alpha': `${c1Alpha}%`,
              '--c1-skip-ink': c1SkipInk ? 'auto' : 'none',
            }"
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <div :class="$style.stage" :style="{ background: BG.claro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'claro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="$style.c1deco"
            :style="{
              '--c1-thickness': `${c1Thickness}px`,
              '--c1-offset': `${c1Offset}px`,
              '--c1-skip-ink': c1SkipInk ? 'auto' : 'none',
            }"
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c1deco, $style.c1color, { [$style.c1hoverBrighten]: c1Hover === 'brilha' }]"
            :style="{
              '--link-color': hexFor(c1Role, 'claro'),
              '--c1-thickness': `${c1Thickness}px`,
              '--c1-offset': `${c1Offset}px`,
              '--c1-alpha': `${c1Alpha}%`,
              '--c1-skip-ink': c1SkipInk ? 'auto' : 'none',
            }"
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c1deco, $style.c1color, { [$style.c1hoverBrighten]: c1Hover === 'brilha' }]"
            :style="{
              '--link-color': hexFor(c1Role, 'claro'),
              '--c1-thickness': `${c1Thickness}px`,
              '--c1-offset': `${c1Offset}px`,
              '--c1-alpha': `${c1Alpha}%`,
              '--c1-skip-ink': c1SkipInk ? 'auto' : 'none',
            }"
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <Panel label="sublinhado apagado">
        <Pick v-model="c1Role" label="cor" :options="ROLE_OPTIONS" />
        <Knob v-model="c1Thickness" label="espessura" :min="1" :max="3" unit="px" />
        <Knob v-model="c1Offset" label="distância do texto" :min="0" :max="6" unit="px" />
        <Knob v-model="c1Alpha" label="opacidade em repouso" :min="10" :max="100" :step="5" unit="%" />
        <Toggle v-model="c1SkipInk" label="text-decoration-skip-ink: auto" />
        <Pick v-model="c1Hover" label="hover" :options="HOVER1_OPTIONS" />
      </Panel>
      <p :class="$style.readout">
        contraste de {{ ROLE_LABEL[c1Role] }}: {{ contrastFor(c1Role).escuro.toFixed(2) }}:1 no escuro ·
        {{ contrastFor(c1Role).claro.toFixed(2) }}:1 no claro. Não depende só de cor, mas
        {{ c1Alpha }}% de opacidade em repouso é um sublinhado discreto, vale olhar de perto antes de escolher um
        valor baixo.
      </p>
    </div>

    <!-- 2 · Tracejado de terminal -->
    <div :class="$style.candidate">
      <p :class="$style['candidate-title']">2 · Tracejado de terminal</p>
      <p :class="$style['candidate-origin']">
        Um sublinhado que lê como terminal em vez de como prosa: <code>text-decoration-style</code> tracejado ou
        pontilhado, mais grosso e mais afastado do texto do que o normal. É a mesma propriedade que
        <code>ChromeButton.vue</code> já usa no botão de estilo "prompt", aplicada agora dentro do texto corrido.
      </p>
      <div :class="$style.stage" :style="{ background: BG.escuro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'escuro') }">
          {{ P.before
          }}<a :href="HREF_UNWRITTEN" class="link-unwritten" :title="TITLE_UNWRITTEN" :class="$style.c2deco"
            :style="{ '--c2-style': c2Style, '--c2-thickness': `${c2Thickness}px`, '--c2-offset': `${c2Offset}px` }"
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c2deco, $style.c2color, { [$style.c2hoverSolid]: c2Hover === 'solido' }]"
            :style="{
              '--link-color': hexFor(c2Role, 'escuro'),
              '--c2-style': c2Style,
              '--c2-thickness': `${c2Thickness}px`,
              '--c2-offset': `${c2Offset}px`,
            }"
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c2deco, $style.c2color, { [$style.c2hoverSolid]: c2Hover === 'solido' }]"
            :style="{
              '--link-color': hexFor(c2Role, 'escuro'),
              '--c2-style': c2Style,
              '--c2-thickness': `${c2Thickness}px`,
              '--c2-offset': `${c2Offset}px`,
            }"
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <div :class="$style.stage" :style="{ background: BG.claro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'claro') }">
          {{ P.before
          }}<a :href="HREF_UNWRITTEN" class="link-unwritten" :title="TITLE_UNWRITTEN" :class="$style.c2deco"
            :style="{ '--c2-style': c2Style, '--c2-thickness': `${c2Thickness}px`, '--c2-offset': `${c2Offset}px` }"
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c2deco, $style.c2color, { [$style.c2hoverSolid]: c2Hover === 'solido' }]"
            :style="{
              '--link-color': hexFor(c2Role, 'claro'),
              '--c2-style': c2Style,
              '--c2-thickness': `${c2Thickness}px`,
              '--c2-offset': `${c2Offset}px`,
            }"
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c2deco, $style.c2color, { [$style.c2hoverSolid]: c2Hover === 'solido' }]"
            :style="{
              '--link-color': hexFor(c2Role, 'claro'),
              '--c2-style': c2Style,
              '--c2-thickness': `${c2Thickness}px`,
              '--c2-offset': `${c2Offset}px`,
            }"
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <Panel label="tracejado de terminal">
        <Pick v-model="c2Role" label="cor" :options="ROLE_OPTIONS_COM_APAGADO" />
        <Pick v-model="c2Style" label="estilo" :options="STYLE2_OPTIONS" />
        <Knob v-model="c2Thickness" label="espessura" :min="1" :max="4" unit="px" />
        <Knob v-model="c2Offset" label="distância do texto" :min="0" :max="8" unit="px" />
        <Pick v-model="c2Hover" label="hover" :options="HOVER2_OPTIONS" />
      </Panel>
      <p :class="$style.readout">
        contraste de {{ ROLE_LABEL[c2Role] }}: {{ contrastFor(c2Role).escuro.toFixed(2) }}:1 no escuro ·
        {{ contrastFor(c2Role).claro.toFixed(2) }}:1 no claro. Não depende só de cor.
      </p>
    </div>

    <!-- 3 · Colchetes, sem sublinhado -->
    <div :class="$style.candidate">
      <p :class="$style['candidate-title']">3 · Colchetes, sem sublinhado</p>
      <p :class="$style['candidate-origin']">
        Sem sublinhado nenhum em repouso: quem marca o link é a moldura de caracteres em volta dele, o mesmo
        <code>[ ]</code> que o texto de referência do textmode.js usa no botão (registrado em docs/theming.md,
        seção 2). Os caracteres são texto real dentro do link e não <code>::before</code>/<code>::after</code>,
        porque o <code>::after</code> de cada link em prosa já está ocupado pelo ícone de âncora externa/interna;
        os dois não cabem no mesmo pseudo-elemento. Como a forma da moldura não é cor, o link continua identificável
        sem depender de cor mesmo quando a cor escolhida abaixo é "texto" (a mesma do corpo).
      </p>
      <div :class="$style.stage" :style="{ background: BG.escuro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'escuro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="[$style.c3anchor, { [$style.c3hoverUnderline]: c3Hover === 'sublinha', [$style.c3hoverBright]: c3Hover === 'clareia' }]"
            ><span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][0] }}</span
            >{{ P.unwritten }}<span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][1] }}</span></a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c3anchor, $style.c3color, { [$style.c3hoverUnderline]: c3Hover === 'sublinha', [$style.c3hoverBright]: c3Hover === 'clareia' }]"
            :style="{ '--link-color': hexFor(c3Role, 'escuro') }"
            ><span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][0] }}</span
            >{{ P.internal }}<span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][1] }}</span></a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c3anchor, $style.c3color, { [$style.c3hoverUnderline]: c3Hover === 'sublinha', [$style.c3hoverBright]: c3Hover === 'clareia' }]"
            :style="{ '--link-color': hexFor(c3Role, 'escuro') }"
            ><span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][0] }}</span
            >{{ P.external }}<span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][1] }}</span></a
          >{{ P.after }}
        </p>
      </div>
      <div :class="$style.stage" :style="{ background: BG.claro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'claro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="[$style.c3anchor, { [$style.c3hoverUnderline]: c3Hover === 'sublinha', [$style.c3hoverBright]: c3Hover === 'clareia' }]"
            ><span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][0] }}</span
            >{{ P.unwritten }}<span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][1] }}</span></a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c3anchor, $style.c3color, { [$style.c3hoverUnderline]: c3Hover === 'sublinha', [$style.c3hoverBright]: c3Hover === 'clareia' }]"
            :style="{ '--link-color': hexFor(c3Role, 'claro') }"
            ><span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][0] }}</span
            >{{ P.internal }}<span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][1] }}</span></a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c3anchor, $style.c3color, { [$style.c3hoverUnderline]: c3Hover === 'sublinha', [$style.c3hoverBright]: c3Hover === 'clareia' }]"
            :style="{ '--link-color': hexFor(c3Role, 'claro') }"
            ><span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][0] }}</span
            >{{ P.external }}<span :class="$style.c3bracket" aria-hidden="true">{{ BRACKET_PAIRS[c3Bracket][1] }}</span></a
          >{{ P.after }}
        </p>
      </div>
      <Panel label="colchetes">
        <Pick v-model="c3Role" label="cor" :options="ROLE_OPTIONS_COM_TEXTO" />
        <Pick v-model="c3Bracket" label="moldura" :options="BRACKET_OPTIONS" />
        <Pick v-model="c3Hover" label="hover" :options="HOVER3_OPTIONS" />
      </Panel>
      <p :class="$style.readout">
        contraste de {{ ROLE_LABEL[c3Role] }}: {{ contrastFor(c3Role).escuro.toFixed(2) }}:1 no escuro ·
        {{ contrastFor(c3Role).claro.toFixed(2) }}:1 no claro.
        <template v-if="c3Role === 'fg'">
          Cor igual à do corpo de propósito: sem sublinhado e sem diferença de cor, quem marca o link é só a moldura,
          e isso ainda cobre a WCAG 1.4.1 porque a moldura é forma, não cor.
        </template>
        <template v-else> Não depende só de cor, a moldura já seria suficiente sozinha. </template>
      </p>
    </div>

    <!-- 4 · Bloco invertido no hover -->
    <div :class="$style.candidate">
      <p :class="$style['candidate-title']">4 · Bloco invertido no hover</p>
      <p :class="$style['candidate-origin']">
        A seleção de um terminal: em repouso o link é discreto, no hover o fundo vira a cor do link e o texto vira a
        cor do fundo da página, um retângulo cheio em vez de um sublinhado. É o único candidato desta bancada em que
        o hover troca de cor contra o padrão do próprio site (que hoje troca o texto para <code>--fg</code> e engrossa
        com <code>text-stroke</code>, sem preencher fundo nenhum), e o único em que o hover empurra o texto ao redor,
        porque um preenchimento não existe sem algum respiro.
      </p>
      <div :class="$style.stage" :style="{ background: BG.escuro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'escuro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="[{ [$style.c4restDotted]: c4Rest === 'pontilhado' }]"
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c4color, { [$style.c4restDotted]: c4Rest === 'pontilhado', [$style.c4restBg]: c4Rest === 'fundo' }]"
            :style="{ '--link-color': hexFor(c4Role, 'escuro'), '--c4-invert-ink': BG.escuro, '--c4-pad': `${c4Pad}px` }"
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c4color, { [$style.c4restDotted]: c4Rest === 'pontilhado', [$style.c4restBg]: c4Rest === 'fundo' }]"
            :style="{ '--link-color': hexFor(c4Role, 'escuro'), '--c4-invert-ink': BG.escuro, '--c4-pad': `${c4Pad}px` }"
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <div :class="$style.stage" :style="{ background: BG.claro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'claro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="[{ [$style.c4restDotted]: c4Rest === 'pontilhado' }]"
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c4color, { [$style.c4restDotted]: c4Rest === 'pontilhado', [$style.c4restBg]: c4Rest === 'fundo' }]"
            :style="{ '--link-color': hexFor(c4Role, 'claro'), '--c4-invert-ink': BG.claro, '--c4-pad': `${c4Pad}px` }"
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c4color, { [$style.c4restDotted]: c4Rest === 'pontilhado', [$style.c4restBg]: c4Rest === 'fundo' }]"
            :style="{ '--link-color': hexFor(c4Role, 'claro'), '--c4-invert-ink': BG.claro, '--c4-pad': `${c4Pad}px` }"
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <Panel label="bloco invertido">
        <Pick v-model="c4Role" label="cor" :options="ROLE_OPTIONS" />
        <Pick v-model="c4Rest" label="repouso" :options="REST4_OPTIONS" />
        <Knob v-model="c4Pad" label="respiro do bloco" :min="0" :max="8" unit="px" />
      </Panel>
      <p :class="$style.readout">
        contraste de {{ ROLE_LABEL[c4Role] }}: {{ contrastFor(c4Role).escuro.toFixed(2) }}:1 no escuro ·
        {{ contrastFor(c4Role).claro.toFixed(2) }}:1 no claro.
        <template v-if="c4Rest === 'fundo'">
          O repouso de fundo tintado sozinho é só cor, sem forma nenhuma junto: prefira o pontilhado se o link
          precisar ficar identificável sem passar o mouse ou o foco.
        </template>
        <template v-else> Não depende só de cor. </template>
      </p>
    </div>

    <!-- 5 · Marcador de prompt -->
    <div :class="$style.candidate">
      <p :class="$style['candidate-title']">5 · Marcador de prompt</p>
      <p :class="$style['candidate-origin']">
        Um caractere antes do link, como um prompt de terminal, mais o sublinhado pontilhado que já existe no botão
        de estilo "prompt" de <code>ChromeButton.vue</code> (<code>text-decoration-style: dotted</code>,
        <code>text-underline-offset: 0.3em</code>): a mesma peça, reaproveitada, agora dentro de uma frase em vez de
        um botão isolado.
      </p>
      <div :class="$style.stage" :style="{ background: BG.escuro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'escuro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="$style.c5deco"
            :style="{ '--c5-style': c5Style }"
            ><span :class="$style.c5marker" aria-hidden="true" :style="{ '--c5-marker-opacity': c5Hover === 'sempre' ? 1 : 0 }">{{
              MARKER_CHAR[c5Marker]
            }}</span
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c5deco, $style.c5color, $style.c5anchor]"
            :style="{ '--link-color': hexFor(c5Role, 'escuro'), '--c5-style': c5Style }"
            ><span :class="$style.c5marker" aria-hidden="true" :style="{ '--c5-marker-opacity': c5Hover === 'sempre' ? 1 : 0 }">{{
              MARKER_CHAR[c5Marker]
            }}</span
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c5deco, $style.c5color, $style.c5anchor]"
            :style="{ '--link-color': hexFor(c5Role, 'escuro'), '--c5-style': c5Style }"
            ><span :class="$style.c5marker" aria-hidden="true" :style="{ '--c5-marker-opacity': c5Hover === 'sempre' ? 1 : 0 }">{{
              MARKER_CHAR[c5Marker]
            }}</span
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <div :class="$style.stage" :style="{ background: BG.claro }">
        <p :class="$style.sample" :style="{ color: hexFor('fg', 'claro') }">
          {{ P.before
          }}<a
            :href="HREF_UNWRITTEN"
            class="link-unwritten"
            :title="TITLE_UNWRITTEN"
            :class="$style.c5deco"
            :style="{ '--c5-style': c5Style }"
            ><span :class="$style.c5marker" aria-hidden="true" :style="{ '--c5-marker-opacity': c5Hover === 'sempre' ? 1 : 0 }">{{
              MARKER_CHAR[c5Marker]
            }}</span
            >{{ P.unwritten }}</a
          >{{ P.mid1
          }}<a
            :href="HREF_INTERNAL"
            :class="[$style.c5deco, $style.c5color, $style.c5anchor]"
            :style="{ '--link-color': hexFor(c5Role, 'claro'), '--c5-style': c5Style }"
            ><span :class="$style.c5marker" aria-hidden="true" :style="{ '--c5-marker-opacity': c5Hover === 'sempre' ? 1 : 0 }">{{
              MARKER_CHAR[c5Marker]
            }}</span
            >{{ P.internal }}</a
          >{{ P.mid2 }}<code>{{ P.code }}</code
          >{{ P.mid3
          }}<a
            :href="HREF_EXTERNAL"
            :class="[$style.c5deco, $style.c5color, $style.c5anchor]"
            :style="{ '--link-color': hexFor(c5Role, 'claro'), '--c5-style': c5Style }"
            ><span :class="$style.c5marker" aria-hidden="true" :style="{ '--c5-marker-opacity': c5Hover === 'sempre' ? 1 : 0 }">{{
              MARKER_CHAR[c5Marker]
            }}</span
            >{{ P.external }}</a
          >{{ P.after }}
        </p>
      </div>
      <Panel label="marcador de prompt">
        <Pick v-model="c5Role" label="cor" :options="ROLE_OPTIONS_COM_APAGADO" />
        <Pick v-model="c5Marker" label="marcador" :options="MARKER_OPTIONS" />
        <Pick v-model="c5Style" label="estilo do sublinhado" :options="STYLE5_OPTIONS" />
        <Pick v-model="c5Hover" label="hover" :options="HOVER5_OPTIONS" />
      </Panel>
      <p :class="$style.readout">
        contraste de {{ ROLE_LABEL[c5Role] }}: {{ contrastFor(c5Role).escuro.toFixed(2) }}:1 no escuro ·
        {{ contrastFor(c5Role).claro.toFixed(2) }}:1 no claro. Não depende só de cor: o marcador some ou não, mas o
        sublinhado fica o tempo todo.
      </p>
    </div>

    <DecisionCopy lab="links em prosa" component="LinkLab.vue" :settings="decisionSettings" :context="decisionContext" />
  </div>
</template>

<style module>
.demo {
  font-family: var(--font-mono);
}

.chooser {
  margin-block-end: 0.3rem;
}

.candidate {
  margin-block-start: 1.6rem;
  padding: 0.9rem;
  border: 1px solid var(--rule);
}

.candidate-title {
  margin: 0;
  color: var(--fg);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.candidate-origin {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.stage {
  margin-block-start: 0.6rem;
  padding: 0.9rem 1rem;
}

.sample {
  max-inline-size: 62ch;
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
}

.readout,
.note {
  margin: 0.6rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}

/* Candidato 1: sublinhado translúcido que abre opaco no hover. */
.c1deco {
  text-decoration-line: underline;
  text-decoration-thickness: var(--c1-thickness);
  text-underline-offset: var(--c1-offset);
  text-decoration-skip-ink: var(--c1-skip-ink);
  transition: text-decoration-color 150ms ease;
}

.c1color {
  color: var(--link-color);
  text-decoration-color: color-mix(in oklab, currentColor var(--c1-alpha), transparent);
}

.c1hoverBrighten:hover,
.c1hoverBrighten:focus-visible {
  text-decoration-color: currentColor;
}

/* Candidato 2: tracejado grosso e afastado, com opção de virar sólido no hover. */
.c2deco {
  text-decoration-line: underline;
  text-decoration-style: var(--c2-style);
  text-decoration-thickness: var(--c2-thickness);
  text-underline-offset: var(--c2-offset);
  transition: text-decoration-style 150ms ease;
}

.c2color {
  color: var(--link-color);
}

.c2hoverSolid:hover,
.c2hoverSolid:focus-visible {
  text-decoration-style: solid;
}

/* Candidato 3: colchetes de texto real, não pseudo-elemento (o ::after já é o ícone). */
.c3anchor {
  text-decoration-line: none;
}

.c3color {
  color: var(--link-color);
}

.c3bracket {
  opacity: 0.65;
}

.c3hoverUnderline:hover,
.c3hoverUnderline:focus-visible {
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.3em;
}

.c3hoverBright:hover,
.c3hoverBright:focus-visible {
  filter: brightness(1.35);
}

/* Candidato 4: em repouso quase nada, no hover o bloco inteiro inverte. */
.c4color {
  color: var(--link-color);
}

.c4restDotted {
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

.c4restBg {
  text-decoration-line: none;
  background: color-mix(in oklab, var(--link-color) 15%, transparent);
}

.stage .c4color:hover,
.stage .c4color:focus-visible {
  background: var(--link-color);
  color: var(--c4-invert-ink);
  padding-inline: var(--c4-pad);
  text-decoration-line: none;
  -webkit-text-stroke: 0 transparent;
}

/* Candidato 5: marcador de prompt reaproveitando o desenho do botão "prompt". */
.c5color {
  color: var(--link-color);
}

.c5deco {
  text-decoration-line: underline;
  text-decoration-style: var(--c5-style);
  text-underline-offset: 0.3em;
}

.c5marker {
  margin-inline-end: 0.25em;
  opacity: var(--c5-marker-opacity);
  transition: opacity 150ms ease;
}

.c5anchor:hover .c5marker,
.c5anchor:focus-visible .c5marker {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .c1deco,
  .c2deco,
  .c5marker,
  .stage .c4color {
    transition: none;
  }
}
</style>
