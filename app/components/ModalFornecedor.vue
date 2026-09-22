<template>
  <BaseModal
    :aberto="aberto"
    :titulo="isEdicao ? 'Editar fornecedor' : 'Novo fornecedor'"
    :confirmar-carregando="salvando"
    @fechar="emit('fechar')"
  >
    <form id="modal-fornecedor-form" class="flex flex-col gap-4" @submit.prevent="handleSalvar">
      <BaseInput
        id="modal-fornecedor-nome"
        v-model="form.nome"
        label="Nome *"
        placeholder="Nome do fornecedor"
        required
      />
      <BaseInput
        id="modal-fornecedor-cnpj"
        v-model="cnpjMascarado"
        label="CNPJ"
        placeholder="00.000.000/0000-00"
      />
      <BaseInput
        id="modal-fornecedor-telefone"
        v-model="form.telefone"
        label="Telefone"
        placeholder="(00) 00000-0000"
      />
      <BaseInput
        id="modal-fornecedor-email"
        v-model="form.email"
        label="E-mail"
        type="email"
        placeholder="contato@fornecedor.com"
      />
      <BaseInput
        id="modal-fornecedor-contato"
        v-model="form.contato"
        label="Pessoa de contato"
        placeholder="Nome do contato"
      />

      <div class="flex flex-col gap-1.5">
        <label for="modal-fornecedor-observacao" class="font-sans text-sm font-medium text-wine-800">
          Observação
        </label>
        <textarea
          id="modal-fornecedor-observacao"
          v-model="form.observacao"
          rows="3"
          placeholder="Observações sobre o fornecedor"
          class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
        />
      </div>

      <label
        v-if="isEdicao"
        class="flex items-center gap-2 font-sans text-sm text-wine-800"
      >
        <input v-model="form.ativo" type="checkbox" class="h-4 w-4 accent-brand" />
        Fornecedor ativo
      </label>
    </form>

    <template #footer>
      <BaseButton
        id="modal-fornecedor-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-fornecedor-salvar"
        label="Salvar"
        variant="primary"
        size="md"
        full-width
        :loading="salvando"
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
import { mascaraCnpj, validarFornecedorPayload } from '~/utils/fornecedorAdmin'
import type { AdminFornecedor } from '~/types/fornecedor-admin'

export interface FornecedorFormPayload {
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  observacao: string | null
  ativo: boolean
}

interface Props {
  aberto: boolean
  salvando?: boolean
  fornecedorInicial?: AdminFornecedor | null
}

const props = withDefaults(defineProps<Props>(), {
  salvando: false,
  fornecedorInicial: null
})

const emit = defineEmits<{
  fechar: []
  salvo: [payload: FornecedorFormPayload]
}>()

const form = reactive({
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  contato: '',
  observacao: '',
  ativo: true
})

const isEdicao = computed(() => props.fornecedorInicial !== null)

const cnpjMascarado = computed({
  get: () => form.cnpj,
  set: (valor: string) => {
    form.cnpj = mascaraCnpj(valor)
  }
})

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto) {
      return
    }

    const inicial = props.fornecedorInicial

    form.nome = inicial?.nome ?? ''
    form.cnpj = inicial?.cnpj ? mascaraCnpj(inicial.cnpj) : ''
    form.telefone = inicial?.telefone ?? ''
    form.email = inicial?.email ?? ''
    form.contato = inicial?.contato ?? ''
    form.observacao = inicial?.observacao ?? ''
    form.ativo = inicial?.ativo ?? true
  }
)

function handleSalvar() {
  if (props.salvando) {
    return
  }

  const validado = validarFornecedorPayload(form)

  if (!validado.ok) {
    toast.error(validado.erro)
    return
  }

  emit('salvo', {
    ...validado.payload,
    ativo: form.ativo
  })
}

defineOptions({ name: 'ModalFornecedor' })
</script>
