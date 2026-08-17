<template>
  <div id="app-layout" class="flex min-h-screen flex-col bg-cream">
    <AppHeader @abrir-cadastro="modalCadastroAberto = true" @abrir-sacola="sacolaAberta = true" />
    <main id="app-layout-main" class="flex-1">
      <slot />
    </main>
    <AppFooter />

    <ModalCadastroCliente
      :aberto="modalCadastroAberto"
      @fechar="modalCadastroAberto = false"
      @salvo="handleClienteSalvo"
    />

    <CarrinhoDrawer :aberto="sacolaAberta" @fechar="sacolaAberta = false" />
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import AppFooter from '~/components/AppFooter.vue'
import AppHeader from '~/components/AppHeader.vue'
import CarrinhoDrawer from '~/components/CarrinhoDrawer.vue'
import ModalCadastroCliente from '~/components/ModalCadastroCliente.vue'
import type { ClienteFormPayload } from '~/components/ModalCadastroCliente.vue'
import { useSalvarCliente } from '~/composables/useSalvarCliente'

const modalCadastroAberto = ref(false)
const sacolaAberta = ref(false)

async function handleClienteSalvo(payload: ClienteFormPayload) {
  try {
    const { salvarClientePublico } = useSalvarCliente()

    await salvarClientePublico({
      nome: payload.nome,
      sobrenome: payload.sobrenome || null,
      telefone: payload.telefone,
      dataNascimento: payload.dataNascimento || null
    })

    toast.success('Cliente cadastrado com sucesso.')
    modalCadastroAberto.value = false
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao cadastrar o cliente.'
    toast.error(mensagem)
  }
}

defineOptions({ name: 'DefaultLayout' })
</script>