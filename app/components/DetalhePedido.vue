<template>
  <BaseModal
    :aberto="aberto"
    titulo="Detalhes do pedido"
    :texto-confirmar="textoConfirmar"
    :texto-cancelar="'Fechar'"
    @fechar="emit('fechar')"
    @confirmar="handleConfirmar"
  >
    <div class="space-y-6">
      <p v-if="carregando" class="font-sans text-wine-700">
        Carregando pedido...
      </p>

      <template v-else-if="pedido">
        <section>
          <h3 class="mb-2 font-display text-lg font-semibold text-brand">Cliente</h3>
          <p class="font-sans text-sm text-ink">{{ pedido.nome_cliente }}</p>
          <p class="font-sans text-sm text-wine-700">{{ formatarTelefone(pedido.telefone_cliente) }}</p>
          <p v-if="pedido.observacoes" class="mt-1 font-sans text-sm text-wine-600">
            Observações: {{ pedido.observacoes }}
          </p>
        </section>

        <section>
          <h3 class="mb-2 font-display text-lg font-semibold text-brand">Pedido</h3>
          <div class="grid grid-cols-2 gap-2 font-sans text-sm">
            <span class="text-wine-600">Número:</span>
            <span class="text-ink font-medium">#{{ pedido.id }}</span>
            <span class="text-wine-600">Data:</span>
            <span class="text-ink font-medium">{{ formatarData(pedido.created_at) }}</span>
            <span class="text-wine-600">Status:</span>
            <span class="text-ink font-medium">{{ statusLabel(pedido.status) }}</span>
          </div>
        </section>

        <section>
          <h3 class="mb-2 font-display text-lg font-semibold text-brand">Itens</h3>
          <ul class="divide-y divide-wine-100 rounded-luxe border border-wine-100">
            <li
              v-for="item in pedido.itens"
              :key="item.id"
              class="flex items-start gap-3 px-3 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-sans text-sm font-medium text-ink">{{ item.nome_produto }}</p>
                <p class="font-sans text-xs text-wine-600">
                  {{ detalheVariante(item) }}
                </p>
                <p v-if="item.sku" class="font-sans text-xs text-wine-400">
                  SKU: {{ item.sku }}
                </p>
              </div>
              <div class="text-right font-sans text-sm">
                <p class="text-ink">{{ item.quantidade }}x</p>
                <p class="font-semibold text-brand">{{ formatarMoeda(item.subtotal) }}</p>
              </div>
            </li>
          </ul>
        </section>

        <section class="space-y-1 rounded-luxe bg-wine-50 p-4 font-sans text-sm">
          <div class="flex justify-between text-wine-600">
            <span>Subtotal</span>
            <span>{{ formatarMoeda(pedido.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-wine-600">
            <span>Frete</span>
            <span>{{ formatarMoeda(pedido.frete) }}</span>
          </div>
          <div class="flex justify-between border-t border-wine-200 pt-2 font-semibold text-brand">
            <span>Total</span>
            <span>{{ formatarMoeda(pedido.total) }}</span>
          </div>
        </section>
      </template>

      <p v-else class="font-sans text-wine-700">
        Não foi possível carregar o pedido.
      </p>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from '~/components/BaseModal.vue'
import { STATUS_PEDIDO_LABEL, formatarData, formatarMoeda, formatarTelefone, transicaoValida } from '~/utils/pedidoAdmin'
import type { AdminPedidoDetalhe, AdminPedidoItem, StatusPedido } from '~/types/pedido-admin'

const props = defineProps<{
  aberto: boolean
  pedido: AdminPedidoDetalhe | null
  carregando: boolean
}>()

const emit = defineEmits<{
  fechar: []
  finalizar: [pedido: AdminPedidoDetalhe]
  cancelar: [pedido: AdminPedidoDetalhe]
}>()

function statusLabel(status: StatusPedido): string {
  return STATUS_PEDIDO_LABEL[status]
}

function detalheVariante(item: AdminPedidoItem): string {
  return [item.cor, item.tamanho].filter(Boolean).join(' · ')
}

const textoConfirmar = computed(() => {
  const status = props.pedido?.status

  if (!status) {
    return 'Fechar'
  }

  if (transicaoValida(status, 'finalizado')) {
    return 'Finalizar venda'
  }

  return 'Fechar'
})

function handleConfirmar() {
  const pedido = props.pedido
  const status = pedido?.status

  if (status && transicaoValida(status, 'finalizado')) {
    emit('finalizar', pedido)
  } else {
    emit('fechar')
  }
}

defineOptions({ name: 'DetalhePedido' })
</script>