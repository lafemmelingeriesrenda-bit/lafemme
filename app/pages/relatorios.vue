<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Relatórios" class="mb-2" />

    <p class="mb-6 font-sans text-sm text-wine-600">
      Visão de vendas, compras e despesas. Não representa lucro, margem ou CMV.
    </p>

    <FiltroPeriodoRelatorio
      class="mb-6"
      :preset="preset"
      :data-inicio="dataInicio"
      :data-fim="dataFim"
      :carregando="carregando"
      @aplicar="aplicarPeriodo"
    />

    <p v-if="carregando && !relatorio" class="font-sans text-lg text-wine-700">
      Carregando relatório...
    </p>

    <div
      v-else-if="erro"
      class="flex flex-col items-start gap-3 rounded-luxe border border-wine-100 bg-white p-6 shadow-soft"
    >
      <p class="font-sans text-base text-wine-800">{{ erro }}</p>
      <BaseButton
        id="relatorios-tentar-novamente"
        label="Tentar novamente"
        variant="outline"
        size="md"
        @click="carregar"
      />
    </div>

    <p
      v-else-if="semDados"
      class="rounded-luxe border border-wine-100 bg-white p-6 font-sans text-lg text-wine-700 shadow-soft"
    >
      Nenhum lançamento financeiro encontrado neste período.
    </p>

    <template v-else-if="relatorio">
      <h2 class="mb-3 font-display text-xl font-semibold text-brand">Vendas</h2>
      <CardsResumoVendas :resumo="relatorio.vendas.resumo" class="mb-6" />

      <EvolucaoVendas :serie="serieVendasCompleta" class="mb-6" />

      <ComparacaoReceitaGastos :serie="comparacaoMensal" class="mb-6" />

      <h2 class="mb-3 font-display text-xl font-semibold text-brand">Gastos registrados</h2>
      <CardsResumoFinanceiro :resumo="relatorio.resumo" class="mb-6" />

      <GraficoEvolucaoMensal :serie="serieCompleta" class="mb-6" />

      <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DespesasPorCategoria :itens="relatorio.despesas_por_categoria" />
        <ComprasPorFornecedor :itens="relatorio.compras_por_fornecedor" />
      </div>

      <PendenciasFinanceiras :pendencias="relatorio.pendencias" />
    </template>
  </main>
</template>

<script setup lang="ts">
import AdminHeader from '~/components/AdminHeader.vue'
import BaseButton from '~/components/BaseButton.vue'
import CardsResumoFinanceiro from '~/components/CardsResumoFinanceiro.vue'
import CardsResumoVendas from '~/components/CardsResumoVendas.vue'
import ComparacaoReceitaGastos from '~/components/ComparacaoReceitaGastos.vue'
import ComprasPorFornecedor from '~/components/ComprasPorFornecedor.vue'
import DespesasPorCategoria from '~/components/DespesasPorCategoria.vue'
import EvolucaoVendas from '~/components/EvolucaoVendas.vue'
import FiltroPeriodoRelatorio from '~/components/FiltroPeriodoRelatorio.vue'
import GraficoEvolucaoMensal from '~/components/GraficoEvolucaoMensal.vue'
import PendenciasFinanceiras from '~/components/PendenciasFinanceiras.vue'
import { useRelatorioFinanceiro } from '~/composables/useRelatorioFinanceiro'
import {
  combinarEvolucaoMensal,
  completarMeses,
  completarMesesVendas,
  resolverPeriodo
} from '~/utils/relatorioFinanceiro'
import type { PresetPeriodo, RelatorioFinanceiroCompleto } from '~/types/relatorio-financeiro'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

const { obterRelatorio } = useRelatorioFinanceiro()

const periodoInicial = resolverPeriodo('mes-atual')

const preset = ref<PresetPeriodo>('mes-atual')
const dataInicio = ref(periodoInicial?.dataInicio ?? '')
const dataFim = ref(periodoInicial?.dataFim ?? '')

const relatorio = ref<RelatorioFinanceiroCompleto | null>(null)
const carregando = ref(false)
const erro = ref<string | null>(null)

const semDados = computed(
  () =>
    relatorio.value !== null &&
    relatorio.value.resumo.quantidade_compras === 0 &&
    relatorio.value.vendas.resumo.quantidade_pedidos === 0
)

const serieVendasCompleta = computed(() => {
  if (!relatorio.value) {
    return []
  }

  return completarMesesVendas(relatorio.value.vendas.evolucao_mensal, dataInicio.value, dataFim.value)
})

const serieCompleta = computed(() => {
  if (!relatorio.value) {
    return []
  }

  return completarMeses(relatorio.value.evolucao_mensal, dataInicio.value, dataFim.value)
})

const comparacaoMensal = computed(() => {
  if (!relatorio.value) {
    return []
  }

  return combinarEvolucaoMensal(
    relatorio.value.vendas.evolucao_mensal,
    relatorio.value.evolucao_mensal,
    dataInicio.value,
    dataFim.value
  )
})

async function carregar() {
  if (carregando.value) {
    return
  }

  carregando.value = true
  erro.value = null

  try {
    relatorio.value = await obterRelatorio({
      dataInicio: dataInicio.value || null,
      dataFim: dataFim.value || null
    })
  } catch (err) {
    erro.value = err instanceof Error ? err.message : 'Não foi possível carregar o relatório.'
  } finally {
    carregando.value = false
  }
}

function aplicarPeriodo(payload: { preset: PresetPeriodo; dataInicio: string; dataFim: string }) {
  preset.value = payload.preset
  dataInicio.value = payload.dataInicio
  dataFim.value = payload.dataFim
  carregar()
}

onMounted(carregar)

defineOptions({ name: 'RelatoriosPage' })
</script>
