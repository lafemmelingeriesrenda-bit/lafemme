<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Compras" class="mb-6">
      <template #acoes>
        <BaseButton
          id="compras-nova"
          label="Nova compra"
          variant="primary"
          size="md"
          @click="abrirNova"
        />
      </template>
    </AdminHeader>

    <section id="compras-kpis" class="mb-6">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <article
          v-for="kpi in kpis"
          :key="kpi.id"
          class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft"
        >
          <p class="font-sans text-xs uppercase tracking-wide text-wine-500">{{ kpi.label }}</p>
          <p class="mt-1 font-display text-lg font-semibold text-brand">{{ formatarMoeda(kpi.valor) }}</p>
        </article>
      </div>
      <p class="mt-2 font-sans text-xs text-wine-500">Compras canceladas não entram nos totais.</p>
    </section>

    <form
      id="compras-filtros"
      class="mb-6 grid grid-cols-1 gap-3 rounded-luxe border border-wine-100 bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
      @submit.prevent="aplicarFiltros"
    >
      <BaseInput id="compras-filtro-busca" label="Buscar" placeholder="Descrição, categoria ou fornecedor" v-model="filtros.busca" />
      <BaseInput id="compras-filtro-inicio" label="De" type="date" v-model="filtros.dataInicio" />
      <BaseInput id="compras-filtro-fim" label="Até" type="date" v-model="filtros.dataFim" />

      <div class="flex flex-col gap-1.5">
        <label for="compras-filtro-fornecedor" class="font-sans text-sm font-medium text-wine-800">Fornecedor</label>
        <select id="compras-filtro-fornecedor" v-model="filtros.fornecedorId" class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200">
          <option value="">Todos</option>
          <option v-for="fornecedor in fornecedores" :key="fornecedor.id" :value="fornecedor.id">{{ fornecedor.nome }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="compras-filtro-tipo" class="font-sans text-sm font-medium text-wine-800">Tipo</label>
        <select id="compras-filtro-tipo" v-model="filtros.tipo" class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200" @change="aoTrocarFiltroTipo">
          <option value="">Todos</option>
          <option value="mercadoria">Mercadoria</option>
          <option value="despesa">Despesa</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="compras-filtro-categoria" class="font-sans text-sm font-medium text-wine-800">Categoria</label>
        <select id="compras-filtro-categoria" v-model="filtros.categoria" :disabled="filtroCategoriaDesabilitado" class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 disabled:bg-wine-50 disabled:text-wine-500">
          <option value="">Todas</option>
          <option v-for="categoria in CATEGORIAS_DESPESA" :key="categoria" :value="categoria">{{ CATEGORIA_DESPESA_LABEL[categoria] }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="compras-filtro-status" class="font-sans text-sm font-medium text-wine-800">Status</label>
        <select id="compras-filtro-status" v-model="filtros.status" class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200">
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="recebida">Recebida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="compras-filtro-pagamento" class="font-sans text-sm font-medium text-wine-800">Pagamento</label>
        <select id="compras-filtro-pagamento" v-model="filtros.statusPagamento" class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200">
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <BaseButton id="compras-filtrar" label="Filtrar" variant="primary" size="md" type="submit" :loading="carregando" />
        <BaseButton id="compras-limpar" label="Limpar filtros" variant="ghost" size="md" :disabled="carregando" @click="limparFiltros" />
      </div>
    </form>

    <p v-if="carregandoDetalhe" class="mb-3 font-sans text-sm text-wine-600">Carregando compra...</p>

    <TabelaCompras
      :compras="compras"
      :loading="carregando"
      :erro="erro"
      @novo="abrirNova"
      @ver="(compra) => abrirDetalhe(compra, 'ver')"
      @editar="(compra) => abrirDetalhe(compra, 'editar')"
      @receber="(compra) => abrirStatus(compra, 'receber')"
      @cancelar="(compra) => abrirStatus(compra, 'cancelar')"
    />

    <ModalCompra
      :aberto="modalAberto"
      :modo="modoModal"
      :salvando="salvando"
      :compra-inicial="compraEdicao"
      @fechar="modalAberto = false"
      @salvo="handleSalvo"
      @vincular-item="abrirVincular"
      @desvincular-item="desvincular"
      @cadastrar-produto-item="abrirCadastrar"
    />

    <ModalConfirmarStatusCompra
      :aberto="statusModalAberto"
      :compra="compraStatus"
      :acao="statusAcao"
      :carregando="alterandoStatus"
      @fechar="statusModalAberto = false"
      @confirmar="confirmarStatus"
    />

    <ModalVincularProdutoItem
      :aberto="vincularAberto"
      :carregando="vinculando"
      @fechar="vincularAberto = false"
      @confirmar="confirmarVincular"
    />

    <ModalCadastrarProdutoItem
      :aberto="cadastrarAberto"
      :item="itemSelecionado"
      :salvando="cadastrando"
      @fechar="cadastrarAberto = false"
      @salvo="confirmarCadastrar"
    />
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import AdminHeader from '~/components/AdminHeader.vue'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import ModalCadastrarProdutoItem from '~/components/ModalCadastrarProdutoItem.vue'
import ModalCompra from '~/components/ModalCompra.vue'
import type { ModoModalCompra } from '~/components/ModalCompra.vue'
import ModalConfirmarStatusCompra from '~/components/ModalConfirmarStatusCompra.vue'
import type { AcaoStatusCompra } from '~/components/ModalConfirmarStatusCompra.vue'
import ModalVincularProdutoItem from '~/components/ModalVincularProdutoItem.vue'
import TabelaCompras from '~/components/TabelaCompras.vue'
import { useComprasAdmin } from '~/composables/useComprasAdmin'
import { useFornecedoresAdmin } from '~/composables/useFornecedoresAdmin'
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { calcularKpis, CATEGORIA_DESPESA_LABEL, CATEGORIAS_DESPESA } from '~/utils/compraAdmin'
import type { AdminFornecedor } from '~/types/fornecedor-admin'
import type {
  CompraAdmin,
  CompraAtualizarPayload,
  CompraDetalhadaAdmin,
  ItemCompraAdmin,
  ProdutoRascunhoItemPayload,
  StatusCompra
} from '~/types/compra-admin'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

const {
  listarCompras,
  obterCompra,
  criarCompra,
  atualizarCompra,
  alterarStatusCompra,
  vincularItemCompra,
  desvincularItemCompra,
  criarProdutoRascunhoItemCompra
} = useComprasAdmin()
const { listarFornecedores } = useFornecedoresAdmin()

const compras = ref<CompraAdmin[]>([])
const carregando = ref(false)
const erro = ref<string | null>(null)

const fornecedores = ref<AdminFornecedor[]>([])

const filtros = reactive({
  busca: '',
  dataInicio: '',
  dataFim: '',
  fornecedorId: '' as string | number,
  tipo: '',
  categoria: '',
  status: '',
  statusPagamento: ''
})

const modalAberto = ref(false)
const modoModal = ref<ModoModalCompra>('criar')
const compraEdicao = ref<CompraDetalhadaAdmin | null>(null)
const salvando = ref(false)
const carregandoDetalhe = ref(false)

const statusModalAberto = ref(false)
const statusAcao = ref<AcaoStatusCompra>('receber')
const compraStatus = ref<CompraAdmin | null>(null)
const alterandoStatus = ref(false)

const itemSelecionado = ref<ItemCompraAdmin | null>(null)
const vincularAberto = ref(false)
const vinculando = ref(false)
const cadastrarAberto = ref(false)
const cadastrando = ref(false)

const kpis = computed(() => {
  const valores = calcularKpis(compras.value)

  return [
    { id: 'total', label: 'Total', valor: valores.total },
    { id: 'mercadorias', label: 'Mercadorias', valor: valores.mercadorias },
    { id: 'despesas', label: 'Despesas', valor: valores.despesas },
    { id: 'pago', label: 'Pago', valor: valores.pago },
    { id: 'pendente', label: 'Pendente', valor: valores.pendente }
  ]
})

async function carregarCompras() {
  carregando.value = true
  erro.value = null

  try {
    compras.value = await listarCompras({
      busca: filtros.busca.trim() || null,
      dataInicio: filtros.dataInicio || null,
      dataFim: filtros.dataFim || null,
      fornecedorId: filtros.fornecedorId === '' ? null : Number(filtros.fornecedorId),
      tipo: (filtros.tipo || null) as CompraAdmin['tipo'] | null,
      categoria: filtros.categoria || null,
      status: (filtros.status || null) as StatusCompra | null,
      statusPagamento: (filtros.statusPagamento || null) as CompraAdmin['status_pagamento'] | null
    })
  } catch (err) {
    erro.value = err instanceof Error ? err.message : 'Não foi possível carregar as compras.'
  } finally {
    carregando.value = false
  }
}

const filtroCategoriaDesabilitado = computed(() => filtros.tipo === 'mercadoria')

function aoTrocarFiltroTipo() {
  if (filtros.tipo === 'mercadoria') {
    filtros.categoria = ''
  }
}

function aplicarFiltros() {
  carregarCompras()
}

function limparFiltros() {
  filtros.busca = ''
  filtros.dataInicio = ''
  filtros.dataFim = ''
  filtros.fornecedorId = ''
  filtros.tipo = ''
  filtros.categoria = ''
  filtros.status = ''
  filtros.statusPagamento = ''
  carregarCompras()
}

function abrirNova() {
  compraEdicao.value = null
  modoModal.value = 'criar'
  modalAberto.value = true
}

async function abrirDetalhe(compra: CompraAdmin, modo: ModoModalCompra) {
  if (carregandoDetalhe.value) {
    return
  }

  carregandoDetalhe.value = true

  try {
    compraEdicao.value = await obterCompra(compra.id)
    modoModal.value = modo
    modalAberto.value = true
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível carregar a compra.')
  } finally {
    carregandoDetalhe.value = false
  }
}

async function handleSalvo(payload: CompraAtualizarPayload) {
  if (salvando.value) {
    return
  }

  salvando.value = true

  try {
    if (modoModal.value === 'criar') {
      if (!payload.tipo) {
        toast.error('Selecione o tipo da compra.')
        return
      }

      await criarCompra({ ...payload, tipo: payload.tipo })
      toast.success('Compra cadastrada com sucesso.')
    } else if (compraEdicao.value) {
      await atualizarCompra(compraEdicao.value.id, payload)
      toast.success('Compra atualizada com sucesso.')
    }

    modalAberto.value = false
    await carregarCompras()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a compra.')
  } finally {
    salvando.value = false
  }
}

function abrirStatus(compra: CompraAdmin, acao: AcaoStatusCompra) {
  compraStatus.value = compra
  statusAcao.value = acao
  statusModalAberto.value = true
}

async function confirmarStatus() {
  const compra = compraStatus.value

  if (!compra || alterandoStatus.value) {
    return
  }

  alterandoStatus.value = true

  try {
    const destino: StatusCompra = statusAcao.value === 'receber' ? 'recebida' : 'cancelada'
    await alterarStatusCompra(compra.id, destino)
    toast.success(destino === 'recebida' ? 'Compra marcada como recebida.' : 'Compra cancelada.')
    statusModalAberto.value = false
    await carregarCompras()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o status.')
  } finally {
    alterandoStatus.value = false
  }
}

async function recarregarDetalhe() {
  if (compraEdicao.value) {
    try {
      compraEdicao.value = await obterCompra(compraEdicao.value.id)
    } catch {
      // mantém o detalhe atual em caso de falha de recarga
    }
  }

  await carregarCompras()
}

function abrirVincular(item: ItemCompraAdmin) {
  itemSelecionado.value = item
  vincularAberto.value = true
}

async function confirmarVincular(varianteId: number) {
  const item = itemSelecionado.value

  if (!item || vinculando.value) {
    return
  }

  vinculando.value = true

  try {
    await vincularItemCompra(item.id, varianteId)
    toast.success('Item vinculado ao produto.')
    vincularAberto.value = false
    await recarregarDetalhe()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível vincular o item.')
  } finally {
    vinculando.value = false
  }
}

function abrirCadastrar(item: ItemCompraAdmin) {
  itemSelecionado.value = item
  cadastrarAberto.value = true
}

async function confirmarCadastrar(payload: ProdutoRascunhoItemPayload) {
  const item = itemSelecionado.value

  if (!item || cadastrando.value) {
    return
  }

  cadastrando.value = true

  try {
    await criarProdutoRascunhoItemCompra(item.id, payload)
    toast.success('Produto em rascunho criado e vinculado ao item.')
    cadastrarAberto.value = false
    await recarregarDetalhe()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível criar o produto.')
  } finally {
    cadastrando.value = false
  }
}

async function desvincular(item: ItemCompraAdmin) {
  try {
    await desvincularItemCompra(item.id)
    toast.success('Item desvinculado.')
    await recarregarDetalhe()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Não foi possível desvincular o item.')
  }
}

onMounted(async () => {
  await carregarCompras()

  try {
    fornecedores.value = await listarFornecedores()
  } catch {
    fornecedores.value = []
  }
})

defineOptions({ name: 'ComprasPage' })
</script>
