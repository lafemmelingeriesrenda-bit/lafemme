<template>
  <header id="app-header" class="border-b border-wine-100 bg-white">
    <div class="grid w-full grid-cols-[auto_1fr_auto] items-center px-4 py-1 md:px-6">
      <NuxtLink to="/" class="justify-self-start">
        <img
          id="app-header-logo"
          src="/logo%202.png"
          alt="La Femme Lingerie"
          class="h-20 w-auto object-contain"
        />
      </NuxtLink>

      <h1
        id="app-header-title"
        class="justify-self-center text-center font-display text-3xl font-semibold text-brand"
      >
        Catálogo
      </h1>

      <div id="app-header-actions" class="flex items-center gap-3 justify-self-end">
        <button
          id="app-header-cart"
          type="button"
          class="relative rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
          :title="tituloSacola"
          :aria-label="tituloSacola"
          @click="emit('abrir-sacola')"
        >
          <ShoppingBagIcon class="h-6 w-6" />
          <span
            v-if="quantidadeTotal > 0"
            id="app-header-cart-badge"
            class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 font-sans text-xs font-medium text-cream"
          >
            {{ quantidadeTotal }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'
import { useCarrinho } from '~/composables/useCarrinho'

const emit = defineEmits<{
  'abrir-sacola': []
}>()

defineOptions({ name: 'AppHeader' })

const { quantidadeTotal } = useCarrinho()

const tituloSacola = computed<string>(() =>
  quantidadeTotal.value > 0
    ? `Carrinho (${quantidadeTotal.value} itens)`
    : 'Carrinho vazio'
)
</script>
