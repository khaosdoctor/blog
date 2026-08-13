<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="counter">
    <output class="value" aria-live="polite">{{ count }}</output>
    <div class="controls">
      <button type="button" title="Diminuir" @click="count -= 1">&minus;</button>
      <button type="button" title="Aumentar" @click="count += 1">+</button>
      <button type="button" title="Zerar" @click="count = 0">reset</button>
    </div>
  </div>
</template>

<style scoped>
.counter {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-block: 2rem;
  padding: 1rem;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  font-family: var(--font-mono);
}

.value {
  min-width: 3.5rem;
  color: var(--fg);
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.controls {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: transparent;
  color: var(--fg);
  font: inherit;
  cursor: pointer;
}

button:hover,
button:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
