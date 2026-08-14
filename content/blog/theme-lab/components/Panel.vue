<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <div class="panel">
    <p v-if="label" class="panel-label">{{ label }}</p>
    <div class="panel-grid"><slot /></div>
  </div>
</template>

<style scoped>
.panel {
  margin-block-start: 0.9rem;
  padding-block-start: 0.6rem;
  border-block-start: 1px dashed var(--rule);
}

.panel-label {
  margin: 0 0 0.5rem;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: 0.35rem 1.2rem;
  align-items: center;
}
</style>
