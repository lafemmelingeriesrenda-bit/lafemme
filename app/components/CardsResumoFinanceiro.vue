<template>
  <section id="relatorios-resumo" class="grid grid-cols-2 gap-3 lg:grid-cols-5">
    <article
      v-for="card in cards"
      :key="card.id"
      class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft"
    >
      <p class="font-sans text-xs uppercase tracking-wide text-wine-500">{{ card.label }}</p>
      <p class="mt-1 font-display text-lg font-semibold text-brand">{{ formatarMoeda(card.valor) }}</p>
      <p v-if="card.detalhe" class="mt-1 font-sans text-xs text-wine-500">{{ card.detalhe }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import type { ResumoFinanceiro } from '~/types/relatorio-financeiro'

interface Props {
  resumo: ResumoFinanceiro
}

const props = defineProps<Props>()

const cards = computed(() => [
  {
    id: 'total',
    label: 'Total',
    valor: props.resumo.total,
    detalhe: `${props.resumo.quantidade_compras} ${props.resumo.quantidade_compras === 1 ? 'lançamento' : 'lançamentos'}`
  },
  { id: 'mercadorias', label: 'Mercadorias', valor: props.resumo.mercadorias, detalhe: '' },
  { id: 'despesas', label: 'Despesas', valor: props.resumo.despesas, detalhe: '' },
  { id: 'pago', label: 'Pago', valor: props.resumo.pago, detalhe: '' },
  { id: 'pendente', label: 'Pendente', valor: props.resumo.pendente, detalhe: '' }
])

defineOptions({ name: 'CardsResumoFinanceiro' })
</script>
