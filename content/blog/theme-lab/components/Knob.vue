<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    min?: number
    max?: number
    step?: number
    unit?: string
  }>(),
  { min: 0, max: 100, step: 1, unit: '' },
)

const value = defineModel<number>({ required: true })
</script>

<template>
  <label class="knob">
    <span class="knob-name">{{ label }}</span>
    <input v-model.number="value" type="range" :min="min" :max="max" :step="step" />
    <output class="knob-value">{{ value }}{{ unit }}</output>
  </label>
</template>

<style scoped>
.knob {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.1rem 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.knob-name {
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.knob-value {
  color: var(--fg);
  font-variant-numeric: tabular-nums;
}

.knob:has(input) {
  grid-template-columns: 1fr auto;
  grid-template-areas: 'name name' 'input value';
}

.knob-name {
  grid-area: name;
}

input {
  grid-area: input;
  inline-size: 100%;
  accent-color: var(--brand-green);
}

.knob-value {
  grid-area: value;
  min-inline-size: 3.5ch;
  text-align: end;
}
</style>
