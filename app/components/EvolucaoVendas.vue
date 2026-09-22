<template>
  <section id="relatorios-evolucao-vendas" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <h2 class="font-display text-lg font-semibold text-brand">Evolução das vendas</h2>
    <p class="mb-4 font-sans text-xs text-wine-500">Receita, pedidos finalizados e ticket médio por mês.</p>

    <p v-if="serie.length === 0" class="font-sans text-sm text-wine-600">
      Nenhuma venda finalizada no período.
    </p>

    <ul v-else class="flex flex-col gap-4">
      <li v-for="item in serie" :key="item.mes" class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-3 font-sans text-sm">
          <span class="text-ink">{{ formatarMesLabel(item.mes) }}</span>
          <span class="whitespace-nowrap font-medium text-brand">{{ formatarMoeda(item.receita) }}</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-wine-100">
          <div
            class="h-2 rounded-full bg-emerald-500"
            :style="{ width: `${altura(item.receita)}%` }"
          />
        </div>
        <p class="font-sans text-xs text-wine-500">
          {{ item.quantidade_pedidos }} {{ item.quantidade_pedidos === 1 ? 'pedido' : 'pedidos' }} ·
          ticket {{ formatarMoeda(item.ticket_medio) }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { formatarMesLabel } from '~/utils/relatorioFinanceiro'
import type { EvolucaoVendaMensal } from '~/types/relatorio-financeiro'

interface Props {
  serie: EvolucaoVendaMensal[]
}

const props = defineProps<Props>()

const maximo = computed(() => Math.max(...props.serie.map((item) => item.receita), 0))

function altura(valor: number): number {
  if (maximo.value <= 0) {
    return 0
  }

  return Math.round((valor / maximo.value) * 100)
}

defineOptions({ name: 'EvolucaoVendas' })
</script>
