<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Fornecedores" class="mb-6">
      <template #acoes>
        <BaseButton
          id="fornecedores-novo"
          label="Novo fornecedor"
          variant="primary"
          size="md"
          @click="abrirNovo"
        />
      </template>
    </AdminHeader>

    <TabelaFornecedores
      ref="tabelaFornecedoresRef"
      @novo="abrirNovo"
      @editar="abrirEdicao"
      @alterar-status="abrirStatus"
    />

    <ModalFornecedor
      :aberto="modalAberto"
      :salvando="salvando"
      :fornecedor-inicial="fornecedorEdicao"
      @fechar="modalAberto = false"
      @salvo="handleSalvo"
    />

    <ModalConfirmarStatusFornecedor
      :aberto="statusModalAberto"
      :fornecedor="fornecedorStatus"
      :carregando="alterandoStatus"
      @fechar="statusModalAberto = false"
      @confirmar="confirmarStatus"
    />
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import AdminHeader from '~/components/AdminHeader.vue'
import BaseButton from '~/components/BaseButton.vue'
import ModalConfirmarStatusFornecedor from '~/components/ModalConfirmarStatusFornecedor.vue'
import ModalFornecedor from '~/components/ModalFornecedor.vue'
import type { FornecedorFormPayload } from '~/components/ModalFornecedor.vue'
import TabelaFornecedores from '~/components/TabelaFornecedores.vue'
import { useFornecedoresAdmin } from '~/composables/useFornecedoresAdmin'
import type { AdminFornecedor } from '~/types/fornecedor-admin'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

const { criarFornecedor, atualizarFornecedor, alterarStatusFornecedor } = useFornecedoresAdmin()

const tabelaFornecedoresRef = ref<InstanceType<typeof TabelaFornecedores> | null>(null)

const modalAberto = ref(false)
const salvando = ref(false)
const fornecedorEdicao = ref<AdminFornecedor | null>(null)

const statusModalAberto = ref(false)
const alterandoStatus = ref(false)
const fornecedorStatus = ref<AdminFornecedor | null>(null)

function abrirNovo() {
  fornecedorEdicao.value = null
  modalAberto.value = true
}

function abrirEdicao(fornecedor: AdminFornecedor) {
  fornecedorEdicao.value = fornecedor
  modalAberto.value = true
}

async function handleSalvo(payload: FornecedorFormPayload) {
  if (salvando.value) {
    return
  }

  salvando.value = true

  try {
    if (fornecedorEdicao.value) {
      await atualizarFornecedor(fornecedorEdicao.value.id, payload)
      toast.success('Fornecedor atualizado com sucesso.')
    } else {
      await criarFornecedor({
        nome: payload.nome,
        cnpj: payload.cnpj,
        telefone: payload.telefone,
        email: payload.email,
        contato: payload.contato,
        observacao: payload.observacao
      })
      toast.success('Fornecedor cadastrado com sucesso.')
    }

    modalAberto.value = false
    await tabelaFornecedoresRef.value?.refresh()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o fornecedor.')
  } finally {
    salvando.value = false
  }
}

function abrirStatus(fornecedor: AdminFornecedor) {
  fornecedorStatus.value = fornecedor
  statusModalAberto.value = true
}

async function confirmarStatus() {
  const fornecedor = fornecedorStatus.value

  if (!fornecedor || alterandoStatus.value) {
    return
  }

  alterandoStatus.value = true

  try {
    await alterarStatusFornecedor(fornecedor.id, !fornecedor.ativo)
    toast.success(fornecedor.ativo ? 'Fornecedor desativado.' : 'Fornecedor ativado.')
    statusModalAberto.value = false
    await tabelaFornecedoresRef.value?.refresh()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o status.')
  } finally {
    alterandoStatus.value = false
  }
}

defineOptions({ name: 'FornecedoresPage' })
</script>
