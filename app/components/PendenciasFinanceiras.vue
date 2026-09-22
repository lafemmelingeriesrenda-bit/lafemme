<template>
  <section id="relatorios-pendencias" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <div class="mb-4">
      <h2 class="font-display text-lg font-semibold text-brand">Pagamentos pendentes</h2>
      <p class="font-sans text-xs text-wine-500">
        Compras e despesas com pagamento pendente no período. Apenas um resumo — não é contas a pagar.
      </p>
    </div>

    <p v-if="pendencias.length === 0" class="font-sans text-sm text-wine-600">
      Nenhum pagamento pendente no período.
    </p>

    <template v-else>
      <div class="mb-4 flex flex-wrap gap-2 font-sans text-xs">
        <span class="rounded-full bg-red-100 px-2.5 py-1 text-red-800">{{ resumo.vencida }} vencidas</span>
        <span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">{{ resumo.hoje }} vencem hoje</span>
        <span class="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">{{ resumo.a_vencer }} a vencer</span>
        <span class="rounded-full bg-ink/10 px-2.5 py-1 text-ink">{{ resumo.sem_vencimento }} sem vencimento</span>
      </div>

      <div id="relatorios-pendencias-cards" class="grid gap-3 md:hidden">
        <article
          v-for="pendencia in pendencias"
          :key="pendencia.id"
          class="rounded-luxe border border-wine-100 p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <button
              type="button"
              class="min-w-0 text-left font-sans text-sm font-medium text-brand hover:underline"
              @click="abrirCompra"
            >
              {{ descricaoPendencia(pendencia) }}
            </button>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="badge(pendencia.vencimento)">
              {{ label(pendencia.vencimento) }}
            </span>
          </div>
          <p class="mt-1 font-sans text-xs text-wine-600">{{ nomeFornecedor(pendencia.fornecedor_nome) }}</p>
          <div class="mt-2 flex items-center justify-between font-sans text-sm">
            <span class="text-wine-600">{{ formatarDataCompra(pendencia.vencimento) }}</span>
            <span class="font-semibold text-brand">{{ formatarMoeda(pendencia.total) }}</span>
          </div>
        </article>
      </div>

      <div class="hidden overflow-x-auto md:block">
        <table id="relatorios-pendencias" class="w-full text-left font-sans text-sm">
          <thead class="border-b border-wine-100 text-xs uppercase tracking-wide text-wine-600">
            <tr>
              <th class="px-4 py-2 font-semibold">Vencimento</th>
              <th class="px-4 py-2 font-semibold">Descrição</th>
              <th class="px-4 py-2 font-semibold">Fornecedor</th>
              <th class="px-4 py-2 font-semibold">Valor</th>
              <th class="px-4 py-2 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pendencia in pendencias"
              :key="pendencia.id"
              class="border-b border-wine-100 last:border-0"
            >
              <td class="px-4 py-2 text-wine-700">{{ formatarDataCompra(pendencia.vencimento) }}</td>
              <td class="px-4 py-2">
                <button
                  type="button"
                  class="text-left font-medium text-brand hover:underline"
                  @click="abrirCompra"
                >
                  {{ descricaoPendencia(pendencia) }}
                </button>
              </td>
              <td class="px-4 py-2 text-wine-700">{{ nomeFornecedor(pendencia.fornecedor_nome) }}</td>
              <td class="px-4 py-2 font-semibold text-brand">{{ formatarMoeda(pendencia.total) }}</td>
              <td class="px-4 py-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badge(pendencia.vencimento)">
                  {{ label(pendencia.vencimento) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { CATEGORIA_DESPESA_LABEL, ehCategoriaDespesa, formatarDataCompra } from '~/utils/compraAdmin'
import {
  CLASSIFICACAO_VENCIMENTO_LABEL,
  classificarVencimento,
  nomeFornecedor
} from '~/utils/relatorioFinanceiro'
import type { ClassificacaoVencimento, PendenciaFinanceira } from '~/types/relatorio-financeiro'

interface Props {
  pendencias: PendenciaFinanceira[]
}

const props = defineProps<Props>()

const resumo = computed(() => {
  const contagem: Record<ClassificacaoVencimento, number> = {
    vencida: 0,
    hoje: 0,
    a_vencer: 0,
    sem_vencimento: 0
  }

  for (const pendencia of props.pendencias) {
    contagem[classificarVencimento(pendencia.vencimento)] += 1
  }

  return contagem
})

function label(vencimento: string | null): string {
  return CLASSIFICACAO_VENCIMENTO_LABEL[classificarVencimento(vencimento)]
}

function badge(vencimento: string | null): string {
  const classes: Record<ClassificacaoVencimento, string> = {
    vencida: 'bg-red-100 text-red-800',
    hoje: 'bg-amber-100 text-amber-800',
    a_vencer: 'bg-sky-100 text-sky-800',
    sem_vencimento: 'bg-ink/10 text-ink'
  }

  return classes[classificarVencimento(vencimento)]
}

function descricaoPendencia(pendencia: PendenciaFinanceira): string {
  if (pendencia.tipo === 'despesa') {
    const categoria = ehCategoriaDespesa(pendencia.categoria)
      ? CATEGORIA_DESPESA_LABEL[pendencia.categoria]
      : null

    if (categoria && pendencia.descricao) {
      return `${categoria} · ${pendencia.descricao}`
    }

    return pendencia.descricao || categoria || 'Despesa'
  }

  return pendencia.descricao || 'Compra de mercadoria'
}

function abrirCompra() {
  navigateTo('/compras')
}

defineOptions({ name: 'PendenciasFinanceiras' })
</script>
