<template>
  <main id="produto-page" class="bg-cream">
    <div class="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <NuxtLink
        id="produto-voltar-catalogo"
        to="/catalogo"
        class="inline-flex items-center gap-1 font-sans text-sm font-medium text-wine-700 transition hover:text-brand"
      >
        <ArrowLeftIcon class="h-4 w-4" aria-hidden="true" />
        Voltar ao catálogo
      </NuxtLink>

      <p v-if="carregando" id="produto-carregando" class="py-16 text-center font-sans text-lg text-wine-700">
        Carregando produto...
      </p>

      <p v-else-if="erro" id="produto-erro" class="py-16 text-center font-sans text-lg text-wine-700">
        Não foi possível carregar o produto. Tente novamente em instantes.
      </p>

      <section
        v-else-if="!produto"
        id="produto-nao-encontrado"
        class="flex flex-col items-center gap-4 py-16 text-center"
      >
        <p class="font-display text-2xl font-semibold text-brand">Produto não encontrado</p>
        <p class="max-w-md font-sans text-wine-700">
          O produto que você procura não está disponível no catálogo no momento.
        </p>
        <BaseButton
          id="produto-nao-encontrado-voltar"
          label="Voltar ao catálogo"
          variant="primary"
          size="md"
          class="mt-2"
          @click="navigateTo('/catalogo')"
        />
      </section>

      <section
        v-else
        id="produto-conteudo"
        class="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12"
      >
        <div id="produto-galeria" class="flex flex-col gap-4">
          <div
            id="produto-foto-principal"
            class="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-luxe border border-wine-100 bg-wine-50"
          >
            <img
              v-if="fotoPrincipal"
              :src="fotoPrincipal"
              :alt="produto.nome"
              class="h-full w-full object-cover"
            />
            <span v-else class="font-sans text-sm text-wine-300">Sem imagem</span>
          </div>

          <div v-if="galeria.length > 1" id="produto-miniaturas" class="flex flex-wrap gap-2">
            <button
              v-for="(foto, index) in galeria"
              :key="`${foto}-${index}`"
              type="button"
              class="h-20 w-20 overflow-hidden rounded-luxe border transition"
              :class="index === fotoAtiva ? 'border-brand' : 'border-wine-200 hover:border-brand'"
              :aria-label="`Ver imagem ${index + 1}`"
              @click="fotoAtiva = index"
            >
              <img :src="foto" :alt="`${produto.nome} ${index + 1}`" class="h-full w-full object-cover" />
            </button>
          </div>
        </div>

        <div id="produto-info" class="flex flex-col gap-5">
          <div v-if="produto.categoria" id="produto-categoria" class="flex">
            <span
              class="rounded-full bg-wine-50 px-3 py-1 font-sans text-sm font-medium text-wine-700"
            >
              {{ produto.categoria }}
            </span>
          </div>

          <h1 id="produto-nome" class="font-display text-3xl font-semibold text-brand md:text-4xl">
            {{ produto.nome }}
          </h1>

          <p
            v-if="produto.descricao"
            id="produto-descricao"
            class="font-sans text-base leading-relaxed text-wine-800"
          >
            {{ produto.descricao }}
          </p>

          <p id="produto-preco" class="font-sans text-2xl font-semibold text-brand">
            {{ precoExibido }}
          </p>

          <p v-if="indisponivel" id="produto-indisponivel" class="font-sans text-sm font-medium text-red-600">
            Este produto está esgotado no momento.
          </p>
          <p v-else id="produto-disponivel" class="font-sans text-sm font-medium text-emerald-600">
            Disponível
          </p>

          <div v-if="corAtiva && produto.cores.length > 1" id="produto-cores" class="flex flex-col gap-2">
            <span class="font-sans text-sm font-medium text-wine-700">Cor:</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="cor in produto.cores"
                :key="cor.cor ?? 'sem-cor'"
                type="button"
                class="rounded-luxe border px-4 py-2 font-sans text-sm font-medium transition"
                :class="
                  corAtiva === cor
                    ? 'border-brand bg-brand text-cream'
                    : 'border-wine-200 text-wine-700 hover:border-brand hover:text-brand'
                "
                @click="selecionarCor(cor)"
              >
                {{ cor.cor ?? 'Padrão' }}
              </button>
            </div>
          </div>

          <div
            v-if="corAtiva && corAtiva.variantes.length > 0"
            id="produto-tamanhos"
            class="flex flex-col gap-2"
          >
            <span class="font-sans text-sm font-medium text-wine-700">Tamanho:</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="variante in corAtiva.variantes"
                :key="variante.id"
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full border font-sans text-sm font-medium transition"
                :class="[
                  tamanhoAtivo?.id === variante.id
                    ? 'border-brand bg-brand text-cream'
                    : 'border-wine-200 text-wine-700 hover:border-brand hover:text-brand',
                  !variante.disponivel && 'cursor-not-allowed opacity-40 hover:border-wine-200 hover:text-wine-700'
                ]"
                :disabled="!variante.disponivel"
                @click="selecionarTamanho(variante)"
              >
                {{ variante.tamanho }}
              </button>
            </div>
          </div>

          <div id="produto-quantidade" class="flex flex-col gap-2">
            <span class="font-sans text-sm font-medium text-wine-700">Quantidade:</span>
            <div class="flex items-center gap-3">
              <button
                id="produto-quantidade-menos"
                type="button"
                class="rounded-luxe border border-wine-200 px-3 py-2 font-sans text-base font-medium text-wine-700 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="quantidade <= 1"
                aria-label="Diminuir quantidade"
                @click="quantidade -= 1"
              >
                −
              </button>
              <span
                id="produto-quantidade-valor"
                class="min-w-12 text-center font-sans text-base font-semibold text-wine-800"
              >
                {{ quantidade }}
              </span>
              <button
                id="produto-quantidade-mais"
                type="button"
                class="rounded-luxe border border-wine-200 px-3 py-2 font-sans text-base font-medium text-wine-700 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!podeAumentar"
                aria-label="Aumentar quantidade"
                @click="quantidade += 1"
              >
                +
              </button>
            </div>
          </div>

          <BaseButton
            id="produto-adicionar-sacola"
            label="Adicionar à sacola"
            variant="primary"
            size="lg"
            class="w-full md:w-auto"
            :disabled="!tamanhoAtivo || indisponivel"
            @click="adicionarAoSacola"
          />
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import { useCarrinho } from '~/composables/useCarrinho'
import {
  useProdutoPublico,
  type CorProdutoPublico,
  type ProdutoPublico,
  type VarianteProdutoPublico
} from '~/composables/useProdutoPublico'
import { caminhoProdutoSeSlugDiferente, urlProduto } from '~/utils/slugProduto'
import type { FotosProdutoResposta } from '~/types/fotos-produto'

defineOptions({ name: 'PaginaProduto' })

const route = useRoute()
const requestUrl = useRequestURL()

const id = Number(route.params.id)
const slugDoParam = String(route.params.slug ?? '')

const { produto, carregando, erro } = useProdutoPublico(Number.isInteger(id) && id > 0 ? id : 0)

const fotosComplementares = ref<string[]>([])
const fotoAtiva = ref(0)
const corSelecionada = ref<CorProdutoPublico | null>(null)
const tamanhoSelecionado = ref<VarianteProdutoPublico | null>(null)
const quantidade = ref(1)

const { adicionar } = useCarrinho()

const slugOficial = computed<string | null>(() => produto.value?.slug ?? null)

const corAtiva = computed<CorProdutoPublico | null>(() => corSelecionada.value ?? produto.value?.cores[0] ?? null)

const tamanhoAtivo = computed<VarianteProdutoPublico | null>(() => {
  if (tamanhoSelecionado.value) {
    return tamanhoSelecionado.value
  }

  const cor = corAtiva.value
  return cor?.variantes.find((v) => v.disponivel) ?? cor?.variantes[0] ?? null
})

const algumaDisponivel = computed<boolean>(() =>
  Boolean(produto.value?.cores.some((c) => c.variantes.some((v) => v.disponivel)))
)

const indisponivel = computed<boolean>(() => Boolean(produto.value && !algumaDisponivel.value))

const podeAumentar = computed<boolean>(() =>
  Boolean(tamanhoAtivo.value && quantidade.value < tamanhoAtivo.value.quantidade)
)

const galeria = computed<string[]>(() => {
  const lista: string[] = []

  if (corAtiva.value?.foto) {
    lista.push(corAtiva.value.foto)
  }

  lista.push(...fotosComplementares.value)
  return lista
})

const fotoPrincipal = computed<string>(() => galeria.value[fotoAtiva.value] ?? '')

const precoExibido = computed<string>(() =>
  tamanhoAtivo.value ? formatarPreco(tamanhoAtivo.value.valor) : '—'
)

const urlCanonica = computed<string | null>(() => {
  if (!produto.value || !slugOficial.value) {
    return null
  }
  return new URL(urlProduto(produto.value.id, slugOficial.value), requestUrl).toString()
})

useHead(() => {
  const descricao = produto.value?.descricao ?? ''
  const metaDescription = descricao.length > 160 ? `${descricao.slice(0, 157).trimEnd()}...` : descricao

  return {
    title: produto.value ? `${produto.value.nome} — La Femme` : 'Produto — La Femme',
    meta: metaDescription ? [{ name: 'description', content: metaDescription }] : [],
    link: urlCanonica.value ? [{ rel: 'canonical', href: urlCanonica.value }] : []
  }
})

watch(
  produto,
  (p) => {
    if (p) {
      carregarFotosComplementares(p)
    }
  },
  { immediate: true }
)

watchEffect(() => {
  if (
    import.meta.client &&
    !carregando.value &&
    produto.value &&
    slugOficial.value
  ) {
    const destino = caminhoProdutoSeSlugDiferente({
      id: produto.value.id,
      slugOficial: slugOficial.value,
      slugDaRota: slugDoParam
    })

    if (destino) {
      navigateTo(destino, { replace: true })
    }
  }
})

function carregarFotosComplementares(produtoPublico: ProdutoPublico): void {
  if (!import.meta.client) {
    return
  }

  const ids = produtoPublico.cores.flatMap((c) => c.variantes.map((v) => v.id))

  if (ids.length === 0) {
    return
  }

  $fetch<FotosProdutoResposta>(`/api/produtos/${produtoPublico.id}/fotos`)
    .then((resposta) => {
      fotosComplementares.value = resposta.fotos
    })
    .catch(() => {
      fotosComplementares.value = []
    })
}

function selecionarCor(cor: CorProdutoPublico): void {
  corSelecionada.value = cor
  tamanhoSelecionado.value = cor.variantes.find((v) => v.disponivel) ?? cor.variantes[0] ?? null
  quantidade.value = 1
  fotoAtiva.value = 0
}

function selecionarTamanho(variante: VarianteProdutoPublico): void {
  if (!variante.disponivel) {
    return
  }
  tamanhoSelecionado.value = variante
}

function adicionarAoSacola(): void {
  const produtoAtual = produto.value
  const variante = tamanhoAtivo.value
  const cor = corAtiva.value

  if (!produtoAtual || !variante || !cor) {
    return
  }

  adicionar(
    {
      varianteId: variante.id,
      produtoId: produtoAtual.id,
      nome: produtoAtual.nome,
      cor: cor.cor,
      tamanho: variante.tamanho,
      valor: variante.valor,
      foto: cor.foto
    },
    quantidade.value
  )

  toast.success(`${produtoAtual.nome} (${variante.tamanho}) adicionado à sacola!`, { duration: 2000 })
}

function formatarPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}
</script>
