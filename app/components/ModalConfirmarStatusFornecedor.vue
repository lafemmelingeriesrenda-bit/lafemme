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
        id="modal-status-fornecedor-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-status-fornecedor-confirmar"
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
import type { AdminFornecedor } from '~/types/fornecedor-admin'

interface Props {
  aberto: boolean
  fornecedor: AdminFornecedor | null
  carregando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  carregando: false
})

const emit = defineEmits<{
  fechar: []
  confirmar: []
}>()

const desativando = computed(() => props.fornecedor?.ativo === true)

const titulo = computed(() => (desativando.value ? 'Desativar fornecedor' : 'Ativar fornecedor'))
const confirmarLabel = computed(() => (desativando.value ? 'Desativar' : 'Ativar'))

const mensagem = computed(() => {
  const nome = props.fornecedor?.nome ?? 'este fornecedor'

  return desativando.value
    ? `Tem certeza que deseja desativar ${nome}? Ele deixa de aparecer como ativo, mas o histórico é preservado.`
    : `Tem certeza que deseja ativar ${nome}?`
})

defineOptions({ name: 'ModalConfirmarStatusFornecedor' })
</script>
