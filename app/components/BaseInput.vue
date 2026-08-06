<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="font-sans text-sm font-medium text-wine-800">
      {{ label }}
    </label>
    <div class="relative">
      <input
        :id="id"
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
        :class="{ 'pr-12': type === 'password' }"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-3 flex items-center text-wine-400 transition hover:text-brand"
        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
        @click="showPassword = !showPassword"
      >
        <EyeIcon v-if="!showPassword" class="h-5 w-5" />
        <EyeSlashIcon v-else class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import type { InputHTMLAttributes } from 'vue'

interface Props {
  id?: string
  label?: string
  modelValue?: string
  type?: InputHTMLAttributes['type']
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: 'base-input',
  label: '',
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
const resolvedType = computed(() =>
  props.type === 'password' && showPassword.value ? 'text' : props.type
)

defineOptions({ name: 'BaseInput' })
</script>
