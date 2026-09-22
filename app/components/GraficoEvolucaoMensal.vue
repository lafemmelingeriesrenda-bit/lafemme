<template>
  <section id="relatorios-evolucao" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <h2 class="font-display text-lg font-semibold text-brand">Evolução mensal</h2>
    <p class="mb-4 font-sans text-xs text-wine-500">Total de compras e despesas por mês.</p>

    <p v-if="serie.length === 0" class="font-sans text-sm text-wine-600">
      Nenhum lançamento no período.
    </p>

    <div v-else class="overflow-x-auto">
      <div class="flex min-w-full items-end gap-2 sm:gap-3">
        <div
          v-for="item in serie"
          :key="item.mes"
          class="flex min-w-[3rem] flex-1 flex-col items-center gap-1"
        >
          <span class="whitespace-nowrap font-sans text-[10px] text-wine-600">
            {{ formatarMoedaCompacta(item.total) }}
          </span>
          <div class="flex h-32 w-full items-end">
            <div
              class="w-full rounded-t bg-brand transition-all"
              :style="{ height: `${altura(item.total)}%`, minHeight: item.total > 0 ? '2px' : '0' }"
              :title="`${formatarMesLabel(item.mes)}: ${formatarMoeda(item.total)}`"
            />
          </div>
          <span class="font-sans text-[10px] text-wine-500">{{ formatarMesLabel(item.mes) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { formatarMesLabel, formatarMoedaCompacta } from '~/utils/relatorioFinanceiro'
import type { EvolucaoMensalFinanceira } from '~/types/relatorio-financeiro'

interface Props {
  serie: EvolucaoMensalFinanceira[]
}

const props = defineProps<Props>()

const maximo = computed(() => Math.max(...props.serie.map((item) => item.total), 0))

function altura(valor: number): number {
  if (maximo.value <= 0) {
    return 0
  }

  return Math.round((valor / maximo.value) * 100)
}

defineOptions({ name: 'GraficoEvolucaoMensal' })
</script>
