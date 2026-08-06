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
          :src="produto.foto ?? ''"
          :name="produto.nome"
          :variantes="produto.variantes"
          @add-to-cart="handleAddToCart"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import ProductCard from '~/components/ProductCard.vue'
import { useProdutos } from '~/composables/useProdutos'

const { produtos, loading, error } = useProdutos()

function handleAddToCart(varianteId: number) {
  toast.success(`Variante ${varianteId} adicionada ao carrinho!`)
}

defineOptions({ name: 'CatalogoPage' })
</script>