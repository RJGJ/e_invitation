<script setup lang="ts">
defineProps<{
  disabled?: boolean
  type?: 'button' | 'submit'
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    class="rounded-md bg-luxe-primary px-6 py-3 font-sans text-title-md text-luxe-on-primary transition-opacity disabled:opacity-50"
  >
    <slot />
  </button>
</template>
