<script setup lang="ts">
defineProps<{
  modelValue: string
  label: string
  type?: string
  disabled?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="block">
    <span class="font-sans text-label-md text-luxe-on-surface-variant">{{ label }}</span>
    <input
      :type="type ?? 'text'"
      :value="modelValue"
      :disabled="disabled"
      class="mt-1 w-full rounded-md border-0 border-b border-luxe-outline bg-transparent px-2 py-2 font-sans text-body-md text-luxe-on-surface focus:border-luxe-secondary-container focus:outline-none disabled:opacity-50"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="mt-1 block font-sans text-body-sm text-luxe-error">{{ error }}</span>
  </label>
</template>
