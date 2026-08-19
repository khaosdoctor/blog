<script setup lang="ts">
/**
 * A lista de posts, que é a página mais visitada do site depois dos posts em si.
 * Sete leituras: quatro só de texto, do mais denso ao mais decorado; duas que
 * carregam uma miniatura da capa (grade em proporção nativa, lista com
 * miniatura quadrada) para comparar o que uma imagem por linha custa em
 * altura; e uma sétima onde o leitor troca entre as duas formas de capa sem
 * trocar de candidato, o jeito como uma página de verdade carregaria essa
 * escolha.
 */
import { computed, ref } from 'vue'
import DecisionCopy from './DecisionCopy.vue'
import Knob from './Knob.vue'
import Panel from './Panel.vue'
import Pick from './Pick.vue'
import Toggle from './Toggle.vue'
import { parseHex, ratio } from './contrast'
import './fonts.css'

const POSTS = [
  { date: '2026 AGO 12', title: 'Quando a abstração vaza', tag: 'opinion', read: '9 min' },
  { date: '2026 JUL 30', title: 'error.cause, e por que ninguém usa', tag: 'javascript', read: '6 min' },
  { date: '2026 JUL 02', title: 'Um servidor gRPC em Node do zero', tag: 'infra', read: '21 min' },
  { date: '2026 JUN 18', title: 'O que eu aprendi mantendo um blog por seis anos', tag: 'meta', read: '12 min' },
]

const STACKS: Record<string, string> = {
  departure: "'Departure Mono', ui-monospace, monospace",
  ibmvga: "'PxPlus IBM VGA8', ui-monospace, monospace",
  dotgothic: "'DotGothic16', sans-serif",
  plex: "'IBM Plex Mono', ui-monospace, monospace",
  vt323: "'VT323', ui-monospace, monospace",
}

const BG = '#14161a'
const INK = '#e6e4e0'
const MUTED = '#9a9ea6'
const ACCENT = '#45b384'

const SHAPE_OPTIONS = [
  { id: 'tabela', name: 'tabela densa, 4 colunas' },
  { id: 'razao', name: 'razão com pontilhado' },
  { id: 'menu', name: 'menu de Game Boy ▸' },
  { id: 'cartoes', name: 'cartões com aresta grossa' },
  { id: 'grade', name: 'grade com capa, proporção nativa' },
  { id: 'miniatura', name: 'lista com miniatura quadrada' },
  { id: 'densidade', name: 'densidade que o leitor escolhe' },
]

/**
 * As duas cores vêm de CoverLab.vue: a capa real é um `<svg viewBox="0 0 1200
 * 630">` com a cor da marca tirada de um hash do slug, para o mesmo post
 * sempre bater a mesma capa. Aqui não existe post de verdade nem slug, então o
 * hash cai sobre o título, mas a forma é a mesma de chipColor() em
 * src/lib/taxonomy.ts: soma dos code points, resto pela quantidade de cores,
 * sem tabela de post para cor.
 *
 * Diferente da capa OG de CoverLab (que precisa de cor literal porque o sharp
 * rasteriza um arquivo estático fora do navegador), esta miniatura vive dentro
 * do HTML da página: o `<svg>` fica no DOM, então `var(--brand-*)` resolve ao
 * vivo e a miniatura já nasce no tema do leitor em vez de congelar um dos dois.
 */
const BRAND_TOKENS = [
  'var(--brand-blue)',
  'var(--brand-green)',
  'var(--brand-yellow)',
  'var(--brand-red)',
  'var(--brand-purple)',
]

// Só para o número de contraste ao vivo abaixo: os tokens acima resolvem para
// isto no tema escuro (src/styles/theme.css), que é o fundo fixo que esta
// bancada já assume (BG não muda com o tema do site, igual às outras quatro
// listas). No tema claro o valor real muda e este número não acompanha.
const BRAND_DARK_HEX: Record<string, string> = {
  'var(--brand-blue)': '#1480c2',
  'var(--brand-green)': '#45b384',
  'var(--brand-yellow)': '#f5b200',
  'var(--brand-red)': '#e6242f',
  'var(--brand-purple)': '#815bc2',
}

function coverColour(title: string): string {
  let sum = 0
  for (const char of title) sum += char.codePointAt(0) ?? 0
  return BRAND_TOKENS[sum % BRAND_TOKENS.length]
}

// O amarelo dos tokens é claro demais para tinta clara por cima, igual em
// CoverLab: só ele pede a tinta escura da própria bancada (BG).
function inkForCover(token: string): string {
  return token === 'var(--brand-yellow)' ? BG : INK
}

const LEADER_OPTIONS = [
  { id: '·', name: '· ponto médio' },
  { id: '.', name: '. ponto' },
  { id: '─', name: '─ traço de caixa' },
  { id: '╌', name: '╌ tracejado' },
  { id: ' ', name: 'nenhum' },
]

function labelFor(options: Array<{ id: string; name: string }>, id: string): string {
  return options.find((option) => option.id === id)?.name ?? id
}

const shape = ref('razao')
const face = ref('departure')
const leader = ref('·')
const rows = ref(14)
const tracking = ref(2)
const showTag = ref(true)
const selected = ref(0)
// Largura da capa na grade, lado do quadrado na miniatura: o mesmo knob muda
// de papel conforme o candidato, porque as duas formas de recorte pedem
// unidades diferentes, não porque o valor em si seja outro.
const thumbSize = ref(96)

// O controle de verdade do candidato "densidade": o leitor troca de cartão
// para lista sem trocar de página. Aqui é uma variável que reseta ao
// recarregar a bancada; numa página de verdade a escolha ficaria guardada
// (por exemplo localStorage, chave própria do site), não implementado aqui
// porque o pedido foi uma demonstração do controle, não o sistema de
// preferência inteiro.
const density = ref<'cards' | 'lista'>('cards')

const inkContrast = computed(() => ratio(parseHex(INK), parseHex(BG)).toFixed(2))
const mutedContrast = computed(() => ratio(parseHex(MUTED), parseHex(BG)).toFixed(2))

// Pior caso entre as cinco cores de marca: o monograma é a única letra que a
// miniatura carrega, então é ele que precisa continuar legível.
const thumbContrast = computed(() =>
  Math.min(
    ...BRAND_TOKENS.map((token) => ratio(parseHex(inkForCover(token)), parseHex(BRAND_DARK_HEX[token]))),
  ),
)

const base = computed(() => ({
  fontFamily: STACKS[face.value],
  letterSpacing: `${tracking.value / 100}em`,
  color: INK,
}))

const rowStyle = computed(() => ({ paddingBlock: `${rows.value / 20}rem` }))

// As constantes abaixo espelham os valores literais do CSS logo adiante
// (margens entre legenda e capa), para o número impresso não inventar um
// layout diferente do que a página de fato desenha. 16px por rem é o padrão
// do navegador, igual ao resto da conta de `rowStyle`.
const REM = 16
const GRADE_CAPTION_H = 44 // duas linhas de legenda (meta + título) mais as duas margens de 0.4rem entre elas
const GRADE_ROW_SPACING = 1.1 * REM // margem entre um cartão da grade e o próximo
const MINIATURA_TEXT_H = 18 // uma linha de título no tamanho de fonte da bancada

/** Quantas linhas cabem numa janela de 900px, o número de que a decisão de recorte depende. */
const rowsIn900Grade = computed(() => {
  const coverHeight = thumbSize.value * (630 / 1200)
  const padding = (rows.value / 20) * REM * 2
  return Math.floor(900 / (coverHeight + GRADE_CAPTION_H + GRADE_ROW_SPACING + padding))
})

const rowsIn900Miniatura = computed(() => {
  const padding = (rows.value / 20) * REM * 2
  return Math.floor(900 / (Math.max(thumbSize.value, MINIATURA_TEXT_H) + padding))
})

const decisionSettings = computed(() => [
  { label: 'candidato', value: labelFor(SHAPE_OPTIONS, shape.value) },
  { label: 'fonte', value: face.value },
  { label: 'pontilhado', value: labelFor(LEADER_OPTIONS, leader.value) },
  { label: 'altura da linha', value: String(rows.value) },
  { label: 'entreletra', value: `${tracking.value}/100em` },
  { label: 'mostrar seção', value: showTag.value ? 'sim' : 'não' },
  { label: 'tamanho da miniatura', value: `${thumbSize.value}px` },
  { label: 'densidade escolhida (candidato "densidade")', value: density.value === 'cards' ? 'cartões' : 'lista' },
])

const decisionContext = computed(() => {
  const contrastText = `Título ${inkContrast.value}:1 · data e seção ${mutedContrast.value}:1 sobre ${BG}.`
  if (shape.value === 'grade') {
    return (
      `${contrastText} Capa na proporção nativa 1200x630, sem recorte, então cada cartão custa mais altura. ` +
      `Monograma ${thumbContrast.value.toFixed(2)}:1 no pior caso entre as cinco cores. ` +
      `Com miniatura de ${thumbSize.value}px, cabem ${rowsIn900Grade.value} linhas numa janela de 900px.`
    )
  }
  if (shape.value === 'miniatura') {
    return (
      `${contrastText} Capa recortada num quadrado, perde as bordas do cartão real para caber numa linha só. ` +
      `Monograma ${thumbContrast.value.toFixed(2)}:1 no pior caso entre as cinco cores. ` +
      `Com miniatura de ${thumbSize.value}px, cabem ${rowsIn900Miniatura.value} linhas numa janela de 900px.`
    )
  }
  if (shape.value === 'densidade') {
    const activeRows = density.value === 'cards' ? rowsIn900Grade.value : rowsIn900Miniatura.value
    return (
      `${contrastText} Densidade escolhida pelo leitor nesta sessão: ${density.value === 'cards' ? 'cartões' : 'lista'}. ` +
      `Monograma ${thumbContrast.value.toFixed(2)}:1 no pior caso. ` +
      `Com miniatura de ${thumbSize.value}px, cabem ${activeRows} linhas numa janela de 900px nesta densidade.`
    )
  }
  return contrastText
})
</script>

<template>
  <div :class="$style.demo">
    <div :class="$style.stage" :style="{ background: BG, ...base }">
      <!--
        Único controle que o leitor de verdade opera dentro do candidato (o
        Pick da bancada escolhe ENTRE candidatos, não dentro de um deles). Os
        dois <ol> de baixo (grade e miniatura) já sabem responder a ele: a
        condição de cada um só ganhou um "ou" a mais, então este candidato não
        duplica marcação nenhuma, só decide qual das duas já existentes aparece.
      -->
      <div v-if="shape === 'densidade'" :class="$style.densidadeControl" role="group" aria-label="densidade da lista">
        <button
          type="button"
          :class="$style.densidadeBotao"
          :style="{ color: density === 'cards' ? ACCENT : MUTED }"
          :aria-pressed="density === 'cards'"
          @click="density = 'cards'"
        >cartões</button>
        <button
          type="button"
          :class="$style.densidadeBotao"
          :style="{ color: density === 'lista' ? ACCENT : MUTED }"
          :aria-pressed="density === 'lista'"
          @click="density = 'lista'"
        >lista</button>
      </div>

      <ol v-if="shape === 'tabela'" :class="$style.tabela">
        <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
          <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span v-if="showTag" :class="$style.tag" :style="{ color: ACCENT }">{{ post.tag }}</span>
          <span :class="$style.read" :style="{ color: MUTED }">{{ post.read }}</span>
        </li>
      </ol>

      <ol v-else-if="shape === 'razao'" :class="$style.razao">
        <li v-for="(post, index) in POSTS" :key="post.title" :style="rowStyle">
          <span :class="$style.num" :style="{ color: MUTED }">{{ String(index).padStart(2, '0') }}</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span :class="$style.dots" :style="{ color: MUTED }" aria-hidden="true">{{ leader.repeat(60) }}</span>
          <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
        </li>
      </ol>

      <ol v-else-if="shape === 'menu'" :class="$style.menu">
        <li
          v-for="(post, index) in POSTS"
          :key="post.title"
          :style="rowStyle"
          :class="{ [$style.on]: index === selected }"
          @mouseenter="selected = index"
        >
          <span :class="$style.pointer" :style="{ color: index === selected ? ACCENT : 'transparent' }">▸</span>
          <span :class="$style.title">{{ post.title }}</span>
          <span v-if="showTag" :class="$style.tag" :style="{ color: MUTED }">{{ post.tag }}</span>
        </li>
      </ol>

      <ol v-else-if="shape === 'cartoes'" :class="$style.cartoes">
        <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
          <p :class="$style.meta" :style="{ color: MUTED }">
            {{ post.date }} <template v-if="showTag">· {{ post.tag }}</template> · {{ post.read }}
          </p>
          <p :class="$style.title">{{ post.title }}</p>
        </li>
      </ol>

      <!--
        A grade guarda a proporção 1200x630 da capa de verdade: a caixa da capa
        tem a mesma razão, então o SVG cai por padrão (preserveAspectRatio
        "meet") e não sobra nem falta pixel para recortar. O custo é a altura:
        cada linha da grade cabe poucos cartões numa janela de 900px, o que faz
        dela um candidato para uma frente curada, não para cem posts.
      -->
      <ol
        v-else-if="shape === 'grade' || (shape === 'densidade' && density === 'cards')"
        :class="$style.grade"
        :style="{ '--capa-largura': `${thumbSize}px` }"
      >
        <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
          <div :class="$style.capa">
            <svg viewBox="0 0 1200 630" :class="$style.capaSvg" role="img" :aria-label="`Capa de ${post.title}`">
              <rect width="1200" height="630" :fill="coverColour(post.title)" />
              <text
                x="600"
                y="345"
                text-anchor="middle"
                font-size="360"
                :fill="inkForCover(coverColour(post.title))"
                opacity="0.9"
              >{{ post.title.charAt(0).toUpperCase() }}</text>
            </svg>
          </div>
          <p :class="$style.meta" :style="{ color: MUTED }">
            {{ post.date }} <template v-if="showTag">· {{ post.tag }}</template>
          </p>
          <p :class="$style.title">{{ post.title }}</p>
        </li>
      </ol>

      <!--
        A miniatura recorta a mesma capa num quadrado (preserveAspectRatio
        "slice"): perde as bordas do cartão real, mas a cor e o monograma
        centrais sobrevivem ao corte, e a linha continua do tamanho de uma
        linha de texto, então é este o candidato que aguenta cem posts.
      -->
      <ol
        v-else-if="shape === 'miniatura' || (shape === 'densidade' && density === 'lista')"
        :class="$style.miniatura"
      >
        <li v-for="post in POSTS" :key="post.title" :style="rowStyle">
          <div :class="$style.chip" :style="{ '--chip-lado': `${thumbSize}px` }">
            <svg
              viewBox="0 0 1200 630"
              preserveAspectRatio="xMidYMid slice"
              :class="$style.chipSvg"
              role="img"
              :aria-label="`Capa de ${post.title}`"
            >
              <rect width="1200" height="630" :fill="coverColour(post.title)" />
              <text
                x="600"
                y="420"
                text-anchor="middle"
                font-size="480"
                :fill="inkForCover(coverColour(post.title))"
                opacity="0.9"
              >{{ post.title.charAt(0).toUpperCase() }}</text>
            </svg>
          </div>
          <span :class="$style.title">{{ post.title }}</span>
          <span v-if="showTag" :class="$style.tag" :style="{ color: ACCENT }">{{ post.tag }}</span>
          <span :class="$style.date" :style="{ color: MUTED }">{{ post.date }}</span>
        </li>
      </ol>
    </div>

    <Panel label="lista">
      <Pick v-model="shape" label="candidato" :options="SHAPE_OPTIONS" />
      <Pick v-model="face" label="fonte" :options="Object.keys(STACKS).map((id) => ({ id, name: id }))" />
      <Pick v-model="leader" label="pontilhado" :options="LEADER_OPTIONS" />
      <Knob v-model="rows" label="altura da linha" :min="6" :max="40" />
      <Knob v-model="tracking" label="entreletra" :min="-2" :max="20" unit="/100em" />
      <Toggle v-model="showTag" label="mostrar seção" />
      <Knob v-model="thumbSize" label="tamanho da miniatura" :min="32" :max="220" :step="4" unit="px" />
    </Panel>

    <p :class="$style.readout">
      título {{ inkContrast }}:1 · data e seção {{ mutedContrast }}:1 sobre {{ BG }}. A "razão" é a única que
      aguenta cem posts sem virar um muro, porque o olho corre pela coluna de títulos e o pontilhado leva até a
      data só quando o leitor procura por ela. O menu de Game Boy é o mais bonito e o que menos escala.
    </p>

    <p v-if="shape === 'grade'" :class="$style.readout">
      capa em 1200x630 nativa, sem recorte · monograma {{ thumbContrast.toFixed(2) }}:1 no pior caso · com
      miniatura de {{ thumbSize }}px cabem {{ rowsIn900Grade }} linhas numa janela de 900px. Boa para uma frente
      curada de dez posts, ruim para uma lista de cem: a altura da capa custa tela que a "razão" nem gasta.
    </p>

    <p v-else-if="shape === 'miniatura'" :class="$style.readout">
      capa recortada num quadrado de {{ thumbSize }}px · monograma {{ thumbContrast.toFixed(2) }}:1 no pior caso ·
      cabem {{ rowsIn900Miniatura }} linhas numa janela de 900px. Numa tela estreita o quadrado encolhe com o
      knob (a régua de 18% da largura da própria bancada, não da janela do navegador inteira) e o título trunca
      com reticências antes de forçar rolagem lateral.
    </p>

    <p v-else-if="shape === 'densidade'" :class="$style.readout">
      densidade atual: {{ density === 'cards' ? 'cartões' : 'lista' }} · monograma {{ thumbContrast.toFixed(2) }}:1
      no pior caso · cabem {{ density === 'cards' ? rowsIn900Grade : rowsIn900Miniatura }} linhas numa janela de
      900px nesta densidade. O botão acima é o controle de verdade, não o Pick da bancada; numa página real a
      escolha ficaria guardada (localStorage, chave própria do site), aqui ela só dura enquanto a bancada está
      aberta. As duas formas reaproveitam a marcação da grade e da miniatura acima, então trocar de densidade não
      custa HTML a mais, só a condição que decide qual delas aparece.
    </p>

    <DecisionCopy
      lab="lista de posts"
      component="ChromeList.vue"
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
  padding: clamp(1rem, 4%, 1.6rem);
  font-size: 0.85rem;
  overflow-x: auto;
  /* Container de consulta: a miniatura (.chip) mede sua régua de segurança
     contra a largura desta caixa, não da janela do navegador inteira, senão
     o knob e a régua nunca concordam no mesmo número. */
  container-type: inline-size;
}

.stage ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.stage li {
  cursor: pointer;
}

.tabela li {
  display: grid;
  grid-template-columns: 7rem 1fr auto auto;
  gap: 1rem;
  align-items: baseline;
  border-block-end: 1px dashed #ffffff1f;
}

.razao li {
  display: flex;
  gap: 0.7rem;
  align-items: baseline;
  overflow: hidden;
  white-space: nowrap;
}

.razao .dots {
  flex: 1;
  overflow: hidden;
}

.razao .num {
  font-variant-numeric: tabular-nums;
}

.menu li {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  padding-inline: 0.5rem;
}

.menu li.on {
  background: #ffffff0f;
}

.pointer {
  inline-size: 1em;
}

.menu .tag {
  margin-inline-start: auto;
  font-size: 0.72rem;
}

.cartoes {
  display: grid;
  gap: 0.7rem;
}

.cartoes li {
  padding: 0.7rem 0.9rem;
  border: 3px double #ffffff33;
  border-inline-start: 8px solid #ffffff33;
}

.cartoes li:hover {
  border-inline-start-color: #45b384;
}

.cartoes p {
  margin: 0;
}

.cartoes .meta {
  margin-block-end: 0.3rem;
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.densidadeControl {
  display: inline-flex;
  margin-block-end: 0.8rem;
  border: 1px solid #ffffff33;
}

.densidadeBotao {
  padding: 0.3rem 0.8rem;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.densidadeBotao + .densidadeBotao {
  border-inline-start: 1px solid #ffffff33;
}

/* Grade: cada item carrega sua própria margem em vez de um vão do contêiner,
   com o contêiner puxado de volta pela mesma medida, para as bordas externas
   da grade não ficarem com o dobro de respiro das internas.

   A largura de cada item vem direto do knob (min(var, 100%)), não de uma
   coluna de grade com minmax(..., 1fr): com só quatro posts na bancada, um
   grid auto-fit redistribui o espaço sobrando pelas colunas existentes e o
   valor mínimo nunca é o que decide a largura na tela, então o knob parecia
   não fazer nada. Em flexbox a largura pedida é a largura desenhada; a
   sobra de cada linha fica vazia, e numa tela mais estreita que a própria
   capa o cartão cai sozinho pra linha de baixo (min(..., 100%) nunca deixa
   passar da largura disponível). */
.grade {
  display: flex;
  flex-wrap: wrap;
  margin: -0.55rem;
}

.grade li {
  margin: 0.55rem;
  inline-size: min(var(--capa-largura, 160px), 100%);
}

.grade p {
  margin: 0;
}

.grade .capa {
  margin-block-end: 0.4rem;
}

.grade .meta {
  margin-block-end: 0.4rem;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.capa {
  inline-size: 100%;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
  border: 1px solid #ffffff1f;
}

.capaSvg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.miniatura li {
  display: flex;
  align-items: center;
}

.miniatura .chip {
  flex: none;
  margin-inline-end: 0.7rem;
}

.miniatura .title {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-inline-end: 0.7rem;
}

.miniatura .tag {
  flex: none;
  margin-inline-end: 0.7rem;
  font-size: 0.72rem;
}

.miniatura .date {
  flex: none;
  font-variant-numeric: tabular-nums;
}

/* 18cqi prende o quadrado a 18% da largura da própria bancada (.stage marca
   o container de consulta lá em cima). A régua era 18vw: mede a janela do
   navegador inteira, não a coluna estreita onde a lista de posto realmente
   vive, então o teto que a régua desenhava dependia da largura da janela em
   vez da largura que está na tela, e o knob e a régua nunca respondiam pelo
   mesmo número. cqi resolve contra o container de verdade. */
.chip {
  inline-size: min(var(--chip-lado, 56px), 18cqi);
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid #ffffff1f;
}

.chipSvg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.title:hover {
  text-decoration: underline;
}

.readout {
  margin: 0.8rem 0 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.6;
}
</style>
