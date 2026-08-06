<template>
  <button
    :id="id"
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-luxe font-sans font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="[sizeClasses[size], variantClasses[variant]]"
    @click="emit('click')"
  >
    <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue'

interface Props {
  id?: string
  label?: string
  type?: ButtonHTMLAttributes['type']
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  id: 'base-button',
  label: '',
  type: 'button',
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  click: []
}>()

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg'
}

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-brand text-cream hover:bg-brand-light shadow-luxe',
  outline: 'border border-brand text-brand hover:bg-wine-50',
  ghost: 'text-brand hover:bg-wine-50'
}

defineOptions({ name: 'BaseButton' })
</script>
