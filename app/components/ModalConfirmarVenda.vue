<template>
  <BaseModal
    :aberto="aberto"
    titulo="Confirmar venda"
    texto-cancelar="Voltar"
    texto-confirmar="Confirmar venda"
    :confirmar-carregando="carregando"
    @fechar="emit('fechar')"
    @confirmar="emit('confirmar')"
  >
    <div class="space-y-4">
      <p v-if="carregando" class="font-sans text-wine-700">
        Finalizando venda...
      </p>

      <template v-else-if="pedido">
        <p class="font-sans text-sm text-ink">
          Confirma a venda do
          <strong>pedido #{{ pedido.id }}</strong>?
        </p>
        <p class="font-sans text-sm text-wine-600">
          O estoque será baixado e o pedido marcado como
          <strong>Finalizado</strong>. Essa ação não poderá ser desfeita.
        </p>

        <div class="space-y-1 rounded-luxe bg-wine-50 p-4 font-sans text-sm">
          <div v-if="pedido.itens.length > 0" class="flex justify-between text-wine-600">
            <span>Número de itens</span>
            <span>{{ pedido.itens.length }}</span>
          </div>
          <div
            class="flex justify-between font-semibold text-brand"
            :class="pedido.itens.length > 0 ? 'border-t border-wine-200 pt-2' : ''"
          >
            <span>Total</span>
            <span>{{ formatarMoeda(pedido.total) }}</span>
          </div>
        </div>
      </template>

      <p v-else class="font-sans text-wine-700">
        Não foi possível carregar o pedido.
      </p>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from '~/components/BaseModal.vue'
import { formatarMoeda } from '~/utils/pedidoAdmin'
import type { AdminPedidoDetalhe } from '~/types/pedido-admin'

defineProps<{
  aberto: boolean
  pedido: AdminPedidoDetalhe | null
  carregando: boolean
}>()

const emit = defineEmits<{
  fechar: []
  confirmar: []
}>()

defineOptions({ name: 'ModalConfirmarVenda' })
</script>