<template>
  <BaseModal
    :aberto="aberto"
    titulo="Vincular produto"
    texto-confirmar="Vincular"
    :confirmar-carregando="carregando"
    @fechar="emit('fechar')"
  >
    <p class="mb-3 font-sans text-sm text-wine-700">
      Selecione a variante que corresponde a este item. O vínculo é estrutural e não altera os dados históricos da compra.
    </p>

    <input
      id="modal-vincular-produto-busca"
      type="search"
      v-model="busca"
      placeholder="Buscar por nome, cor ou tamanho..."
      class="mb-3 w-full rounded-luxe border border-wine-200 bg-white px-4 py-2.5 font-sans text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200"
    />

    <p v-if="carregandoLista" class="font-sans text-sm text-wine-600">Carregando produtos...</p>

    <p v-else-if="opcoesFiltradas.length === 0" class="font-sans text-sm text-wine-600">
      Nenhuma variante encontrada.
    </p>

    <ul v-else class="flex max-h-72 flex-col gap-2 overflow-y-auto">
      <li v-for="opcao in opcoesFiltradas" :key="opcao.id">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-luxe border px-3 py-2 text-left font-sans text-sm transition"
          :class="selecionado === opcao.id ? 'border-brand bg-wine-50' : 'border-wine-100 hover:border-brand'"
          @click="selecionado = opcao.id"
        >
          <span class="min-w-0 truncate text-ink">{{ opcao.label }}</span>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            :class="opcao.publicado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
          >
            {{ opcao.publicado ? 'Publicado' : 'Rascunho' }}
          </span>
        </button>
      </li>
    </ul>

    <template #footer>
      <BaseButton
        id="modal-vincular-produto-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-vincular-produto-confirmar"
        label="Vincular"
        variant="primary"
        size="md"
        full-width
        :loading="carregando"
        :disabled="selecionado === null"
        @click="confirmar"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'
import BaseModal from '~/components/BaseModal.vue'
import type { AdminProdutoLista } from '~/types/produto-admin'

interface OpcaoVariante {
  id: number
  label: string
  publicado: boolean
  produtoNome: string
  cor: string | null
  tamanho: string
}

interface Props {
  aberto: boolean
  carregando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  carregando: false
})

const emit = defineEmits<{
  fechar: []
  confirmar: [varianteId: number]
}>()

const produtos = ref<AdminProdutoLista[]>([])
const carregandoLista = ref(false)
const carregados = ref(false)
const busca = ref('')
const selecionado = ref<number | null>(null)

const opcoes = computed<OpcaoVariante[]>(() =>
  produtos.value.flatMap((produto) =>
    produto.variantes.map((variante) => ({
      id: variante.id,
      produtoNome: produto.nome,
      cor: variante.cor,
      tamanho: variante.tamanho,
      publicado: produto.publicado,
      label: `${produto.nome}${variante.cor ? ` — ${variante.cor}` : ''} / ${variante.tamanho}`
    }))
  )
)

const opcoesFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  if (!termo) {
    return opcoes.value
  }

  return opcoes.value.filter((opcao) => opcao.label.toLowerCase().includes(termo))
})

watch(
  () => props.aberto,
  async (aberto) => {
    if (!aberto) {
      return
    }

    selecionado.value = null
    busca.value = ''

    if (carregados.value) {
      return
    }

    carregandoLista.value = true

    try {
      const lista = await $fetch<AdminProdutoLista[]>('/api/admin/produtos')
      produtos.value = Array.isArray(lista) ? lista : []
    } catch {
      produtos.value = []
    } finally {
      carregandoLista.value = false
      carregados.value = true
    }
  }
)

function confirmar() {
  if (selecionado.value !== null) {
    emit('confirmar', selecionado.value)
  }
}

defineOptions({ name: 'ModalVincularProdutoItem' })
</script>
