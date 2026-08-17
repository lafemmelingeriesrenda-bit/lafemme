<template>
  <main class="flex flex-1 flex-col px-6 py-10">
    <header
      id="clientes-header"
      class="mb-6 flex items-center justify-between gap-4 border-b border-wine-100 pb-4"
    >
      <h1 class="font-display text-3xl font-semibold text-brand">Clientes</h1>
      <BaseButton
        id="clientes-novo"
        label="Novo cliente"
        variant="primary"
        size="md"
        @click="modalCadastroAberto = true"
      />
    </header>

    <TabelaClientes ref="tabelaClientesRef" />

    <ModalCadastroCliente
      :aberto="modalCadastroAberto"
      @fechar="modalCadastroAberto = false"
      @salvo="handleClienteSalvo"
    />
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import ModalCadastroCliente from '~/components/ModalCadastroCliente.vue'
import type { ClienteFormPayload } from '~/components/ModalCadastroCliente.vue'
import TabelaClientes from '~/components/TabelaClientes.vue'
import { useSalvarCliente } from '~/composables/useSalvarCliente'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

const modalCadastroAberto = ref(false)
const tabelaClientesRef = ref<InstanceType<typeof TabelaClientes> | null>(null)

async function handleClienteSalvo(payload: ClienteFormPayload) {
  try {
    const { salvarClienteAdmin } = useSalvarCliente()

    await salvarClienteAdmin({
      nome: payload.nome,
      sobrenome: payload.sobrenome || null,
      telefone: payload.telefone,
      dataNascimento: payload.dataNascimento || null
    })

    toast.success('Cliente cadastrado com sucesso.')
    modalCadastroAberto.value = false
    await tabelaClientesRef.value?.refresh()
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao cadastrar o cliente.'
    toast.error(mensagem)
  }
}

defineOptions({ name: 'ClientesPage' })
</script>