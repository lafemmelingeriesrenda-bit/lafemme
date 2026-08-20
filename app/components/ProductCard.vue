<template>
  <article id="product-card" class="flex flex-col overflow-hidden rounded-luxe border border-wine-100 bg-white shadow-soft transition hover:shadow-luxe">
    <NuxtLink
      :to="destino"
      :aria-label="`Ver detalhes de ${name}`"
      class="flex h-56 items-center justify-center overflow-hidden bg-wine-50"
    >
      <img
        v-if="src"
        id="product-card-image"
        :src="src"
        :alt="name"
        loading="lazy"
        decoding="async"
        class="h-full w-full cursor-pointer object-cover"
      />
      <span
        v-else
        id="product-card-placeholder"
        class="flex h-full w-full flex-col items-center justify-center font-sans text-sm text-wine-300"
      >
        Imagem
      </span>
    </NuxtLink>

    <div class="flex flex-1 flex-col gap-1 p-4">
      <h2 id="product-card-name" class="font-display text-lg font-medium text-brand">
        {{ name }}
      </h2>

      <p v-if="selected" id="product-card-price" class="mt-2 font-sans text-base font-semibold text-brand">
        {{ formatPrice(selected.valor) }}
      </p>

      <div v-if="variantes.length > 0" id="product-card-sizes" class="mt-3 flex items-center gap-2">
        <span class="font-sans text-sm font-medium text-wine-700">Tamanhos:</span>
        <button
          v-for="variante in variantes"
          :key="variante.id"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border font-sans text-sm font-medium transition"
          :class="[
            selected?.id === variante.id
              ? 'border-brand bg-brand text-cream'
              : 'border-wine-200 text-wine-700 hover:border-brand hover:text-brand',
            !variante.disponivel && 'cursor-not-allowed opacity-40 hover:border-wine-200 hover:text-wine-700'
          ]"
          :disabled="!variante.disponivel"
          @click="select(variante)"
        >
          {{ variante.tamanho }}
        </button>
      </div>

      <BaseButton
        id="product-card-add-to-cart"
        label="Adicionar à sacola"
        variant="primary"
        size="sm"
        class="mt-4 w-full"
        :disabled="!selected || !selected.disponivel"
        @click="handleAddToCart"
      />

      <NuxtLink
        id="product-card-ver-detalhes"
        :to="destino"
        class="mt-2 inline-flex items-center justify-center gap-1 font-sans text-sm font-medium text-brand transition hover:text-brand-dark hover:underline"
      >
        Ver detalhes
        <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/BaseButton.vue'
import type { ProdutoCard } from '~/utils/agruparProdutos'
import { slugificarProduto, urlProduto } from '~/utils/slugProduto'

interface Variante {
  id: number
  tamanho: string
  valor: number
  quantidade: number
  disponivel: boolean
}

interface Props {
  produto: ProdutoCard
  src?: string
  name: string
  variantes: Variante[]
}

const props = withDefaults(defineProps<Props>(), {
  src: ''
})

const emit = defineEmits<{
  'add-to-cart': [varianteId: number]
}>()

const selected = ref<Variante | null>(props.variantes.find((variante) => variante.disponivel) ?? null)

watch(
  () => props.variantes,
  (variantes) => {
    const atual = selected.value ? variantes.find((variante) => variante.id === selected.value?.id) : null
    selected.value = atual?.disponivel
      ? atual
      : variantes.find((variante) => variante.disponivel) ?? null
  },
  { deep: true }
)

const destino = computed<string>(() => {
  if (props.produto.slug) {
    return urlProduto(props.produto.produtoId, props.produto.slug)
  }

  return urlProduto(props.produto.produtoId, slugificarProduto(props.name))
})

function select(variante: Variante) {
  if (variante.disponivel) {
    selected.value = variante
  }
}

function handleAddToCart() {
  if (selected.value?.disponivel === true) {
    emit('add-to-cart', selected.value.id)
  }
}

function formatPrice(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

defineOptions({ name: 'ProductCard' })
</script>
