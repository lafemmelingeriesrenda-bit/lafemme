<template>
  <section id="relatorios-comparacao" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <h2 class="font-display text-lg font-semibold text-brand">Receita x gastos registrados</h2>
    <p class="mb-4 font-sans text-xs text-wine-500">
      Comparação mensal de entradas (vendas) e saídas (compras e despesas).
    </p>

    <p v-if="serie.length === 0" class="font-sans text-sm text-wine-600">
      Nenhum lançamento no período.
    </p>

    <template v-else>
      <div class="mb-3 flex flex-wrap gap-3 font-sans text-xs text-wine-700">
        <span class="flex items-center gap-1.5"><span class="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> Receita</span>
        <span class="flex items-center gap-1.5"><span class="inline-block h-3 w-3 rounded-sm bg-sky-500" /> Mercadorias</span>
        <span class="flex items-center gap-1.5"><span class="inline-block h-3 w-3 rounded-sm bg-amber-500" /> Despesas</span>
      </div>

      <div class="overflow-x-auto">
        <div class="flex min-w-full items-end gap-3">
          <div
            v-for="item in serie"
            :key="item.mes"
            class="flex min-w-[4.5rem] flex-1 flex-col items-center gap-1"
          >
            <div class="flex h-32 w-full items-end justify-center gap-1">
              <div class="w-1/4 rounded-t bg-emerald-500" :style="{ height: `${altura(item.receita)}%`, minHeight: item.receita > 0 ? '2px' : '0' }" :title="`Receita: ${formatarMoeda(item.receita)}`" />
              <div class="w-1/4 rounded-t bg-sky-500" :style="{ height: `${altura(item.mercadorias)}%`, minHeight: item.mercadorias > 0 ? '2px' : '0' }" :title="`Mercadorias: ${formatarMoeda(item.mercadorias)}`" />
              <div class="w-1/4 rounded-t bg-amber-500" :style="{ height: `${altura(item.despesas)}%`, minHeight: item.despesas > 0 ? '2px' : '0' }" :title="`Despesas: ${formatarMoeda(item.despesas)}`" />
            </div>
            <span class="font-sans text-[10px] text-wine-500">{{ formatarMesLabel(item.mes) }}</span>
          </div>
        </div>
      </div>

      <p class="mt-4 rounded-luxe border border-amber-200 bg-amber-50 px-4 py-3 font-sans text-xs text-amber-800">
        Esta comparação não representa lucro, pois ainda não considera o Custo da Mercadoria Vendida (CMV).
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { formatarMesLabel } from '~/utils/relatorioFinanceiro'
import type { ComparacaoMensalReceitaGastos } from '~/types/relatorio-financeiro'

interface Props {
  serie: ComparacaoMensalReceitaGastos[]
}

const props = defineProps<Props>()

const maximo = computed(() =>
  Math.max(
    ...props.serie.flatMap((item) => [item.receita, item.mercadorias, item.despesas]),
    0
  )
)

function altura(valor: number): number {
  if (maximo.value <= 0) {
    return 0
  }

  return Math.round((valor / maximo.value) * 100)
}

defineOptions({ name: 'ComparacaoReceitaGastos' })
</script>
