<template>
  <BaseModal
    :aberto="aberto"
    :titulo="titulo"
    :texto-confirmar="confirmarLabel"
    :confirmar-carregando="carregando"
    @fechar="emit('fechar')"
  >
    <p class="font-sans text-base text-wine-800">
      {{ mensagem }}
    </p>

    <template #footer>
      <BaseButton
        id="modal-status-compra-cancelar"
        label="Voltar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-status-compra-confirmar"
        :label="confirmarLabel"
        variant="primary"
        size="md"
        full-width
        :loading="carregando"
        @click="emit('confirmar')"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'
import BaseModal from '~/components/BaseModal.vue'
import type { CompraAdmin } from '~/types/compra-admin'

export type AcaoStatusCompra = 'receber' | 'cancelar'

interface Props {
  aberto: boolean
  compra: CompraAdmin | null
  acao: AcaoStatusCompra
  carregando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  carregando: false
})

const emit = defineEmits<{
  fechar: []
  confirmar: []
}>()

const titulo = computed(() => (props.acao === 'receber' ? 'Marcar como recebida' : 'Cancelar compra'))
const confirmarLabel = computed(() => (props.acao === 'receber' ? 'Marcar como recebida' : 'Cancelar compra'))

const mensagem = computed(() => {
  const id = props.compra?.id ? `#${props.compra.id}` : 'selecionada'

  return props.acao === 'receber'
    ? `Confirma que a compra ${id} foi recebida? O status será atualizado para recebida.`
    : `Confirma o cancelamento da compra ${id}? O registro é preservado como histórico e não pode ser reaberto nesta versão.`
})

defineOptions({ name: 'ModalConfirmarStatusCompra' })
</script>
