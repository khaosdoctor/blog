<script setup lang="ts">
/**
 * As fontes recusadas, ainda renderizando de verdade.
 *
 * Cada uma aparece com um parágrafo real no tamanho em que era vista na bancada,
 * junto com o motivo de ter perdido. É uma lista e não um painel com controles de
 * propósito: não há mais nada para decidir aqui, e um slider numa decisão fechada
 * só convida a reabrir.
 *
 * O `fonts.css` do laboratório vivo declara todas elas, então esta página importa
 * aquele arquivo em vez de repetir vinte `@font-face`. Os arquivos seguem
 * vendorizados em `public/fonts/`.
 */
import { ref } from 'vue'
import { BODY_CANDIDATES, PIXEL_SURVEY, type RetiredFace } from './faces-retiradas'
import '../../theme-lab/components/fonts.css'

const SAMPLE =
  'O resolvedor não pergunta ao servidor raiz onde está o site: ele pergunta quem sabe responder sobre `.br`, e repete a pergunta descendo um nível a cada resposta até alguém devolver um endereço.'

/** Os dois grupos, com o rótulo do que cada um disputava. */
const GROUPS: Array<{ label: string; hint: string; faces: RetiredFace[] }> = [
  {
    label: 'candidatas ao corpo',
    hint: 'As cinco que foram medidas contra um post inteiro, não contra uma linha de amostra.',
    faces: BODY_CANDIDATES,
  },
  {
    label: 'o levantamento pixel',
    hint: 'Olhadas para cabeçalho, etiqueta e chrome. Nenhuma foi escolhida para nada.',
    faces: PIXEL_SURVEY,
  },
]

/** Fundo do site, para ver a fonte onde ela seria lida. */
const dark = ref(true)
</script>

<template>
  <div :class="$style.wrap">
    <button :class="$style.ground" type="button" @click="dark = !dark">
      fundo: {{ dark ? 'escuro do site' : 'claro do site' }}
    </button>

    <section v-for="group in GROUPS" :key="group.label" :class="$style.group">
      <h3 :class="$style.groupName">{{ group.label }}</h3>
      <p :class="$style.hint">{{ group.hint }}</p>

      <article
        v-for="face in group.faces"
        :key="face.id"
        :class="[$style.card, dark ? $style.onDark : $style.onLight]"
      >
        <header :class="$style.head">
          <span :class="$style.name">{{ face.name }}</span>
          <span :class="$style.tags">
            {{ face.licence }} · {{ face.role }} · {{ face.mono ? 'monoespaçada' : 'proporcional' }} ·
            {{ face.size }}px
          </span>
        </header>
        <p
          :class="$style.sample"
          :style="{ fontFamily: face.stack, fontSize: `${face.size}px` }"
        >
          {{ SAMPLE }}
        </p>
        <p :class="$style.reason">{{ face.reason }}</p>
      </article>
    </section>
  </div>
</template>

<style module>
.wrap {
  font-family: var(--font-mono);
}

.ground {
  margin-block-end: 1.2rem;
  padding: 0.35rem 0.7rem;
  border: var(--border) solid var(--rule);
  background: none;
  color: var(--fg);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
}

.group {
  margin-block-end: 1.6rem;
}

.groupName {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hint {
  margin: 0.2rem 0 0.9rem;
  color: var(--muted);
  font-size: 0.7rem;
}

.card {
  margin-block-end: 0.8rem;
  padding: 0.8rem 0.9rem;
  border: var(--border) solid var(--rule);
  border-inline-start: var(--border-card-edge) solid var(--rule);
}

/* Os dois fundos de verdade do site, fixos: preto absoluto e o sépia. */
.onDark {
  background: #000000;
  color: #e0dcd4;
}

.onLight {
  background: #f4efe0;
  color: #332d23;
}

.head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.6rem;
  align-items: baseline;
  margin-block-end: 0.5rem;
}

.name {
  font-family: var(--font-display);
  font-size: 0.78rem;
}

.tags {
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.sample {
  /* Sem herança de entrelinha do post: cada amostra é lida no espaçamento em que
     a fonte foi julgada, e não no da fonte que ganhou. */
  margin: 0 0 0.6rem;
  line-height: 1.6;
  max-inline-size: 62ch;
}

.reason {
  margin: 0;
  padding-block-start: 0.5rem;
  border-block-start: var(--border) dashed currentcolor;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  line-height: 1.6;
  opacity: 0.85;
}
</style>
