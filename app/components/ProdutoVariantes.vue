<template>
  <div v-if="variantes.length > 0" class="flex flex-wrap gap-3">
    <div
      v-for="variante in variantes"
      :key="variante.id"
      class="flex flex-col gap-1 rounded-luxe border border-wine-100 bg-white px-4 py-3"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full border border-wine-200 font-sans text-sm font-medium text-brand"
        >
          {{ variante.tamanho }}
        </span>
      </div>
      <span class="font-sans text-xs text-wine-600">
        {{ variante.cor ?? 'Sem cor' }} · Qtd: {{ variante.quantidade }}
      </span>
    </div>
  </div>
  <p v-else class="font-sans text-sm text-wine-500">
    Nenhuma variação cadastrada.
  </p>
</template>

<script setup lang="ts">
interface VarianteResumo {
  id: number
  cor: string | null
  tamanho: string
  quantidade: number
}

interface Props {
  variantes: VarianteResumo[]
}

defineProps<Props>()

defineOptions({ name: 'ProdutoVariantes' })
</script>