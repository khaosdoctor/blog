<script setup lang="ts">
/**
 * Um botão por bancada: resume a configuração escolhida em um prompt pronto
 * para colar numa conversa, sem precisar reabrir o lab para descrever de
 * memória o que os sliders diziam. Cada lab resolve seus próprios ids de knob
 * em rótulo e valor concretos antes de passar a lista aqui; este componente só
 * monta o texto e cuida do clipboard.
 */
import { computed, ref } from 'vue'

interface Setting {
  label: string
  value: string
}

const props = defineProps<{
  lab: string
  component: string
  settings: Setting[]
  context?: string
}>()

type Status = 'ocioso' | 'copiado' | 'manual'
const status = ref<Status>('ocioso')
const fallback = ref<HTMLTextAreaElement | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | null = null

const prompt = computed(() => {
  const lines = props.settings.map((setting) => `- ${setting.label}: ${setting.value}`).join('\n')
  const contextBlock = props.context ? `\n\n${props.context}` : ''
  return `Decidi o candidato "${props.lab}" (${props.component}), arquivado em /theme-lab-arquivo/.

Configuração escolhida:
${lines}${contextBlock}

Aplique isso no site. O componente já mora em content/blog/theme-lab-arquivo/ e
continua lá depois da decisão, seguindo a regra em AGENTS.md: candidatos são o
argumento do artigo que eu quero escrever sobre isso.`
})

const buttonText = computed(() => {
  if (status.value === 'copiado') return 'COPIADO'
  if (status.value === 'manual') return 'SELECIONADO, USE CTRL+C'
  return 'COPIAR DECISÃO'
})

function scheduleReset() {
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (status.value = 'ocioso'), 2400)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(prompt.value)
    status.value = 'copiado'
  } catch (error) {
    // O clipboard rejeita sem gesto de usuário ou fora de HTTPS. Em vez de
    // fingir que copiou, cai para uma caixa selecionada para copiar na mão.
    console.error('Falha ao copiar a decisão do theme lab:', error)
    status.value = 'manual'
    fallback.value?.focus()
    fallback.value?.select()
  }
  scheduleReset()
}
</script>

<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.button" @click="copy">{{ buttonText }}</button>
    <textarea v-if="status === 'manual'" ref="fallback" :class="$style.fallback" readonly :value="prompt"></textarea>
  </div>
</template>

<style module>
.wrap {
  display: grid;
  gap: 0.4rem;
  margin-block-start: 0.7rem;
}

.button {
  justify-self: start;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: transparent;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.button:hover,
.button:focus-visible {
  background: #ffffff12;
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.fallback {
  inline-size: 100%;
  min-block-size: 6rem;
  padding: 0.5rem;
  border: 1px dashed var(--rule);
  border-radius: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 0.7rem;
}
</style>
