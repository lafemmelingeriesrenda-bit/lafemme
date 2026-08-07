<template>
  <main class="flex flex-1 flex-col px-6 py-10">
    <header
      id="produtos-header"
      class="flex items-center justify-between gap-4 border-b border-wine-100 pb-4"
    >
      <h1 class="shrink-0 font-display text-3xl font-semibold text-brand">Produtos</h1>

      <div id="produtos-search" class="relative w-full max-w-md">
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

      <button
        id="produtos-add"
        type="button"
        class="shrink-0 flex items-center gap-2 rounded-luxe bg-brand px-4 py-2 font-sans text-sm font-medium text-cream transition hover:bg-brand-light"
        @click="handleAdicionar"
      >
        <PlusIcon class="h-5 w-5" />
        Adicionar produto
      </button>
    </header>

    <p v-if="loading" class="mt-6 font-sans text-lg text-wine-700">
      Carregando produtos...
    </p>

    <p v-else-if="error" class="mt-6 font-sans text-lg text-wine-700">
      {{ error }}
    </p>

    <div v-else class="mt-6 overflow-x-auto rounded-luxe border border-wine-100 bg-white shadow-soft">
      <table id="produtos-table" class="w-full text-left font-sans text-sm">
        <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wider text-wine-600">
          <tr>
            <th id="produtos-th-id" class="px-6 py-3 font-semibold">ID</th>
            <th id="produtos-th-imagem" class="px-6 py-3 font-semibold">Imagem</th>
            <th id="produtos-th-nome" class="px-6 py-3 font-semibold">Nome</th>
            <th id="produtos-th-categoria" class="px-6 py-3 font-semibold">Categoria</th>
            <th id="produtos-th-acoes" class="px-6 py-3 font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="produto in filtrados"
            :key="produto.id"
            class="border-b border-wine-100 last:border-0"
          >
            <td class="px-6 py-3 text-wine-700">{{ produto.id }}</td>
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
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalProduto
      :aberto="modalAberto"
      :is-edicao="modalEdicao"
      :id="modalId"
      :produto-inicial="modalInicial"
      @fechar="modalAberto = false"
      @salvo="handleSalvo"
    />
  </main>
</template>

<script setup lang="ts">
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { toast } from 'vue-sonner'
import { useSupabaseClient } from '#imports'
import ModalProduto from '~/components/ModalProduto.vue'
import type { ProdutoFormPayload } from '~/components/ModalProduto.vue'
import { useBuscaProdutos } from '~/composables/useBuscaProdutos'
import { useSalvarProduto } from '~/composables/useSalvarProduto'

definePageMeta({ layout: 'layout-principal' })

interface ProdutoRow {
  id: number
  nome: string
  descricao: string | null
  categoria: string | null
  foto: string | null
}

const busca = ref('')
const modalAberto = ref(false)
const modalEdicao = ref(false)
const modalId = ref<number | null>(null)
const modalInicial = ref<ProdutoRow | null>(null)

const supabase = useSupabaseClient()

const { data: produtos, pending, error: queryError, refresh } = useAsyncData('produtos_admin', async () => {
  const [{ data, error }, { data: fotos, error: erroFotos }] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, descricao, categoria')
      .order('id'),
    supabase
      .from('produto_variante')
      .select('produto_id, foto')
      .not('foto', 'is', null)
      .order('produto_id')
  ])

  if (error) {
    throw new Error(error.message)
  }
  if (erroFotos) {
    throw new Error(erroFotos.message)
  }

  const fotoPorProduto = new Map<number, string>()
  for (const item of fotos ?? []) {
    if (!fotoPorProduto.has(item.produto_id) && item.foto) {
      fotoPorProduto.set(item.produto_id, item.foto)
    }
  }

  return ((data ?? []) as Exclude<ProdutoRow, 'foto'>[]).map((p) => ({
    ...p,
    foto: fotoPorProduto.get(p.id) ?? null
  }))
})

const loading = pending
const error = computed(() => queryError.value?.message ?? null)

const { filtrados } = useBuscaProdutos<ProdutoRow>(produtos, busca)

function handleAdicionar() {
  modalEdicao.value = false
  modalId.value = null
  modalInicial.value = null
  modalAberto.value = true
}

function handleEditar(produto: ProdutoRow) {
  modalEdicao.value = true
  modalId.value = produto.id
  modalInicial.value = {
    nome: produto.nome,
    descricao: produto.descricao,
    categoria: produto.categoria
  }
  modalAberto.value = true
}

async function handleSalvo(payload: ProdutoFormPayload) {
  try {
    const { salvar } = useSalvarProduto()

    await salvar({
      nome: payload.nome,
      descricao: payload.descricao,
      categoria: payload.categoria,
      capa: payload.capa[0] ?? null,
      variantes: payload.variantes.map((v) => ({
        cor: v.cor || null,
        tamanho: v.tamanho,
        valor: v.valor,
        quantidade: v.quantidade,
        sku: null,
        imagens: v.imagens
      }))
    })

    toast.success('Produto criado com sucesso.')
    modalAberto.value = false
    await refresh()
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao salvar o produto.'
    toast.error(mensagem)
  }
}

defineOptions({ name: 'ProdutosPage' })
</script>