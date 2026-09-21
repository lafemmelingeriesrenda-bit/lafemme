<template>
  <div class="w-full">
    <p v-if="loading" class="font-sans text-lg text-wine-700">
      Carregando pedidos...
    </p>

    <p v-else-if="erro" class="font-sans text-lg text-wine-700">
      {{ erro }}
    </p>

    <p v-else-if="pedidos.length === 0" class="font-sans text-lg text-wine-700">
      Nenhum pedido encontrado.
    </p>

    <template v-else>
      <div
        id="tabela-pedidos-cards"
        class="grid gap-4 md:hidden"
      >
        <article
          v-for="pedido in pedidos"
          :key="pedido.id"
          class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft"
        >
          <button
            :id="`tabela-pedidos-card-${pedido.id}`"
            type="button"
            class="w-full text-left"
            @click="emit('selecionar', pedido)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-display text-base font-semibold text-brand">
                Pedido #{{ pedido.id }}
              </span>
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeClasse(pedido.status)">
                {{ statusLabel(pedido.status) }}
              </span>
            </div>

            <p class="mt-2 truncate font-sans text-sm font-medium text-ink">
              {{ pedido.nome_cliente }}
            </p>
            <p class="font-sans text-sm text-wine-700">
              {{ telefoneTexto(pedido.telefone_cliente) }}
            </p>

            <div class="mt-3 flex items-center justify-between font-sans text-sm text-wine-600">
              <span>{{ dataTexto(pedido.created_at) }}</span>
              <span class="font-semibold text-brand">{{ formatarMoeda(pedido.total) }}</span>
            </div>
          </button>

          <div class="mt-3 flex gap-2">
            <BaseButton
              :id="`tabela-pedidos-card-${pedido.id}-finalizar`"
              v-if="pedido.status === 'aguardando_atendimento'"
              label="Finalizar"
              variant="primary"
              size="sm"
              @click="emit('finalizar', pedido)"
            />
            <BaseButton
              :id="`tabela-pedidos-card-${pedido.id}-cancelar`"
              v-if="podeCancelar(pedido.status)"
              label="Cancelar"
              variant="outline"
              size="sm"
              @click="emit('cancelar', pedido)"
            />
          </div>
        </article>
      </div>

      <div class="hidden overflow-x-auto rounded-luxe border border-wine-100 bg-white shadow-soft md:block">
        <table id="tabela-pedidos" class="w-full text-left font-sans text-sm">
          <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wider text-wine-600">
            <tr>
              <th class="px-6 py-3 font-semibold">Número</th>
              <th class="px-6 py-3 font-semibold">Cliente</th>
              <th class="px-6 py-3 font-semibold">Telefone</th>
              <th class="px-6 py-3 font-semibold">Data</th>
              <th class="px-6 py-3 font-semibold">Itens</th>
              <th class="px-6 py-3 font-semibold">Total</th>
              <th class="px-6 py-3 font-semibold">Status</th>
              <th class="px-6 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pedido in pedidos"
              :key="pedido.id"
              class="border-b border-wine-100 last:border-0 hover:bg-wine-50/50"
            >
              <td class="px-6 py-3">
                <button
                  :id="`tabela-pedidos-${pedido.id}-detalhe`"
                  type="button"
                  class="font-semibold text-brand transition hover:underline"
                  @click="emit('selecionar', pedido)"
                >
                  #{{ pedido.id }}
                </button>
              </td>
              <td class="px-6 py-3 font-medium text-ink">{{ pedido.nome_cliente }}</td>
              <td class="px-6 py-3 text-wine-700">{{ telefoneTexto(pedido.telefone_cliente) }}</td>
              <td class="px-6 py-3 text-wine-500">{{ dataTexto(pedido.created_at) }}</td>
              <td class="px-6 py-3 text-wine-700">{{ pedido.quantidade_itens }}</td>
              <td class="px-6 py-3 font-semibold text-brand">{{ formatarMoeda(pedido.total) }}</td>
              <td class="px-6 py-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeClasse(pedido.status)">
                  {{ statusLabel(pedido.status) }}
                </span>
              </td>
              <td class="px-6 py-3">
                <div class="flex flex-wrap gap-2">
                  <BaseButton
                    :id="`tabela-pedidos-${pedido.id}-finalizar`"
                    v-if="pedido.status === 'aguardando_atendimento'"
                    label="Finalizar"
                    variant="primary"
                    size="sm"
                    @click="emit('finalizar', pedido)"
                  />
                  <BaseButton
                    :id="`tabela-pedidos-${pedido.id}-cancelar`"
                    v-if="podeCancelar(pedido.status)"
                    label="Cancelar"
                    variant="outline"
                    size="sm"
                    @click="emit('cancelar', pedido)"
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
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { STATUS_PEDIDO_LABEL } from '~/utils/pedidoAdmin'
import type { AdminPedidoLista, StatusPedido } from '~/types/pedido-admin'
import BaseButton from '~/components/BaseButton.vue'

interface Props {
  pedidos: AdminPedidoLista[]
  loading: boolean
  erro: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  selecionar: [pedido: AdminPedidoLista]
  finalizar: [pedido: AdminPedidoLista]
  cancelar: [pedido: AdminPedidoLista]
}>()

function statusLabel(status: StatusPedido): string {
  return STATUS_PEDIDO_LABEL[status]
}

function badgeClasse(status: StatusPedido): string {
  const classes: Record<StatusPedido, string> = {
    aguardando_atendimento: 'bg-wine-100 text-wine-800',
    aguardando_pagamento: 'bg-amber-100 text-amber-800',
    pago: 'bg-emerald-100 text-emerald-800',
    enviado: 'bg-sky-100 text-sky-800',
    entregue: 'bg-emerald-100 text-emerald-800',
    cancelado: 'bg-ink/10 text-ink',
    finalizado: 'bg-emerald-100 text-emerald-800'
  }

  return classes[status]
}

function podeCancelar(status: StatusPedido): boolean {
  return status === 'aguardando_atendimento'
}

function telefoneTexto(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '')
  return digitos.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
}

function dataTexto(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

defineOptions({ name: 'TabelaPedidos' })
</script>