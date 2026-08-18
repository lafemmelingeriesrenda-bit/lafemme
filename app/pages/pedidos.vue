<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Pedidos" class="mb-6">
      <template #acoes>
        <BaseButton
          id="pedidos-novo"
          label="Novo pedido"
          variant="outline"
          size="md"
          @click="abrirCriacao"
        />
      </template>
    </AdminHeader>

    <form
      id="pedidos-filtros"
      class="mb-6 grid grid-cols-1 gap-3 rounded-luxe border border-wine-100 bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
      @submit.prevent="aplicarFiltros"
    >
      <BaseInput
        id="pedidos-filtro-busca"
        label="Buscar"
        placeholder="Número, nome ou telefone"
        v-model="busca"
      />
      <div class="flex flex-col gap-1.5">
        <label for="pedidos-filtro-status" class="font-sans text-sm font-medium text-wine-800">
          Status
        </label>
        <select
          id="pedidos-filtro-status"
          v-model="statusFiltro"
          class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200"
        >
          <option value="">Todos</option>
          <option v-for="(label, status) in STATUS_OPERACIONAIS" :key="status" :value="status">
            {{ label }}
          </option>
        </select>
      </div>
      <BaseInput
        id="pedidos-filtro-inicio"
        label="De"
        type="date"
        v-model="dataInicio"
      />
      <BaseInput
        id="pedidos-filtro-fim"
        label="Até"
        type="date"
        v-model="dataFim"
      />

      <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <BaseButton
          id="pedidos-filtrar"
          label="Filtrar"
          variant="primary"
          size="md"
          type="submit"
          :loading="carregando"
        />
        <BaseButton
          id="pedidos-limpar-filtros"
          label="Limpar"
          variant="ghost"
          size="md"
          :disabled="carregando"
          @click="limparFiltros"
        />
      </div>
    </form>

    <TabelaPedidos
      :pedidos="pedidos"
      :loading="carregando"
      :erro="erro"
      @selecionar="abrirDetalhe"
      @atender="iniciarAtendimento"
      @finalizar="confirmarFinalizacao"
      @cancelar="cancelarPedido"
    />

    <DetalhePedido
      :aberto="detalheAberto"
      :pedido="pedidoDetalhe"
      :carregando="carregandoDetalhe"
      @fechar="detalheAberto = false"
      @atender="iniciarAtendimento"
      @finalizar="confirmarFinalizacao"
      @cancelar="cancelarPedido"
    />

    <ModalConfirmarVenda
      :aberto="modalConfirmacaoAberto"
      :pedido="pedidoDetalhe"
      :carregando="finalizando"
      @fechar="modalConfirmacaoAberto = false"
      @confirmar="finalizarVenda"
    />
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import AdminHeader from '~/components/AdminHeader.vue'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import DetalhePedido from '~/components/DetalhePedido.vue'
import ModalConfirmarVenda from '~/components/ModalConfirmarVenda.vue'
import TabelaPedidos from '~/components/TabelaPedidos.vue'
import { usePedidosAdmin } from '~/composables/usePedidosAdmin'
import { STATUS_PEDIDO_LABEL, validarFiltrosPedidos } from '~/utils/pedidoAdmin'
import type {
  AdminPedidoDetalhe,
  AdminPedidoLista,
  FiltrosPedidosAdmin,
  StatusPedidoOperacional
} from '~/types/pedido-admin'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

const STATUS_OPERACIONAIS: Record<StatusPedidoOperacional, string> = {
  aguardando_atendimento: STATUS_PEDIDO_LABEL.aguardando_atendimento,
  em_atendimento: STATUS_PEDIDO_LABEL.em_atendimento,
  finalizado: STATUS_PEDIDO_LABEL.finalizado,
  cancelado: STATUS_PEDIDO_LABEL.cancelado
}

const { listarPedidos, obterPedido, atualizarStatus } = usePedidosAdmin()

const pedidos = ref<AdminPedidoLista[]>([])
const carregando = ref(false)
const erro = ref<string | null>(null)

const busca = ref('')
const statusFiltro = ref<StatusPedidoOperacional | ''>('')
const dataInicio = ref('')
const dataFim = ref('')

const detalheAberto = ref(false)
const pedidoDetalhe = ref<AdminPedidoDetalhe | null>(null)
const carregandoDetalhe = ref(false)

const modalConfirmacaoAberto = ref(false)
const finalizando = ref(false)

function construirFiltrosAplicaveis(): FiltrosPedidosAdmin {
  return {
    status: statusFiltro.value === '' ? null : statusFiltro.value,
    busca: busca.value.trim() ? busca.value.trim() : null,
    dataInicio: dataInicio.value || null,
    dataFim: dataFim.value || null
  }
}

async function carregarPedidos() {
  carregando.value = true
  erro.value = null

  try {
    const filtrosAplicaveis = construirFiltrosAplicaveis()
    const validacao = validarFiltrosPedidos(filtrosAplicaveis)

    if (!validacao.ok) {
      erro.value = validacao.erro
      return
    }

    pedidos.value = await listarPedidos(filtrosAplicaveis)
  } catch (err) {
    erro.value = err instanceof Error ? err.message : 'Não foi possível carregar os pedidos.'
  } finally {
    carregando.value = false
  }
}

function aplicarFiltros() {
  carregarPedidos()
}

function limparFiltros() {
  statusFiltro.value = ''
  busca.value = ''
  dataInicio.value = ''
  dataFim.value = ''
  carregarPedidos()
}

async function abrirDetalhe(pedido: AdminPedidoLista) {
  detalheAberto.value = true
  carregandoDetalhe.value = true
  pedidoDetalhe.value = null

  try {
    pedidoDetalhe.value = await obterPedido(pedido.id)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível carregar o pedido.')
    detalheAberto.value = false
  } finally {
    carregandoDetalhe.value = false
  }
}

async function iniciarAtendimento(pedido: AdminPedidoLista | AdminPedidoDetalhe) {
  await executarTransicao(pedido.id, 'em_atendimento', 'Atendimento iniciado.')
}

async function cancelarPedido(pedido: AdminPedidoLista | AdminPedidoDetalhe) {
  await executarTransicao(pedido.id, 'cancelado', 'Pedido cancelado.')
}

function confirmarFinalizacao(pedido: AdminPedidoLista | AdminPedidoDetalhe) {
  detalheAberto.value = false
  pedidoDetalhe.value = {
    ...pedido,
    itens: 'itens' in pedido ? pedido.itens : []
  }
  modalConfirmacaoAberto.value = true
}

async function finalizarVenda() {
  const pedido = pedidoDetalhe.value

  if (!pedido || finalizando.value) {
    return
  }

  finalizando.value = true

  try {
    const resultado = await atualizarStatus(pedido.id, 'finalizado')

    if (resultado.sucesso) {
      toast.success('Venda finalizada com sucesso.')
      modalConfirmacaoAberto.value = false
      pedidoDetalhe.value = null
      await carregarPedidos()
    } else {
      toast.error(mensagemFinalizacao(resultado))
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível finalizar a venda.')
  } finally {
    finalizando.value = false
  }
}

async function executarTransicao(id: number, status: 'em_atendimento' | 'cancelado', mensagemSucesso: string) {
  try {
    const resultado = await atualizarStatus(id, status)

    if (resultado.sucesso) {
      toast.success(mensagemSucesso)
      detalheAberto.value = false
      pedidoDetalhe.value = null
      await carregarPedidos()
    } else {
      toast.error(resultado.mensagem ?? 'Não foi possível concluir a ação.')
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
  }
}

function mensagemFinalizacao(resultado: { mensagem?: string; erros?: Array<{ nomeProduto: string; disponivel: number; solicitado: number }> }): string {
  const base = resultado.mensagem ?? 'Não foi possível finalizar a venda.'

  if (!resultado.erros || resultado.erros.length === 0) {
    return base
  }

  const detalhes = resultado.erros
    .map((item) => `${item.nomeProduto} (disponível: ${item.disponivel}, pedido: ${item.solicitado})`)
    .join('; ')

  return `${base} ${detalhes}`
}

function abrirCriacao() {
  navigateTo('/catalogo')
}

onMounted(carregarPedidos)

defineOptions({ name: 'PedidosPage' })
</script>