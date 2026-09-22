<template>
  <section id="relatorios-resumo-vendas" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <article class="rounded-luxe border border-emerald-200 bg-emerald-50/60 p-4 shadow-soft">
      <p class="font-sans text-xs uppercase tracking-wide text-emerald-700">Receita de vendas</p>
      <p class="mt-1 font-display text-lg font-semibold text-brand">{{ formatarMoeda(resumo.receita) }}</p>
      <p class="mt-1 font-sans text-xs text-emerald-700">
        {{ resumo.quantidade_pedidos }} {{ resumo.quantidade_pedidos === 1 ? 'pedido finalizado' : 'pedidos finalizados' }}
      </p>
    </article>

    <article class="rounded-luxe border border-emerald-200 bg-emerald-50/60 p-4 shadow-soft">
      <p class="font-sans text-xs uppercase tracking-wide text-emerald-700">Pedidos finalizados</p>
      <p class="mt-1 font-display text-lg font-semibold text-brand">{{ resumo.quantidade_pedidos }}</p>
      <p class="mt-1 font-sans text-xs text-emerald-700">No período selecionado</p>
    </article>

    <article class="rounded-luxe border border-emerald-200 bg-emerald-50/60 p-4 shadow-soft">
      <p class="font-sans text-xs uppercase tracking-wide text-emerald-700">Ticket médio</p>
      <p class="mt-1 font-display text-lg font-semibold text-brand">{{ formatarMoeda(resumo.ticket_medio) }}</p>
      <p class="mt-1 font-sans text-xs text-emerald-700">Receita média por pedido finalizado</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import type { ResumoVendas } from '~/types/relatorio-financeiro'

interface Props {
  resumo: ResumoVendas
}

defineProps<Props>()

defineOptions({ name: 'CardsResumoVendas' })
</script>
