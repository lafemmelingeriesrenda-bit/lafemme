<template>
  <main class="bg-cream">
    <section class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div
        v-if="!loading && !error && !catalogoVazio"
        id="catalogo-controles"
        class="mb-8 flex flex-col gap-3 rounded-luxe border border-wine-100 bg-white p-4 shadow-soft sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div class="flex flex-col gap-1.5 sm:min-w-56 sm:flex-1">
          <label for="catalogo-busca" class="font-sans text-sm font-medium text-wine-800">
            Buscar
          </label>
          <input
            id="catalogo-busca"
            v-model="busca"
            type="search"
            placeholder="Buscar por nome ou categoria"
            :class="controleClasse"
          />
        </div>

        <div class="flex flex-col gap-1.5 sm:w-44">
          <label for="catalogo-categoria" class="font-sans text-sm font-medium text-wine-800">
            Categoria
          </label>
          <select id="catalogo-categoria" v-model="categoria" :class="controleClasse">
            <option value="">Todas</option>
            <option v-for="opcao in categorias" :key="opcao" :value="opcao">{{ opcao }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5 sm:w-44">
          <label for="catalogo-cor" class="font-sans text-sm font-medium text-wine-800">
            Cor
          </label>
          <select id="catalogo-cor" v-model="cor" :class="controleClasse">
            <option value="">Todas</option>
            <option v-for="opcao in cores" :key="opcao" :value="opcao">{{ opcao }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5 sm:w-40">
          <label for="catalogo-tamanho" class="font-sans text-sm font-medium text-wine-800">
            Tamanho
          </label>
          <select id="catalogo-tamanho" v-model="tamanho" :class="controleClasse">
            <option value="">Todos</option>
            <option v-for="opcao in tamanhos" :key="opcao" :value="opcao">{{ opcao }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5 sm:w-44">
          <label for="catalogo-ordem" class="font-sans text-sm font-medium text-wine-800">
            Ordenar por
          </label>
          <select id="catalogo-ordem" v-model="ordenacao" :class="controleClasse">
            <option value="nome-asc">Nome A–Z</option>
            <option value="nome-desc">Nome Z–A</option>
            <option value="preco-asc">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
          </select>
        </div>

        <BaseButton
          v-if="temFiltrosAtivos"
          id="catalogo-limpar"
          label="Limpar filtros"
          variant="ghost"
          size="sm"
          @click="limparFiltros"
        />
      </div>

      <p v-if="loading" class="text-center font-sans text-lg text-wine-700">
        Carregando produtos...
      </p>

      <p v-else-if="error" class="text-center font-sans text-lg text-wine-700">
        {{ error }}
      </p>

      <div
        v-else-if="catalogoVazio"
        id="catalogo-vazio"
        class="flex flex-col items-center gap-3 py-16 text-center"
      >
        <p class="font-display text-xl font-medium text-brand">
          Nenhum produto disponível no momento.
        </p>
      </div>

      <div
        v-else-if="produtosFiltrados.length === 0"
        id="catalogo-sem-resultados"
        class="flex flex-col items-center gap-4 py-16 text-center"
      >
        <p class="font-display text-xl font-medium text-brand">
          Nenhum produto encontrado com esses filtros.
        </p>
        <BaseButton
          id="catalogo-sem-resultados-limpar"
          label="Limpar filtros"
          variant="primary"
          size="md"
          @click="limparFiltros"
        />
      </div>

      <div v-else class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        <ProductCard
          v-for="(produto, index) in produtosFiltrados"
          :key="`${produto.produtoId}|${produto.cor ?? ''}|${produto.foto ?? ''}`"
          :produto="produto"
          :src="imagemCatalogo(produto.foto)"
          :src-fallback="produto.foto ?? ''"
          :priority="index === 0"
          :name="produto.nome"
          :variantes="produto.variantes"
          @add-to-cart="handleAddToCart"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import ProductCard from '~/components/ProductCard.vue'
import { useCarrinho } from '~/composables/useCarrinho'
import { useProdutos } from '~/composables/useProdutos'
import {
  ORDENACAO_PADRAO,
  categoriasDisponiveis,
  coresDisponiveis,
  filtrarEOrdenar,
  tamanhosDisponiveis,
  type OrdenacaoCatalogo
} from '~/utils/filtrarCatalogo'
import { obterImagemCatalogo } from '~/utils/produtoAdmin'

const { produtos, loading, error } = useProdutos()
const { adicionar } = useCarrinho()

const supabaseUrl = useRuntimeConfig().public.supabase.url as string

function imagemCatalogo(foto: string | null): string {
  return obterImagemCatalogo(foto, supabaseUrl)
}

const busca = ref('')
const categoria = ref('')
const cor = ref('')
const tamanho = ref('')
const ordenacao = ref<OrdenacaoCatalogo>(ORDENACAO_PADRAO)

const controleClasse =
  'w-full rounded-luxe border border-wine-200 bg-white px-3 py-2.5 font-sans text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200'

const lista = computed(() => produtos.value ?? [])

const categorias = computed(() => categoriasDisponiveis(lista.value))
const cores = computed(() => coresDisponiveis(lista.value))
const tamanhos = computed(() => tamanhosDisponiveis(lista.value))

const produtosFiltrados = computed(() =>
  filtrarEOrdenar(lista.value, {
    busca: busca.value,
    categoria: categoria.value || null,
    cor: cor.value || null,
    tamanho: tamanho.value || null,
    ordenacao: ordenacao.value
  })
)

const temFiltrosAtivos = computed(
  () =>
    busca.value.trim() !== '' ||
    categoria.value !== '' ||
    cor.value !== '' ||
    tamanho.value !== '' ||
    ordenacao.value !== ORDENACAO_PADRAO
)

const catalogoVazio = computed(
  () => !loading.value && !error.value && lista.value.length === 0
)

function limparFiltros(): void {
  busca.value = ''
  categoria.value = ''
  cor.value = ''
  tamanho.value = ''
  ordenacao.value = ORDENACAO_PADRAO
}

function handleAddToCart(varianteId: number) {
  const produto = produtos.value?.find((p) => p.variantes.some((v) => v.id === varianteId))
  const variante = produto?.variantes.find((v) => v.id === varianteId)

  if (!produto || !variante || !variante.disponivel) {
    return
  }

  adicionar({
    varianteId: variante.id,
    produtoId: produto.produtoId,
    nome: produto.nome,
    cor: produto.cor,
    tamanho: variante.tamanho,
    valor: variante.valor,
    foto: produto.foto,
    estoqueDisponivel: variante.quantidade
  })

  toast.success(`${produto.nome} (${variante.tamanho}) adicionado à sacola!`, { duration: 2000 })
}

defineOptions({ name: 'CatalogoPage' })
</script>
