<script setup lang="ts">
defineProps<{ label: string }>()

const value = defineModel<boolean>({ required: true })
</script>

<template>
  <label :class="$style.toggle">
    <input v-model="value" type="checkbox" />
    <span>{{ label }}</span>
  </label>
</template>

<style module>
.toggle {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.toggle input {
  accent-color: var(--brand-green);
}

.toggle:has(input:checked) {
  color: var(--fg);
}
</style>
