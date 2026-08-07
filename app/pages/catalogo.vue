<template>
  <main class="bg-cream">
    <section class="mx-auto max-w-6xl px-6 py-12">
      <p v-if="loading" class="text-center font-sans text-lg text-wine-700">
        Carregando produtos...
      </p>

      <p v-else-if="error" class="text-center font-sans text-lg text-wine-700">
        {{ error }}
      </p>

      <div v-else class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        <ProductCard
          v-for="produto in produtos"
          :key="produto.produtoId"
          :produto="produto"
          :src="produto.foto ?? ''"
          :name="produto.nome"
          :variantes="produto.variantes"
          @add-to-cart="handleAddToCart"
          @abrir-produto="handleAbrirProduto"
        />
      </div>
    </section>

    <VisualizarProduto
      :aberto="visualizarAberto"
      :produto="produtoVisualizado"
      @fechar="visualizarAberto = false"
    />
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import ProductCard from '~/components/ProductCard.vue'
import VisualizarProduto from '~/components/VisualizarProduto.vue'
import { useProdutos } from '~/composables/useProdutos'
import type { ProdutoCard } from '~/composables/useProdutos'

const visualizarAberto = ref(false)
const produtoVisualizado = ref<ProdutoCard | null>(null)

const { produtos, loading, error } = useProdutos()

function handleAbrirProduto(produto: ProdutoCard) {
  produtoVisualizado.value = produto
  visualizarAberto.value = true
}

function handleAddToCart(varianteId: number) {
  toast.success(`Variante ${varianteId} adicionada ao carrinho!`)
}

defineOptions({ name: 'CatalogoPage' })
</script>