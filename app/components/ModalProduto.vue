<template>
  <BaseModal
    :aberto="aberto"
    :titulo="isEdicao ? 'Editar produto' : 'Novo produto'"
    @fechar="emit('fechar')"
  >
    <div class="mb-5 flex items-center gap-2">
      <span
        v-for="n in 2"
        :key="n"
        class="h-2 w-10 rounded-full transition"
        :class="passo === n ? 'bg-brand' : 'bg-wine-100'"
      />
      <span class="ml-2 font-sans text-sm text-wine-700">
        Etapa {{ passo }} de 2
      </span>
    </div>

    <form class="flex flex-col gap-4" @submit.prevent="handleProximoOuSalvar">
      <template v-if="passo === 1">
        <BaseInput
          id="modal-produto-nome"
          v-model="form.nome"
          label="Nome do Produto"
          placeholder="Nome do produto"
          required
        />
        <BaseInput
          id="modal-produto-descricao"
          v-model="form.descricao"
          label="Descrição"
          placeholder="Descrição do produto"
        />
        <BaseInput
          id="modal-produto-categoria"
          v-model="form.categoria"
          label="Categoria"
          placeholder="Categoria do produto"
        />
        <BaseUpload
          v-model="form.capa"
          label="Imagem de capa"
          :multiple="false"
        />
      </template>

      <template v-else>
        <div class="flex flex-col gap-4">
          <div
            v-for="(variante, vi) in form.variantes"
            :key="variante.id"
            class="flex flex-col gap-3 rounded-luxe border border-wine-100 bg-wine-50/50 p-4"
          >
            <div class="flex items-center justify-between">
              <span class="font-sans text-sm font-medium text-brand">
                Variante {{ vi + 1 }}
              </span>
              <button
                type="button"
                class="rounded-luxe p-1.5 text-wine-700 transition hover:bg-wine-200/60 hover:text-brand"
                title="Fechar variante"
                aria-label="Fechar variante"
                @click="removerVariante(vi)"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BaseInput
                v-model="variante.cor"
                label="Cor"
                placeholder="Ex.: Vermelho"
              />
              <BaseInput
                v-model="variante.valor"
                label="Valor"
                type="number"
                min="0"
                step="0.01"
              />
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BaseInput
                v-model="variante.quantidade"
                label="Quantidade"
                type="number"
                min="0"
              />
            </div>

            <div>
              <span class="font-sans text-sm font-medium text-wine-800">
                Tamanho
              </span>
              <div class="mt-2 flex items-center gap-2">
                <button
                  v-for="t in tamanhos"
                  :key="t"
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full border font-sans text-sm font-medium transition"
                  :class="
                    variante.tamanho === t
                      ? 'border-brand bg-brand text-cream'
                      : 'border-wine-200 text-wine-700 hover:border-brand hover:text-brand'
                  "
                  @click="variante.tamanho = t"
                >
                  {{ t }}
                </button>
              </div>
            </div>

            <BaseUpload
              v-model="variante.imagens"
              label="Imagens complementares"
              :multiple="true"
              :max="3"
            />
          </div>

          <button
            id="modal-produto-add-variante"
            type="button"
            class="flex items-center justify-center gap-2 rounded-luxe border border-dashed border-wine-300 py-3 font-sans text-sm font-medium text-wine-600 transition hover:border-brand hover:text-brand"
            @click="adicionarVariante"
          >
            <PlusIcon class="h-5 w-5" />
            Adicionar variante
          </button>
        </div>
      </template>
    </form>

    <template #footer>
      <BaseButton
        id="modal-produto-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        v-if="passo === 2"
        id="modal-produto-voltar"
        label="Voltar"
        variant="ghost"
        size="md"
        full-width
        @click="passo = 1"
      />
      <BaseButton
        id="modal-produto-proximo"
        :label="passo === 2 ? (isEdicao ? 'Atualizar Produto' : 'Adicionar Produto') : 'Próximo'"
        variant="primary"
        size="md"
        full-width
        @click="handleProximoOuSalvar"
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
import BaseUpload from '~/components/BaseUpload.vue'
import type { ItemImagem } from '~/composables/useSalvarProduto'

export interface VarianteForm {
  id: number
  cor: string
  valor: string
  quantidade: string
  tamanho: string
  imagens: ItemImagem[]
}

export interface VarianteFormPayload {
  id: number
  cor: string
  valor: number
  quantidade: number
  tamanho: string
  imagens: ItemImagem[]
}

export interface ProdutoFormPayload {
  id: number | null
  nome: string
  descricao: string
  categoria: string
  capa: ItemImagem[]
  variantes: VarianteFormPayload[]
}

export interface ProdutoVarianteInicial {
  cor: string | null
  tamanho: string | null
  valor: number | null
  quantidade: number | null
  imagens: { url: string }[]
}

interface Props {
  aberto: boolean
  isEdicao?: boolean
  id?: number | null
  produtoInicial?: {
    nome: string
    descricao: string | null
    categoria: string | null
    capa?: { url: string } | null
    variantes?: ProdutoVarianteInicial[]
  } | null
}

const props = withDefaults(defineProps<Props>(), {
  isEdicao: false,
  id: null,
  produtoInicial: null
})

const emit = defineEmits<{
  fechar: []
  salvo: [payload: ProdutoFormPayload]
}>()

const tamanhos = ['P', 'M', 'G']
const passo = ref(1)
let proximoIdVariante = 1

const form = reactive<{
  nome: string
  descricao: string
  categoria: string
  capa: ItemImagem[]
  variantes: VarianteForm[]
}>({
  nome: '',
  descricao: '',
  categoria: '',
  capa: [],
  variantes: []
})

function criarVariante(): VarianteForm {
  return {
    id: proximoIdVariante++,
    cor: '',
    valor: '0',
    quantidade: '0',
    tamanho: '',
    imagens: []
  }
}

function itemImagemUrl(url: string): ItemImagem {
  return { id: crypto.randomUUID(), url }
}

function adicionarVariante() {
  form.variantes.push(criarVariante())
}

function removerVariante(index: number) {
  form.variantes.splice(index, 1)
}

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto) {
      return
    }

    passo.value = 1
    form.nome = props.produtoInicial?.nome ?? ''
    form.descricao = props.produtoInicial?.descricao ?? ''
    form.categoria = props.produtoInicial?.categoria ?? ''
    form.capa = props.produtoInicial?.capa?.url
      ? [itemImagemUrl(props.produtoInicial.capa.url)]
      : []

    const iniciais = props.produtoInicial?.variantes ?? []
    if (iniciais.length > 0) {
      form.variantes = iniciais.map((v) => {
        const variante = criarVariante()
        variante.cor = v.cor ?? ''
        variante.tamanho = v.tamanho ?? ''
        variante.valor = v.valor === null ? '0' : String(v.valor)
        variante.quantidade = v.quantidade === null ? '0' : String(v.quantidade)
        variante.imagens = v.imagens.map((img) => itemImagemUrl(img.url))
        return variante
      })
    } else {
      form.variantes = [criarVariante()]
    }
  }
)

function handleProximoOuSalvar() {
  if (passo.value === 1) {
    passo.value = 2
    return
  }

  if (!form.nome.trim()) {
    toast.error('Informe o nome do produto.')
    return
  }

  emit('salvo', {
    id: props.isEdicao ? props.id : null,
    nome: form.nome.trim(),
    descricao: form.descricao.trim(),
    categoria: form.categoria.trim(),
    capa: form.capa,
    variantes: form.variantes.map((v) => ({
      id: v.id,
      cor: v.cor.trim(),
      valor: Number(v.valor),
      quantidade: Number(v.quantidade),
      tamanho: v.tamanho,
      imagens: v.imagens
    }))
  })
}

defineOptions({ name: 'ModalProduto' })
</script>