<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="font-sans text-sm font-medium text-wine-800">
      {{ label }}
    </label>

    <div v-if="modelValue.length > 0" class="grid grid-cols-3 gap-2">
      <div
        v-for="(file, index) in modelValue"
        :key="`${file.name}-${index}`"
        class="group relative aspect-square overflow-hidden rounded-luxe border border-wine-100 bg-wine-50"
      >
        <img
          :src="previewUrl(file)"
          :alt="file.name"
          class="h-full w-full object-cover"
        />
        <button
          type="button"
          class="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
          :aria-label="`Remover ${file.name}`"
          @click="remover(index)"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <button
      v-if="aceitaMais"
      type="button"
      class="flex h-24 items-center justify-center gap-2 rounded-luxe border border-dashed border-wine-300 font-sans text-sm text-wine-600 transition hover:border-brand hover:text-brand"
      @click="picker?.click()"
    >
      <PlusIcon class="h-6 w-6" />
      Adicionar imagem
    </button>

    <input
      ref="picker"
      type="file"
      accept="image/*"
      :multiple="multiple"
      class="hidden"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue?: File[]
  label?: string
  multiple?: boolean
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  label: '',
  multiple: false,
  max: 1
})

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const picker = ref<HTMLInputElement | null>(null)
const urls = new Map<string, string>()

const aceitaMais = computed(() =>
  props.multiple ? props.modelValue.length < props.max : props.modelValue.length === 0
)

function previewUrl(file: File): string {
  const cached = urls.get(file.name)
  if (cached) {
    return cached
  }
  const url = URL.createObjectURL(file)
  urls.set(file.name, url)
  return url
}

function handleChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  if (props.multiple) {
    const rest = props.max - props.modelValue.length
    emit('update:modelValue', [...props.modelValue, ...files].slice(0, props.max))
  } else {
    emit('update:modelValue', files.slice(0, 1))
  }

  input.value = ''
}

function remover(index: number) {
  const next = [...props.modelValue]
  const [removed] = next.splice(index, 1)
  if (removed) {
    const url = urls.get(removed.name)
    if (url) {
      URL.revokeObjectURL(url)
      urls.delete(removed.name)
    }
  }
  emit('update:modelValue', next)
}

defineOptions({ name: 'BaseUpload' })
</script>