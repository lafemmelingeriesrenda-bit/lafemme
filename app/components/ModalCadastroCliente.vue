<template>
  <BaseModal
    :aberto="aberto"
    titulo="Cadastrar cliente"
    @fechar="emit('fechar')"
  >
    <form id="modal-cliente-form" class="flex flex-col gap-4" @submit.prevent>
      <BaseInput
        id="modal-cliente-nome"
        v-model="form.nome"
        label="Nome"
        placeholder="Nome"
        required
      />
      <BaseInput
        id="modal-cliente-sobrenome"
        v-model="form.sobrenome"
        label="Sobrenome"
        placeholder="Sobrenome"
      />
      <BaseInput
        id="modal-cliente-telefone"
        v-model="form.telefone"
        label="Telefone"
        placeholder="(00) 00000-0000"
      />
      <BaseInput
        id="modal-cliente-nascimento"
        v-model="form.dataNascimento"
        label="Data de nascimento"
        type="date"
      />
    </form>

    <template #footer>
      <BaseButton
        id="modal-cliente-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-cliente-salvar"
        label="Salvar"
        variant="primary"
        size="md"
        full-width
        @click="handleSalvar"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseModal from '~/components/BaseModal.vue'

export interface ClienteFormPayload {
  nome: string
  sobrenome: string
  telefone: string
  dataNascimento: string
}

interface Props {
  aberto: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  fechar: []
  salvo: [payload: ClienteFormPayload]
}>()

const form = reactive({
  nome: '',
  sobrenome: '',
  telefone: '',
  dataNascimento: ''
})

function handleSalvar() {
  if (!form.nome.trim()) {
    toast.error('Informe o nome do cliente.')
    return
  }
  if (!form.telefone.trim()) {
    toast.error('Informe o telefone do cliente.')
    return
  }

  emit('salvo', {
    nome: form.nome.trim(),
    sobrenome: form.sobrenome.trim(),
    telefone: form.telefone.trim(),
    dataNascimento: form.dataNascimento
  })
}

defineOptions({ name: 'ModalCadastroCliente' })
</script>