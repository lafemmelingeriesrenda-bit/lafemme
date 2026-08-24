<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Produtos">
      <template #acoes>
        <button
          id="produtos-add"
          type="button"
          class="flex items-center gap-2 rounded-luxe bg-brand px-4 py-2 font-sans text-sm font-medium text-cream transition hover:bg-brand-light"
          @click="handleAdicionar"
        >
          <PlusIcon class="h-5 w-5" />
          Adicionar produto
        </button>
      </template>
    </AdminHeader>

    <div id="produtos-search" class="relative mt-6 max-w-md">
      <MagnifyingGlassIcon
        class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-wine-400"
      />
      <input
        id="produtos-search-input"
        type="search"
        v-model="busca"
        placeholder="Buscar produto..."
        class="w-full rounded-luxe border border-wine-200 bg-white py-2.5 pl-10 pr-4 font-sans text-sm text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
      />
    </div>

    <p v-if="loading" class="mt-6 font-sans text-lg text-wine-700">
      Carregando produtos...
    </p>

    <p v-else-if="error" class="mt-6 font-sans text-lg text-wine-700">
      {{ error }}
    </p>

    <div v-else class="mt-6">
      <div id="produtos-cards" class="flex flex-col gap-4 md:hidden">
        <article
          v-for="produto in filtrados"
          :key="produto.id"
          class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft"
        >
          <div class="flex items-center gap-3">
            <img
              v-if="produto.foto"
              :src="produto.foto"
              :alt="`Capa de ${produto.nome}`"
              class="h-14 w-14 shrink-0 rounded-luxe border border-wine-100 object-cover"
            />
            <div
              v-else
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-luxe border border-dashed border-wine-200 bg-wine-50 text-xs text-wine-300"
            >
              —
            </div>

            <div class="min-w-0 flex-1">
              <h3 class="truncate font-sans text-sm font-medium text-brand">
                {{ produto.nome }}
              </h3>
              <p class="mt-0.5 truncate font-sans text-xs text-wine-700">
                {{ produto.categoria ?? '—' }}
              </p>
              <p class="mt-1 font-sans text-xs text-wine-500">
                {{ resumoVariantes(produto) }}
              </p>
            </div>
          </div>

          <div class="mt-3 flex items-center gap-2 border-t border-wine-100 pt-3">
            <button
              :id="`produtos-mobile-expandir-${produto.id}`"
              type="button"
              class="flex items-center gap-1.5 rounded-luxe px-2 py-1.5 text-wine-700 transition hover:bg-wine-50"
              :title="expandidos.has(produto.id) ? 'Recolher variações' : 'Ver variações'"
              @click="toggleExpandir(produto.id)"
            >
              <component
                :is="expandidos.has(produto.id) ? ChevronDownIcon : ChevronRightIcon"
                class="h-5 w-5"
              />
              <span class="font-sans text-xs font-medium">
                {{ expandidos.has(produto.id) ? 'Recolher' : 'Variações' }}
              </span>
            </button>

            <div class="ml-auto flex items-center gap-1">
              <button
                :id="`produtos-mobile-edit-${produto.id}`"
                type="button"
                class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
                title="Editar"
                @click="handleEditar(produto)"
              >
                <PencilSquareIcon class="h-5 w-5" />
              </button>
              <button
                :id="`produtos-mobile-delete-${produto.id}`"
                type="button"
                class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
                title="Deletar"
                @click="solicitarExclusao(produto)"
              >
                <TrashIcon class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            v-if="expandidos.has(produto.id)"
            class="mt-3 border-t border-wine-100 pt-3"
          >
            <ProdutoVariantes :variantes="produto.variantes" />
          </div>
        </article>
      </div>

      <div
        id="produtos-table-wrapper"
        class="hidden overflow-x-auto rounded-luxe border border-wine-100 bg-white shadow-soft md:block"
      >
      <table id="produtos-table" class="w-full text-left font-sans text-sm">
        <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wider text-wine-600">
          <tr>
            <th class="w-12 px-4 py-3 font-semibold" aria-label="Expandir"></th>
            <th id="produtos-th-imagem" class="px-6 py-3 font-semibold">Imagem</th>
            <th id="produtos-th-nome" class="px-6 py-3 font-semibold">Nome</th>
            <th id="produtos-th-categoria" class="px-6 py-3 font-semibold">Categoria</th>
            <th id="produtos-th-acoes" class="px-6 py-3 font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="produto in filtrados" :key="produto.id">
            <tr class="border-b border-wine-100 last:border-0">
            <td class="px-4 py-3">
              <button
                :id="`produtos-expandir-${produto.id}`"
                type="button"
                class="rounded-luxe p-1.5 text-wine-700 transition hover:bg-wine-50"
                :title="expandidos.has(produto.id) ? 'Recolher' : 'Expandir'"
                @click="toggleExpandir(produto.id)"
              >
                <component
                  :is="expandidos.has(produto.id) ? ChevronDownIcon : ChevronRightIcon"
                  class="h-5 w-5"
                />
              </button>
            </td>
            <td class="px-6 py-3">
              <img
                v-if="produto.foto"
                :src="produto.foto"
                :alt="`Capa de ${produto.nome}`"
                class="h-12 w-12 rounded-luxe border border-wine-100 object-cover"
              />
              <div
                v-else
                class="flex h-12 w-12 items-center justify-center rounded-luxe border border-dashed border-wine-200 bg-wine-50 text-xs text-wine-300"
              >
                —
              </div>
            </td>
            <td class="px-6 py-3 font-medium text-brand">{{ produto.nome }}</td>
            <td class="px-6 py-3 text-wine-700">{{ produto.categoria ?? '—' }}</td>
            <td class="px-6 py-3">
              <div class="flex items-center gap-2">
                <button
                  :id="`produtos-edit-${produto.id}`"
                  type="button"
                  class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
                  title="Editar"
                  @click="handleEditar(produto)"
                >
                  <PencilSquareIcon class="h-5 w-5" />
                </button>
                <button
                  :id="`produtos-delete-${produto.id}`"
                  type="button"
                  class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
                  title="Deletar"
                  @click="solicitarExclusao(produto)"
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
          <tr
            v-if="expandidos.has(produto.id)"
            class="border-b border-wine-100 last:border-0"
          >
            <td :colspan="5" class="bg-wine-50/50 px-6 py-4">
              <ProdutoVariantes :variantes="produto.variantes" />
            </td>
          </tr>
          </template>
        </tbody>
      </table>
      </div>
    </div>

    <ModalProduto
      :aberto="modalAberto"
      :is-edicao="modalEdicao"
      :id="modalId"
      :produto-inicial="modalInicial"
      :salvando="salvando"
      @fechar="modalAberto = false"
      @salvo="handleSalvo"
    />

    <BaseModal
      :aberto="produtoParaExcluir !== null"
      titulo="Excluir produto"
      @fechar="cancelarExclusao"
    >
      <p class="font-sans text-sm text-wine-700">
        Tem certeza que deseja excluir o produto
        <strong class="font-medium text-brand">{{ produtoParaExcluir?.nome }}</strong>?
        Esta ação não pode ser desfeita.
      </p>
      <template #footer>
        <BaseButton
          id="produtos-exclusao-cancelar"
          label="Cancelar"
          variant="outline"
          size="md"
          full-width
          :disabled="excluindo"
          @click="cancelarExclusao"
        />
        <BaseButton
          id="produtos-exclusao-confirmar"
          label="Excluir"
          variant="primary"
          size="md"
          full-width
          :loading="excluindo"
          @click="confirmarExclusao"
        />
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { toast } from 'vue-sonner'
import AdminHeader from '~/components/AdminHeader.vue'
import BaseButton from '~/components/BaseButton.vue'
import BaseModal from '~/components/BaseModal.vue'
import ModalProduto from '~/components/ModalProduto.vue'
import type { ProdutoFormPayload, ProdutoVarianteInicial } from '~/components/ModalProduto.vue'
import ProdutoVariantes from '~/components/ProdutoVariantes.vue'
import { useBuscaProdutos } from '~/composables/useBuscaProdutos'
import { useSalvarProduto } from '~/composables/useSalvarProduto'
import type { AdminProdutoDetalhe, AdminProdutoLista } from '~/types/produto-admin'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

interface VarianteDetalhe {
  id: number
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
}

interface ProdutoRow {
  id: number
  nome: string
  descricao: string | null
  categoria: string | null
  foto: string | null
  variantes: VarianteDetalhe[]
}

interface ProdutoInicialModal {
  nome: string
  descricao: string | null
  categoria: string | null
  capa?: { url: string } | null
  variantes?: ProdutoVarianteInicial[]
}

const busca = ref('')
const expandidos = ref<Set<number>>(new Set())
const modalAberto = ref(false)
const modalEdicao = ref(false)
const modalId = ref<number | null>(null)
const modalInicial = ref<ProdutoInicialModal | null>(null)
const salvando = ref(false)
const produtoParaExcluir = ref<ProdutoRow | null>(null)
const excluindo = ref(false)

const { data: produtos, pending, error: queryError, refresh } = useAsyncData('produtos_admin', async () => {
  const lista = await $fetch<AdminProdutoLista[]>('/api/admin/produtos')

  return lista.map((p): ProdutoRow => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    foto: p.capa,
    variantes: p.variantes.map((v) => ({
      id: v.id,
      cor: v.cor,
      tamanho: v.tamanho,
      valor: v.valor,
      quantidade: v.quantidade
    }))
  }))
})

const loading = pending
const error = computed(() => queryError.value?.message ?? null)

const { filtrados } = useBuscaProdutos<ProdutoRow>(produtos, busca)

function resumoVariantes(produto: ProdutoRow): string {
  const total = produto.variantes.length
  if (total === 0) {
    return 'Nenhuma variação'
  }
  return `${total} variação${total === 1 ? '' : 'ões'}`
}

function toggleExpandir(id: number) {
  const proximo = new Set(expandidos.value)
  if (proximo.has(id)) {
    proximo.delete(id)
  } else {
    proximo.add(id)
  }
  expandidos.value = proximo
}

function handleAdicionar() {
  modalEdicao.value = false
  modalId.value = null
  modalInicial.value = null
  modalAberto.value = true
}

async function handleEditar(produto: ProdutoRow) {
  modalEdicao.value = true
  modalId.value = produto.id

  try {
    const detalhe = await $fetch<AdminProdutoDetalhe>(`/api/admin/produtos/${produto.id}`)

    modalInicial.value = {
      nome: detalhe.nome,
      descricao: detalhe.descricao,
      categoria: detalhe.categoria,
      capa: detalhe.capa ? { url: detalhe.capa } : null,
      variantes: detalhe.variantes.map((v) => ({
        id: v.id,
        cor: v.cor,
        tamanho: v.tamanho,
        valor: v.valor,
        quantidade: v.quantidade,
        sku: v.sku,
        ativo: v.ativo,
        imagens: v.fotos.map((url) => ({ url }))
      }))
    }

    modalAberto.value = true
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao carregar o produto.')
  }
}

function solicitarExclusao(produto: ProdutoRow) {
  if (excluindo.value) {
    return
  }
  produtoParaExcluir.value = produto
}

function cancelarExclusao() {
  if (excluindo.value) {
    return
  }
  produtoParaExcluir.value = null
}

async function confirmarExclusao() {
  const produto = produtoParaExcluir.value

  if (!produto || excluindo.value) {
    return
  }

  excluindo.value = true

  try {
    await $fetch(`/api/admin/produtos/${produto.id}`, { method: 'DELETE' })
    toast.success('Produto excluído com sucesso.')
    produtoParaExcluir.value = null
    await refresh()
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao excluir o produto.'
    toast.error(mensagem)
    produtoParaExcluir.value = null
  } finally {
    excluindo.value = false
  }
}

async function handleSalvo(payload: ProdutoFormPayload) {
  if (salvando.value) {
    return
  }

  salvando.value = true

  try {
    const { salvar, atualizar } = useSalvarProduto()

    const dados = {
      nome: payload.nome,
      descricao: payload.descricao,
      categoria: payload.categoria,
      capa: payload.capa[0] ?? null,
      variantes: payload.variantes.map((v) => ({
        id: v.id,
        cor: v.cor || null,
        tamanho: v.tamanho,
        valor: v.valor,
        quantidade: v.quantidade,
        sku: v.sku || null,
        ativo: v.ativo,
        imagens: v.imagens
      }))
    }

    if (payload.id) {
      await atualizar({ id: payload.id, ...dados })
      toast.success('Produto atualizado com sucesso.')
    } else {
      await salvar(dados)
      toast.success('Produto criado com sucesso.')
    }

    modalAberto.value = false
    await refresh()
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao salvar o produto.'
    toast.error(mensagem)
  } finally {
    salvando.value = false
  }
}

defineOptions({ name: 'ProdutosPage' })
</script>
