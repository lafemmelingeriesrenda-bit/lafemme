<template>
  <section id="relatorios-categorias" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <h2 class="font-display text-lg font-semibold text-brand">Despesas por categoria</h2>
    <p class="mb-4 font-sans text-xs text-wine-500">Somente despesas operacionais no período.</p>

    <p v-if="itens.length === 0" class="font-sans text-sm text-wine-600">
      Nenhuma despesa no período.
    </p>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="item in itens" :key="item.categoria" class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-3 font-sans text-sm">
          <span class="text-ink">{{ categoriaLabel(item.categoria) }}</span>
          <span class="whitespace-nowrap text-wine-600">
            {{ formatarMoeda(item.total) }} · {{ item.percentual.toFixed(1) }}%
          </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-wine-100">
          <div
            class="h-2 rounded-full bg-brand"
            :style="{ width: `${Math.min(100, Math.max(0, item.percentual))}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { CATEGORIA_DESPESA_LABEL, ehCategoriaDespesa } from '~/utils/compraAdmin'
import type { DespesaCategoriaResumo } from '~/types/relatorio-financeiro'

interface Props {
  itens: DespesaCategoriaResumo[]
}

defineProps<Props>()

function categoriaLabel(categoria: string): string {
  return ehCategoriaDespesa(categoria) ? CATEGORIA_DESPESA_LABEL[categoria] : categoria
}

defineOptions({ name: 'DespesasPorCategoria' })
</script>
