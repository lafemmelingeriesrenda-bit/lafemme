<template>
  <BaseModal
    :aberto="aberto"
    :titulo="produto?.nome ?? 'Produto'"
    @fechar="emit('fechar')"
  >
    <div v-if="produto" class="flex flex-col gap-5">
      <div
        id="visualizar-produto-imagem"
        class="mx-auto flex aspect-[3/4] w-full max-w-sm items-center justify-center overflow-hidden rounded-luxe border border-wine-100 bg-wine-50"
      >
        <img
          v-if="fotoPrincipal"
          :src="fotoPrincipal"
          :alt="produto.nome"
          class="h-full w-full object-cover"
        />
        <span v-else class="font-sans text-sm text-wine-300">Sem imagem</span>
      </div>

      <div
        v-if="galeria.length > 1"
        id="visualizar-produto-miniaturas"
        class="flex flex-wrap items-center justify-center gap-2"
      >
        <button
          v-for="(foto, index) in galeria"
          :key="`${foto}-${index}`"
          type="button"
          class="h-16 w-16 overflow-hidden rounded-luxe border transition"
          :class="
            index === fotoAtiva
              ? 'border-brand'
              : 'border-wine-200 hover:border-brand'
          "
          :aria-label="`Visualizar imagem ${index + 1}`"
          @click="fotoAtiva = index"
        >
          <img :src="foto" :alt="`${produto.nome} ${index + 1}`" class="h-full w-full object-cover" />
        </button>
      </div>

      <div v-if="produto.categoria" id="visualizar-produto-categoria" class="flex items-center justify-center gap-2">
        <span class="rounded-full bg-wine-50 px-3 py-1 font-sans text-sm font-medium text-wine-700">
          {{ produto.categoria }}
        </span>
      </div>

      <p
        v-if="produto.descricao"
        id="visualizar-produto-descricao"
        class="text-center font-sans text-sm leading-relaxed text-wine-800"
      >
        {{ produto.descricao }}
      </p>

      <div
        v-if="produto.variantes.length > 0"
        id="visualizar-produto-variantes"
        class="flex flex-col items-center gap-4 border-t border-wine-100 pt-4"
      >
        <p
          v-if="valorUnico !== null"
          id="visualizar-produto-valor"
          class="font-sans text-xl font-semibold text-brand"
        >
          {{ formatPrice(valorUnico) }}
        </p>

        <div id="visualizar-produto-tamanhos" class="flex items-center gap-2">
          <span class="font-sans text-sm font-medium text-wine-700">Tamanhos:</span>
          <button
            v-for="variante in produto.variantes"
            :key="variante.id"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border font-sans text-sm font-medium transition"
            :class="
              tamanhoSelecionado?.id === variante.id
                ? 'border-brand bg-brand text-cream'
                : 'border-wine-200 text-wine-700 hover:border-brand hover:text-brand'
            "
            @click="tamanhoSelecionado = variante"
          >
            {{ variante.tamanho }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton
        id="visualizar-produto-comprar"
        label="Comprar"
        variant="primary"
        size="md"
        class="w-full"
        :disabled="produto?.variantes[0] === undefined"
        @click="handleComprar"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import BaseButton from '~/components/BaseButton.vue'
import BaseModal from '~/components/BaseModal.vue'
import type { ProdutoCard, VarianteProduto } from '~/composables/useProdutos'

interface Props {
  aberto: boolean
  produto: ProdutoCard | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  fechar: []
  comprar: [varianteId: number]
}>()

const supabase = useSupabaseClient()

const fotosComplementares = ref<string[]>([])
const fotoAtiva = ref(0)
const tamanhoSelecionado = ref<VarianteProduto | null>(null)

const valorUnico = computed<number | null>(() =>
  tamanhoSelecionado.value?.valor ?? props.produto?.variantes[0]?.valor ?? null
)

const fotos = computed<string[]>(() => {
  const lista: string[] = []
  if (props.produto?.foto) {
    lista.push(props.produto.foto)
  }
  lista.push(...fotosComplementares.value)
  return lista
})

const fotoPrincipal = computed<string | ''>(() => fotos.value[fotoAtiva.value] ?? '')
const galeria = fotos

function formatPrice(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

function handleComprar() {
  const varianteId = tamanhoSelecionado.value?.id ?? props.produto?.variantes[0]?.id
  if (varianteId === undefined) {
    return
  }
  emit('comprar', varianteId)
}

watch(
  () => props.aberto,
  async (aberto) => {
    if (!aberto || !props.produto) {
      return
    }

    fotoAtiva.value = 0
    fotosComplementares.value = []
    tamanhoSelecionado.value = props.produto.variantes[0] ?? null

    const ids = props.produto.variantes.map((v) => v.id)

    if (ids.length === 0) {
      return
    }

    const { data, error } = await supabase
      .from('foto_variante')
      .select('url')
      .in('id_variante', ids)

    if (!error) {
      fotosComplementares.value = (data ?? []).map((f) => f.url).filter(Boolean)
    }
  }
)

defineOptions({ name: 'VisualizarProduto' })
</script>