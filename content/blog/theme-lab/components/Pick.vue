<script setup lang="ts">
defineProps<{ label: string; options: Array<{ id: string; name: string }> }>()

const value = defineModel<string>({ required: true })
</script>

<template>
  <label class="pick">
    <span class="pick-name">{{ label }}</span>
    <select v-model="value">
      <option v-for="option in options" :key="option.id" :value="option.id">{{ option.name }}</option>
    </select>
  </label>
</template>

<style scoped>
.pick {
  display: grid;
  gap: 0.1rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.pick-name {
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

select {
  padding: 0.2rem 0.3rem;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: var(--bg);
  color: var(--fg);
  font: inherit;
}

select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
</style>
