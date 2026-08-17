<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Clientes" class="mb-6">
      <template #acoes>
        <BaseButton
          id="clientes-novo"
          label="Novo cliente"
          variant="primary"
          size="md"
          @click="modalCadastroAberto = true"
        />
      </template>
    </AdminHeader>

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
import AdminHeader from '~/components/AdminHeader.vue'
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