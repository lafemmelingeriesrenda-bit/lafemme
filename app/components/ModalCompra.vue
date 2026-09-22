<template>
  <BaseModal
    :aberto="aberto"
    :titulo="titulo"
    :confirmar-carregando="salvando"
    @fechar="emit('fechar')"
  >
    <div v-if="modo === 'ver' && compraInicial" class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeTipo(compraInicial.tipo)">
          {{ TIPO_COMPRA_LABEL[compraInicial.tipo] }}
        </span>
        <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgeStatus(compraInicial.status)">
          {{ STATUS_COMPRA_LABEL[compraInicial.status] }}
        </span>
        <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="badgePagamento(compraInicial.status_pagamento)">
          {{ STATUS_PAGAMENTO_COMPRA_LABEL[compraInicial.status_pagamento] }}
        </span>
      </div>

      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Data da compra</dt>
          <dd class="font-sans text-sm text-ink">{{ formatarDataCompra(compraInicial.data_compra) }}</dd>
        </div>
        <div>
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Fornecedor</dt>
          <dd class="font-sans text-sm text-ink">{{ compraInicial.fornecedor?.nome || '—' }}</dd>
        </div>
        <div v-if="compraInicial.tipo === 'despesa'">
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Categoria</dt>
          <dd class="font-sans text-sm text-ink">{{ categoriaLabel(compraInicial.categoria) }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Descrição</dt>
          <dd class="font-sans text-sm text-ink">{{ compraInicial.descricao || '—' }}</dd>
        </div>
        <div>
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Forma de pagamento</dt>
          <dd class="font-sans text-sm text-ink">{{ compraInicial.forma_pagamento || '—' }}</dd>
        </div>
        <div>
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Vencimento</dt>
          <dd class="font-sans text-sm text-ink">{{ formatarDataCompra(compraInicial.vencimento) }}</dd>
        </div>
        <div>
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Pago em</dt>
          <dd class="font-sans text-sm text-ink">{{ formatarDataHoraCompra(compraInicial.pago_em) }}</dd>
        </div>
        <div>
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Criada em</dt>
          <dd class="font-sans text-sm text-ink">{{ formatarDataHoraCompra(compraInicial.created_at) }}</dd>
        </div>
        <div v-if="compraInicial.recebida_em">
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Recebida em</dt>
          <dd class="font-sans text-sm text-ink">{{ formatarDataHoraCompra(compraInicial.recebida_em) }}</dd>
        </div>
        <div v-if="compraInicial.cancelada_em">
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Cancelada em</dt>
          <dd class="font-sans text-sm text-ink">{{ formatarDataHoraCompra(compraInicial.cancelada_em) }}</dd>
        </div>
        <div v-if="compraInicial.observacao" class="sm:col-span-2">
          <dt class="font-sans text-xs uppercase tracking-wide text-wine-500">Observação</dt>
          <dd class="font-sans text-sm text-ink">{{ compraInicial.observacao }}</dd>
        </div>
      </dl>

      <div v-if="compraInicial.tipo === 'mercadoria'" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-sans text-sm text-wine-700">{{ resumoVinculo }}</span>
          <span
            v-if="itensNaoVinculados > 0"
            class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
          >
            {{ itensNaoVinculados }} {{ itensNaoVinculados === 1 ? 'item precisa' : 'itens precisam' }} de vínculo
          </span>
        </div>

        <div class="overflow-x-auto rounded-luxe border border-wine-100">
          <table class="w-full text-left font-sans text-sm">
            <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wide text-wine-600">
              <tr>
                <th class="px-4 py-2 font-semibold">Descrição</th>
                <th class="px-4 py-2 font-semibold">Cor</th>
                <th class="px-4 py-2 font-semibold">Tam.</th>
                <th class="px-4 py-2 font-semibold">Qtd.</th>
                <th class="px-4 py-2 font-semibold">Unit.</th>
                <th class="px-4 py-2 font-semibold">Subtotal</th>
                <th class="px-4 py-2 font-semibold">Vínculo</th>
                <th class="px-4 py-2 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in compraInicial.itens" :key="item.id" class="border-b border-wine-100 last:border-0">
                <td class="px-4 py-2 text-ink">{{ item.descricao }}</td>
                <td class="px-4 py-2 text-wine-700">{{ item.cor || '—' }}</td>
                <td class="px-4 py-2 text-wine-700">{{ item.tamanho || '—' }}</td>
                <td class="px-4 py-2 text-wine-700">{{ item.quantidade }}</td>
                <td class="px-4 py-2 text-wine-700">{{ formatarMoeda(item.valor_unitario) }}</td>
                <td class="px-4 py-2 font-medium text-brand">{{ formatarMoeda(item.subtotal) }}</td>
                <td class="px-4 py-2">
                  <span
                    v-if="item.produto_variante_id"
                    class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
                  >
                    Vinculado
                  </span>
                  <span v-else class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    Produto não vinculado
                  </span>
                </td>
                <td class="px-4 py-2">
                  <div class="flex flex-wrap gap-2">
                    <template v-if="!item.produto_variante_id">
                      <BaseButton
                        :id="`modal-compra-item-${item.id}-vincular`"
                        label="Vincular"
                        variant="outline"
                        size="sm"
                        @click="emit('vincular-item', item)"
                      />
                      <BaseButton
                        :id="`modal-compra-item-${item.id}-cadastrar`"
                        label="Cadastrar"
                        variant="ghost"
                        size="sm"
                        @click="emit('cadastrar-produto-item', item)"
                      />
                    </template>
                    <BaseButton
                      v-else-if="statusAtual === 'pendente'"
                      :id="`modal-compra-item-${item.id}-desvincular`"
                      label="Desvincular"
                      variant="ghost"
                      size="sm"
                      @click="emit('desvincular-item', item)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-col gap-1 rounded-luxe bg-wine-50 px-4 py-3 font-sans text-sm">
        <div class="flex justify-between"><span class="text-wine-600">Subtotal</span><span class="text-ink">{{ formatarMoeda(compraInicial.subtotal) }}</span></div>
        <div class="flex justify-between"><span class="text-wine-600">Frete</span><span class="text-ink">{{ formatarMoeda(compraInicial.frete) }}</span></div>
        <div class="flex justify-between"><span class="text-wine-600">Desconto</span><span class="text-ink">{{ formatarMoeda(compraInicial.desconto) }}</span></div>
        <div class="flex justify-between border-t border-wine-200 pt-1 font-semibold"><span class="text-brand">Total</span><span class="text-brand">{{ formatarMoeda(compraInicial.total) }}</span></div>
      </div>
    </div>

    <form v-else id="modal-compra-form" class="flex flex-col gap-4" @submit.prevent="handleSalvar">
      <p
        v-if="statusAtual === 'recebida'"
        class="rounded-luxe border border-amber-200 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-800"
      >
        Esta compra já foi marcada como recebida. Os itens não podem mais ser alterados.
      </p>

      <div class="flex flex-col gap-1.5">
        <label for="modal-compra-tipo" class="font-sans text-sm font-medium text-wine-800">Tipo *</label>
        <select
          id="modal-compra-tipo"
          v-model="form.tipo"
          :disabled="!edicaoFisicaPermitida"
          @change="aoTrocarTipo"
          class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 disabled:bg-wine-50 disabled:text-wine-500"
        >
          <option value="despesa">Despesa</option>
          <option value="mercadoria">Mercadoria</option>
        </select>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput id="modal-compra-data" v-model="form.data_compra" label="Data da compra *" type="date" :disabled="!edicaoFisicaPermitida" />

        <div class="flex flex-col gap-1.5">
          <label for="modal-compra-fornecedor" class="font-sans text-sm font-medium text-wine-800">Fornecedor</label>
          <select
            id="modal-compra-fornecedor"
            v-model="form.fornecedor_id"
            :disabled="!edicaoFisicaPermitida"
            class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 disabled:bg-wine-50 disabled:text-wine-500"
          >
            <option value="">Sem fornecedor</option>
            <option v-for="fornecedor in fornecedoresOpcoes" :key="fornecedor.id" :value="fornecedor.id">
              {{ fornecedor.nome }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput id="modal-compra-forma" v-model="form.forma_pagamento" label="Forma de pagamento" placeholder="Pix, boleto, cartão..." />

        <div class="flex flex-col gap-1.5">
          <label for="modal-compra-pagamento" class="font-sans text-sm font-medium text-wine-800">Status de pagamento</label>
          <select
            id="modal-compra-pagamento"
            v-model="form.status_pagamento"
            class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput id="modal-compra-vencimento" v-model="form.vencimento" label="Vencimento" type="date" />
        <BaseInput
          v-if="form.status_pagamento === 'pago'"
          id="modal-compra-pago-em"
          v-model="form.pago_em"
          label="Pago em"
          type="datetime-local"
        />
      </div>

      <template v-if="form.tipo === 'despesa'">
        <div class="flex flex-col gap-1.5">
          <label for="modal-compra-categoria" class="font-sans text-sm font-medium text-wine-800">Categoria *</label>
          <select
            id="modal-compra-categoria"
            v-model="form.categoria"
            :disabled="!edicaoFisicaPermitida"
            class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 disabled:bg-wine-50 disabled:text-wine-500"
          >
            <option value="">Selecione a categoria</option>
            <option v-for="categoria in CATEGORIAS_DESPESA" :key="categoria" :value="categoria">
              {{ CATEGORIA_DESPESA_LABEL[categoria] }}
            </option>
          </select>
        </div>

        <BaseInput id="modal-compra-descricao-despesa" v-model="form.descricao" label="Descrição *" placeholder="Ex.: Marketing Meta" :disabled="!edicaoFisicaPermitida" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BaseInput id="modal-compra-valor-base" v-model="form.valor_base" label="Valor-base *" type="number" min="0" step="0.01" :disabled="!edicaoFisicaPermitida" />
          <BaseInput id="modal-compra-frete-despesa" v-model="form.frete" label="Frete" type="number" min="0" step="0.01" :disabled="!edicaoFisicaPermitida" />
          <BaseInput id="modal-compra-desconto-despesa" v-model="form.desconto" label="Desconto" type="number" min="0" step="0.01" :disabled="!edicaoFisicaPermitida" />
        </div>
      </template>

      <template v-else>
        <BaseInput id="modal-compra-descricao-mercadoria" v-model="form.descricao" label="Descrição (opcional)" placeholder="Observação geral da compra" :disabled="!edicaoFisicaPermitida" />

        <div class="flex flex-col gap-3">
          <div
            v-for="(item, index) in form.itens"
            :key="item.uiId"
            class="flex flex-col gap-3 rounded-luxe border border-wine-100 bg-wine-50/50 p-4"
          >
            <div class="flex items-center justify-between">
              <span class="font-sans text-sm font-medium text-brand">Item {{ index + 1 }}</span>
              <button
                v-if="edicaoFisicaPermitida && form.itens.length > 1"
                type="button"
                class="rounded-luxe p-1.5 text-wine-700 transition hover:bg-wine-200/60 hover:text-brand"
                :aria-label="`Remover item ${index + 1}`"
                @click="removerItem(index)"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <div class="flex flex-col gap-1.5">
              <label :for="`modal-compra-item-${index}-variante`" class="font-sans text-sm font-medium text-wine-800">
                Produto / variante (opcional)
              </label>
              <select
                :id="`modal-compra-item-${index}-variante`"
                :value="item.produto_variante_id ?? ''"
                :disabled="!edicaoFisicaPermitida"
                class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 disabled:bg-wine-50 disabled:text-wine-500"
                @change="selecionarVariante(index, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">Sem vínculo</option>
                <option v-for="opcao in variantesOpcoes" :key="opcao.id" :value="opcao.id">{{ opcao.label }}</option>
              </select>
            </div>

            <BaseInput :id="`modal-compra-item-${index}-descricao`" v-model="item.descricao" label="Descrição *" placeholder="Ex.: Vestido renda" :disabled="!edicaoFisicaPermitida" />

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BaseInput :id="`modal-compra-item-${index}-cor`" v-model="item.cor" label="Cor" placeholder="Ex.: Preto" :disabled="!edicaoFisicaPermitida" />
              <BaseInput :id="`modal-compra-item-${index}-tamanho`" v-model="item.tamanho" label="Tamanho" placeholder="Ex.: M" :disabled="!edicaoFisicaPermitida" />
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <BaseInput :id="`modal-compra-item-${index}-quantidade`" v-model="item.quantidade" label="Quantidade *" type="number" min="1" step="1" :disabled="!edicaoFisicaPermitida" />
              <BaseInput :id="`modal-compra-item-${index}-valor`" v-model="item.valor_unitario" label="Valor unitário *" type="number" min="0" step="0.01" :disabled="!edicaoFisicaPermitida" />
              <div class="flex flex-col gap-1.5">
                <span class="font-sans text-sm font-medium text-wine-800">Subtotal</span>
                <span class="rounded-luxe border border-wine-100 bg-white px-4 py-3 font-sans text-base text-brand">
                  {{ formatarMoeda(subtotalItem(item)) }}
                </span>
              </div>
            </div>
          </div>

          <button
            v-if="edicaoFisicaPermitida"
            id="modal-compra-add-item"
            type="button"
            class="flex items-center justify-center gap-2 rounded-luxe border border-dashed border-wine-300 py-3 font-sans text-sm font-medium text-wine-600 transition hover:border-brand hover:text-brand"
            @click="adicionarItem"
          >
            <PlusIcon class="h-5 w-5" />
            Adicionar item
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput id="modal-compra-frete" v-model="form.frete" label="Frete" type="number" min="0" step="0.01" :disabled="!edicaoFisicaPermitida" />
          <BaseInput id="modal-compra-desconto" v-model="form.desconto" label="Desconto" type="number" min="0" step="0.01" :disabled="!edicaoFisicaPermitida" />
        </div>
      </template>

      <div class="flex flex-col gap-1 rounded-luxe bg-wine-50 px-4 py-3 font-sans text-sm">
        <div class="flex justify-between"><span class="text-wine-600">Subtotal</span><span class="text-ink">{{ formatarMoeda(subtotalCalculado) }}</span></div>
        <div class="flex justify-between"><span class="text-wine-600">Frete</span><span class="text-ink">{{ formatarMoeda(freteNumero) }}</span></div>
        <div class="flex justify-between"><span class="text-wine-600">Desconto</span><span class="text-ink">{{ formatarMoeda(descontoNumero) }}</span></div>
        <div class="flex justify-between border-t border-wine-200 pt-1 font-semibold"><span class="text-brand">Total</span><span class="text-brand">{{ formatarMoeda(totalCalculado) }}</span></div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="modal-compra-observacao" class="font-sans text-sm font-medium text-wine-800">Observação</label>
        <textarea
          id="modal-compra-observacao"
          v-model="form.observacao"
          rows="3"
          placeholder="Observações da compra"
          class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
        />
      </div>
    </form>

    <template #footer>
      <BaseButton
        id="modal-compra-fechar"
        :label="modo === 'ver' ? 'Fechar' : 'Cancelar'"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        v-if="modo !== 'ver'"
        id="modal-compra-salvar"
        :label="modo === 'editar' ? 'Salvar alterações' : 'Registrar compra'"
        variant="primary"
        size="md"
        full-width
        :loading="salvando"
        :disabled="!edicaoFinanceiraPermitida"
        @click="handleSalvar"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseModal from '~/components/BaseModal.vue'
import { formatarMoeda } from '~/utils/pedidoAdmin'
import {
  CATEGORIAS_DESPESA,
  CATEGORIA_DESPESA_LABEL,
  calcularSubtotalItem,
  calcularSubtotalItens,
  calcularTotalCompra,
  dataHojeLocal,
  ehCategoriaDespesa,
  formatarDataCompra,
  formatarDataHoraCompra,
  STATUS_COMPRA_LABEL,
  STATUS_PAGAMENTO_COMPRA_LABEL,
  TIPO_COMPRA_LABEL,
  validarCompraPayload
} from '~/utils/compraAdmin'
import type { AdminFornecedor } from '~/types/fornecedor-admin'
import type { AdminProdutoLista } from '~/types/produto-admin'
import type {
  CompraAtualizarPayload,
  CompraDetalhadaAdmin,
  ItemCompraAdmin,
  ItemCompraPayload,
  StatusCompra,
  StatusPagamentoCompra,
  TipoCompra
} from '~/types/compra-admin'

export type ModoModalCompra = 'criar' | 'editar' | 'ver'

interface ItemForm {
  uiId: string
  produto_variante_id: number | null
  descricao: string
  cor: string
  tamanho: string
  quantidade: string
  valor_unitario: string
}

interface Props {
  aberto: boolean
  modo: ModoModalCompra
  salvando?: boolean
  compraInicial?: CompraDetalhadaAdmin | null
}

const props = withDefaults(defineProps<Props>(), {
  salvando: false,
  compraInicial: null
})

const emit = defineEmits<{
  fechar: []
  salvo: [payload: CompraAtualizarPayload]
  'vincular-item': [item: ItemCompraAdmin]
  'desvincular-item': [item: ItemCompraAdmin]
  'cadastrar-produto-item': [item: ItemCompraAdmin]
}>()

const fornecedores = ref<AdminFornecedor[]>([])
const produtos = ref<AdminProdutoLista[]>([])
const carregados = ref(false)

const form = reactive({
  tipo: 'despesa' as TipoCompra,
  data_compra: '',
  fornecedor_id: '' as string | number,
  forma_pagamento: '',
  status_pagamento: 'pendente' as StatusPagamentoCompra,
  vencimento: '',
  pago_em: '',
  observacao: '',
  categoria: '' as string,
  descricao: '',
  valor_base: '0',
  frete: '0',
  desconto: '0',
  itens: [] as ItemForm[]
})

function limparEstadoIncompativel() {
  if (form.tipo === 'mercadoria') {
    form.categoria = ''

    if (form.itens.length === 0) {
      form.itens = [criarItem()]
    }
  } else {
    form.itens = []
    form.valor_base = '0'
  }
}

function aoTrocarTipo() {
  limparEstadoIncompativel()
}

const titulo = computed(() => {
  if (props.modo === 'ver') {
    return `Compra${props.compraInicial ? ` #${props.compraInicial.id}` : ''}`
  }

  return props.modo === 'editar' ? 'Editar compra' : 'Nova compra'
})

const statusAtual = computed<StatusCompra>(() => props.compraInicial?.status ?? 'pendente')
const edicaoFisicaPermitida = computed(() => props.modo === 'criar' || statusAtual.value === 'pendente')
const edicaoFinanceiraPermitida = computed(() => props.modo !== 'ver' && statusAtual.value !== 'cancelada')

const itensNaoVinculados = computed(
  () => props.compraInicial?.itens.filter((item) => !item.produto_variante_id).length ?? 0
)

const resumoVinculo = computed(() => {
  const itens = props.compraInicial?.itens ?? []

  if (itens.length === 0) {
    return 'Nenhum item'
  }

  const vinculados = itens.filter((item) => item.produto_variante_id).length

  return `${vinculados} de ${itens.length} ${itens.length === 1 ? 'item vinculado' : 'itens vinculados'}`
})

const fornecedoresOpcoes = computed(() => {
  const opcoes = [...fornecedores.value]
  const atual = props.compraInicial?.fornecedor

  if (atual && !opcoes.some((f) => f.id === atual.id)) {
    opcoes.push({
      id: atual.id,
      nome: atual.nome,
      cnpj: null,
      telefone: null,
      email: null,
      contato: null,
      observacao: null,
      ativo: false,
      created_at: '',
      updated_at: ''
    })
  }

  return opcoes
})

interface VarianteOpcao {
  id: number
  label: string
  produtoNome: string
  cor: string | null
  tamanho: string
}

const variantesOpcoes = computed<VarianteOpcao[]>(() =>
  produtos.value.flatMap((produto) =>
    produto.variantes.map((variante) => ({
      id: variante.id,
      produtoNome: produto.nome,
      cor: variante.cor,
      tamanho: variante.tamanho,
      label: `${produto.nome}${variante.cor ? ` — ${variante.cor}` : ''} / ${variante.tamanho}`
    }))
  )
)

const freteNumero = computed(() => Number(form.frete) || 0)
const descontoNumero = computed(() => Number(form.desconto) || 0)

const subtotalCalculado = computed(() => {
  if (form.tipo === 'despesa') {
    return Number(form.valor_base) || 0
  }

  return calcularSubtotalItens(
    form.itens.map((item) => ({
      quantidade: Number(item.quantidade) || 0,
      valor_unitario: Number(item.valor_unitario) || 0
    }))
  )
})

const totalCalculado = computed(() => calcularTotalCompra(subtotalCalculado.value, freteNumero.value, descontoNumero.value))

function subtotalItem(item: ItemForm): number {
  return calcularSubtotalItem(Number(item.quantidade) || 0, Number(item.valor_unitario) || 0)
}

function categoriaLabel(categoria: string | null): string {
  return ehCategoriaDespesa(categoria) ? CATEGORIA_DESPESA_LABEL[categoria] : '—'
}

function criarItem(): ItemForm {
  return {
    uiId: crypto.randomUUID(),
    produto_variante_id: null,
    descricao: '',
    cor: '',
    tamanho: '',
    quantidade: '1',
    valor_unitario: '0'
  }
}

function adicionarItem() {
  form.itens.push(criarItem())
}

function removerItem(index: number) {
  if (form.itens.length <= 1) {
    return
  }

  form.itens.splice(index, 1)
}

function selecionarVariante(index: number, valor: string) {
  const item = form.itens[index]

  if (!item) {
    return
  }

  if (valor === '') {
    item.produto_variante_id = null
    return
  }

  const id = Number(valor)
  const opcao = variantesOpcoes.value.find((v) => v.id === id)

  item.produto_variante_id = id

  if (opcao) {
    item.descricao = opcao.produtoNome
    item.cor = opcao.cor ?? ''
    item.tamanho = opcao.tamanho
  }
}

function paraDatetimeLocal(iso: string | null): string {
  if (!iso) {
    return ''
  }

  const data = new Date(iso)

  if (Number.isNaN(data.getTime())) {
    return ''
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`
}

function hoje(): string {
  return dataHojeLocal()
}

watch(
  () => props.aberto,
  async (aberto) => {
    if (!aberto) {
      return
    }

    const compra = props.compraInicial

    form.tipo = compra?.tipo ?? 'despesa'
    form.data_compra = compra?.data_compra?.slice(0, 10) ?? hoje()
    form.fornecedor_id = compra?.fornecedor_id ?? ''
    form.forma_pagamento = compra?.forma_pagamento ?? ''
    form.status_pagamento = compra?.status_pagamento ?? 'pendente'
    form.vencimento = compra?.vencimento?.slice(0, 10) ?? ''
    form.pago_em = paraDatetimeLocal(compra?.pago_em ?? null)
    form.observacao = compra?.observacao ?? ''
    form.categoria = compra?.categoria ?? ''
    form.descricao = compra?.descricao ?? ''
    form.valor_base = compra && compra.tipo === 'despesa' ? String(compra.subtotal) : '0'
    form.frete = compra ? String(compra.frete) : '0'
    form.desconto = compra ? String(compra.desconto) : '0'

    if (form.tipo === 'mercadoria') {
      form.itens = compra && compra.itens.length > 0
        ? compra.itens.map((item) => ({
            uiId: crypto.randomUUID(),
            produto_variante_id: item.produto_variante_id,
            descricao: item.descricao,
            cor: item.cor ?? '',
            tamanho: item.tamanho ?? '',
            quantidade: String(item.quantidade),
            valor_unitario: String(item.valor_unitario)
          }))
        : [criarItem()]
    } else {
      form.itens = []
    }

    if (!carregados.value) {
      try {
        const [listaFornecedores, listaProdutos] = await Promise.all([
          $fetch<AdminFornecedor[]>('/api/admin/fornecedores', { query: { ativo: 'true' } }),
          $fetch<AdminProdutoLista[]>('/api/admin/produtos')
        ])

        fornecedores.value = Array.isArray(listaFornecedores) ? listaFornecedores : []
        produtos.value = Array.isArray(listaProdutos) ? listaProdutos : []
      } catch {
        fornecedores.value = []
        produtos.value = []
      } finally {
        carregados.value = true
      }
    }
  }
)

watch(
  () => form.status_pagamento,
  (status, anterior) => {
    if (status === 'pago' && !form.pago_em) {
      form.pago_em = paraDatetimeLocal(new Date().toISOString())
    }

    if (status === 'pendente' && anterior === 'pago') {
      form.pago_em = ''
    }
  }
)

function montarPayload(): CompraAtualizarPayload {
  const base: CompraAtualizarPayload = {
    status_pagamento: form.status_pagamento,
    forma_pagamento: form.forma_pagamento.trim() || null,
    vencimento: form.vencimento || null,
    pago_em: form.status_pagamento === 'pago' && form.pago_em ? new Date(form.pago_em).toISOString() : null,
    observacao: form.observacao.trim() || null
  }

  if (statusAtual.value === 'recebida' && props.modo === 'editar') {
    return base
  }

  const itens: ItemCompraPayload[] = form.itens.map((item) => ({
    produto_variante_id: item.produto_variante_id,
    descricao: item.descricao.trim(),
    cor: item.cor.trim() || null,
    tamanho: item.tamanho.trim() || null,
    quantidade: Number(item.quantidade) || 0,
    valor_unitario: Number(item.valor_unitario) || 0
  }))

  return {
    ...base,
    tipo: form.tipo,
    fornecedor_id: form.fornecedor_id === '' ? null : Number(form.fornecedor_id),
    categoria: form.tipo === 'despesa' ? form.categoria : null,
    descricao: form.descricao.trim() || null,
    data_compra: form.data_compra || hoje(),
    subtotal: form.tipo === 'despesa' ? Number(form.valor_base) || 0 : null,
    frete: freteNumero.value,
    desconto: descontoNumero.value,
    itens: form.tipo === 'mercadoria' ? itens : []
  }
}

function handleSalvar() {
  if (props.salvando || !edicaoFinanceiraPermitida.value) {
    return
  }

  const payload = montarPayload()

  if (statusAtual.value !== 'recebida' || props.modo !== 'editar') {
    const validacao = validarCompraPayload({
      tipo: payload.tipo ?? 'despesa',
      subtotal: payload.subtotal ?? null,
      frete: payload.frete ?? null,
      desconto: payload.desconto ?? null,
      itens: payload.itens
    })

    if (!validacao.ok) {
      toast.error(validacao.erro)
      return
    }
  }

  emit('salvo', payload)
}

function badgeTipo(tipo: TipoCompra): string {
  return tipo === 'mercadoria' ? 'bg-sky-100 text-sky-800' : 'bg-wine-100 text-wine-800'
}

function badgeStatus(status: StatusCompra): string {
  const classes: Record<StatusCompra, string> = {
    pendente: 'bg-wine-100 text-wine-800',
    recebida: 'bg-emerald-100 text-emerald-800',
    cancelada: 'bg-ink/10 text-ink'
  }

  return classes[status]
}

function badgePagamento(status: StatusPagamentoCompra): string {
  return status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
}

defineOptions({ name: 'ModalCompra' })
</script>
