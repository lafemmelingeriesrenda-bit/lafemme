<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="font-sans text-sm font-medium text-wine-800">
      {{ label }}
    </label>

    <div v-if="modelValue.length > 0" class="grid grid-cols-3 gap-2">
      <div
        v-for="item in modelValue"
        :key="item.id"
        class="group relative aspect-square overflow-hidden rounded-luxe border border-wine-100 bg-wine-50"
      >
        <img
          :src="previewUrl(item)"
          :alt="`Imagem do produto`"
          class="h-full w-full object-cover"
        />
        <button
          type="button"
          class="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
          :aria-label="`Remover imagem`"
          @click="remover(item.id)"
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
import type { ItemImagem } from '~/composables/useSalvarProduto'

interface Props {
  modelValue?: ItemImagem[]
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
  'update:modelValue': [items: ItemImagem[]]
}>()

const picker = ref<HTMLInputElement | null>(null)
const urls = new Map<string, string>()

const aceitaMais = computed(() =>
  props.multiple ? props.modelValue.length < props.max : props.modelValue.length === 0
)

function previewUrl(item: ItemImagem): string {
  if (item.url) {
    return item.url
  }
  if (!item.file) {
    return ''
  }
  const cached = urls.get(item.id)
  if (cached) {
    return cached
  }
  const url = URL.createObjectURL(item.file)
  urls.set(item.id, url)
  return url
}

function novaItem(file: File): ItemImagem {
  return { id: crypto.randomUUID(), file }
}

function handleChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  if (props.multiple) {
    const rest = props.max - props.modelValue.length
    const novos = files.slice(0, rest).map(novaItem)
    emit('update:modelValue', [...props.modelValue, ...novos].slice(0, props.max))
  } else {
    emit('update:modelValue', files.slice(0, 1).map(novaItem))
  }

  input.value = ''
}

function remover(id: string) {
  const next = [...props.modelValue]
  const index = next.findIndex((item) => item.id === id)
  if (index === -1) {
    return
  }
  const url = urls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(id)
  }
  next.splice(index, 1)
  emit('update:modelValue', next)
}

defineOptions({ name: 'BaseUpload' })
</script>