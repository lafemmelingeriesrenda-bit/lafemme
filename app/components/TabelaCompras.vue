<template>
  <div class="w-full">
    <p v-if="loading" class="font-sans text-lg text-wine-700">Carregando compras...</p>

    <p v-else-if="erro" class="font-sans text-lg text-wine-700">{{ erro }}</p>

    <div
      v-else-if="compras.length === 0"
      class="flex flex-col items-center gap-4 rounded-luxe border border-wine-100 bg-white px-6 py-10 text-center shadow-soft"
    >
      <p class="font-sans text-lg text-wine-700">Nenhuma compra cadastrada.</p>
      <BaseButton
        id="tabela-compras-vazio-novo"
        label="Registrar primeira compra"
        variant="primary"
        size="md"
        @click="emit('novo')"
      />
    </div>

    <template v-else>
      <div id="tabela-compras-cards" class="grid gap-4 md:hidden">
        <article
          v-for="compra in compras"
          :key="compra.id"
          class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-display text-base font-semibold text-brand">
                {{ formatarDataCompra(compra.data_compra) }}
              </p>
              <p class="truncate font-sans text-sm text-wine-700">
                {{ compra.fornecedor_nome || 'Sem fornecedor' }}
              </p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeStatus(compra.status)">
              {{ STATUS_COMPRA_LABEL[compra.status] }}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeTipo(compra.tipo)">
              {{ TIPO_COMPRA_LABEL[compra.tipo] }}
            </span>
            <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgePagamento(compra.status_pagamento)">
              {{ STATUS_PAGAMENTO_COMPRA_LABEL[compra.status_pagamento] }}
            </span>
          </div>

          <p class="mt-2 font-sans text-sm text-ink">{{ resumoCompra(compra) }}</p>

          <div class="mt-2 flex items-center justify-between">
            <span class="font-sans text-sm text-wine-600">{{ compra.quantidade_itens }} itens</span>
            <span class="font-sans text-base font-semibold text-brand">{{ formatarMoeda(compra.total) }}</span>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <BaseButton :id="`tabela-compras-card-${compra.id}-ver`" label="Ver" variant="outline" size="sm" @click="emit('ver', compra)" />
            <BaseButton
              v-if="podeEditar(compra)"
              :id="`tabela-compras-card-${compra.id}-editar`"
              label="Editar"
              variant="ghost"
              size="sm"
              @click="emit('editar', compra)"
            />
            <BaseButton
              v-if="compra.status === 'pendente' && compra.tipo === 'mercadoria'"
              :id="`tabela-compras-card-${compra.id}-receber`"
              label="Receber"
              variant="primary"
              size="sm"
              @click="emit('receber', compra)"
            />
            <BaseButton
              v-if="compra.status === 'pendente'"
              :id="`tabela-compras-card-${compra.id}-cancelar`"
              label="Cancelar"
              variant="ghost"
              size="sm"
              @click="emit('cancelar', compra)"
            />
          </div>
        </article>
      </div>

      <div class="hidden overflow-x-auto rounded-luxe border border-wine-100 bg-white shadow-soft md:block">
        <table id="tabela-compras" class="w-full text-left font-sans text-sm">
          <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wider text-wine-600">
            <tr>
              <th class="px-6 py-3 font-semibold">Data</th>
              <th class="px-6 py-3 font-semibold">Fornecedor</th>
              <th class="px-6 py-3 font-semibold">Tipo</th>
              <th class="px-6 py-3 font-semibold">Descrição / resumo</th>
              <th class="px-6 py-3 font-semibold">Total</th>
              <th class="px-6 py-3 font-semibold">Pagamento</th>
              <th class="px-6 py-3 font-semibold">Status</th>
              <th class="px-6 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="compra in compras"
              :key="compra.id"
              class="border-b border-wine-100 last:border-0 hover:bg-wine-50/50"
            >
              <td class="px-6 py-3 text-wine-700">{{ formatarDataCompra(compra.data_compra) }}</td>
              <td class="px-6 py-3 font-medium text-ink">{{ compra.fornecedor_nome || '—' }}</td>
              <td class="px-6 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeTipo(compra.tipo)">
                  {{ TIPO_COMPRA_LABEL[compra.tipo] }}
                </span>
              </td>
              <td class="px-6 py-3 text-wine-700">{{ resumoCompra(compra) }}</td>
              <td class="px-6 py-3 font-semibold text-brand">{{ formatarMoeda(compra.total) }}</td>
              <td class="px-6 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgePagamento(compra.status_pagamento)">
                  {{ STATUS_PAGAMENTO_COMPRA_LABEL[compra.status_pagamento] }}
                </span>
              </td>
              <td class="px-6 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeStatus(compra.status)">
                  {{ STATUS_COMPRA_LABEL[compra.status] }}
                </span>
              </td>
              <td class="px-6 py-3">
                <div class="flex flex-wrap gap-2">
                  <BaseButton :id="`tabela-compras-${compra.id}-ver`" label="Ver" variant="outline" size="sm" @click="emit('ver', compra)" />
                  <BaseButton
                    v-if="podeEditar(compra)"
                    :id="`tabela-compras-${compra.id}-editar`"
                    label="Editar"
                    variant="ghost"
                    size="sm"
                    @click="emit('editar', compra)"
                  />
                  <BaseButton
                    v-if="compra.status === 'pendente' && compra.tipo === 'mercadoria'"
                    :id="`tabela-compras-${compra.id}-receber`"
                    label="Receber"
                    variant="primary"
                    size="sm"
                    @click="emit('receber', compra)"
                  />
                  <BaseButton
                    v-if="compra.status === 'pendente'"
                    :id="`tabela-compras-${compra.id}-cancelar`"
                    label="Cancelar"
                    variant="ghost"
                    size="sm"
                    @click="emit('cancelar', compra)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'
import { formatarMoeda } from '~/utils/pedidoAdmin'
import {
  formatarDataCompra,
  resumoCompra,
  STATUS_COMPRA_LABEL,
  STATUS_PAGAMENTO_COMPRA_LABEL,
  TIPO_COMPRA_LABEL
} from '~/utils/compraAdmin'
import type { CompraAdmin, StatusCompra, StatusPagamentoCompra, TipoCompra } from '~/types/compra-admin'

interface Props {
  compras: CompraAdmin[]
  loading: boolean
  erro: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  novo: []
  ver: [compra: CompraAdmin]
  editar: [compra: CompraAdmin]
  receber: [compra: CompraAdmin]
  cancelar: [compra: CompraAdmin]
}>()

function podeEditar(compra: CompraAdmin): boolean {
  return compra.status === 'pendente' || compra.status === 'recebida'
}

function badgeTipo(tipo: TipoCompra): string {
  return tipo === 'mercadoria' ? 'bg-sky-100 text-sky-800' : 'bg-wine-100 text-wine-800'
}

function badgePagamento(status: StatusPagamentoCompra): string {
  return status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
}

function badgeStatus(status: StatusCompra): string {
  const classes: Record<StatusCompra, string> = {
    pendente: 'bg-wine-100 text-wine-800',
    recebida: 'bg-emerald-100 text-emerald-800',
    cancelada: 'bg-ink/10 text-ink'
  }

  return classes[status]
}

defineOptions({ name: 'TabelaCompras' })
</script>
