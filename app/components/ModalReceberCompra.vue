<template>
  <BaseModal
    :aberto="aberto"
    titulo="Confirmar recebimento"
    texto-confirmar="Confirmar entrada no estoque"
    :confirmar-carregando="carregando"
    @fechar="emit('fechar')"
  >
    <template v-if="compra">
      <p class="mb-1 font-sans text-sm text-wine-700">
        Compra #{{ compra.id }} — {{ compra.fornecedor?.nome || 'Sem fornecedor' }}
      </p>

      <p
        class="mb-3 rounded-luxe px-3 py-2 font-sans text-sm"
        :class="todosVinculados ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'"
      >
        <template v-if="todosVinculados">Todos os itens estão vinculados.</template>
        <template v-else>
          {{ itensNaoVinculados }} {{ itensNaoVinculados === 1 ? 'item precisa' : 'itens precisam' }} ser
          vinculado(s) antes da entrada no estoque.
        </template>
      </p>

      <ul class="flex flex-col gap-3">
        <li
          v-for="item in compra.itens"
          :key="item.id"
          class="flex flex-col gap-2 rounded-luxe border border-wine-100 p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-sans text-sm font-medium text-ink">{{ item.descricao }}</p>
              <p class="font-sans text-xs text-wine-600">
                {{ item.cor || '—' }} / {{ item.tamanho || '—' }} · {{ item.quantidade }}
                {{ item.quantidade === 1 ? 'unidade' : 'unidades' }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="item.produto_variante_id ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
            >
              {{ item.produto_variante_id ? 'Vinculado' : 'Não vinculado' }}
            </span>
          </div>

          <p v-if="item.produto_variante_id" class="font-sans text-xs text-wine-600">
            {{ labelVariante(item.produto_variante_id) }}
          </p>

          <div v-else class="flex flex-wrap gap-2">
            <BaseButton
              :id="`receber-item-${item.id}-vincular`"
              label="Vincular existente"
              variant="outline"
              size="sm"
              @click="emit('vincular-item', item)"
            />
            <BaseButton
              :id="`receber-item-${item.id}-cadastrar`"
              label="Cadastrar produto agora"
              variant="ghost"
              size="sm"
              @click="emit('cadastrar-produto-item', item)"
            />
          </div>
        </li>
      </ul>

      <div v-if="todosVinculados" class="mt-4 rounded-luxe bg-wine-50 px-4 py-3">
        <p class="font-sans text-sm font-medium text-brand">
          {{ totalUnidades }} {{ totalUnidades === 1 ? 'unidade será adicionada' : 'unidades serão adicionadas' }}
          ao estoque.
        </p>
        <ul class="mt-2 flex flex-col gap-1 font-sans text-xs text-wine-700">
          <li v-for="linha in resumoVariantes" :key="linha.chave" class="flex justify-between gap-3">
            <span class="truncate">{{ linha.label }}</span>
            <span class="shrink-0">+{{ linha.quantidade }}</span>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <BaseButton
        id="modal-receber-cancelar"
        label="Voltar"
        variant="outline"
        size="md"
        full-width
        :disabled="carregando"
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-receber-confirmar"
        label="Confirmar entrada no estoque"
        variant="primary"
        size="md"
        full-width
        :loading="carregando"
        :disabled="!todosVinculados"
        @click="emit('confirmar')"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'
import BaseModal from '~/components/BaseModal.vue'
import type { CompraDetalhadaAdmin, ItemCompraAdmin } from '~/types/compra-admin'
import type { AdminProdutoLista } from '~/types/produto-admin'

interface Props {
  aberto: boolean
  compra?: CompraDetalhadaAdmin | null
  carregando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compra: null,
  carregando: false
})

const emit = defineEmits<{
  fechar: []
  confirmar: []
  'vincular-item': [item: ItemCompraAdmin]
  'cadastrar-produto-item': [item: ItemCompraAdmin]
}>()

const produtos = ref<AdminProdutoLista[]>([])
const carregados = ref(false)

const rotuloPorVariante = computed(() => {
  const mapa = new Map<number, string>()

  for (const produto of produtos.value) {
    for (const variante of produto.variantes) {
      mapa.set(variante.id, `${produto.nome}${variante.cor ? ` — ${variante.cor}` : ''} / ${variante.tamanho}`)
    }
  }

  return mapa
})

const itensNaoVinculados = computed(
  () => props.compra?.itens.filter((item) => !item.produto_variante_id).length ?? 0
)

const todosVinculados = computed(() => {
  const itens = props.compra?.itens ?? []
  return itens.length > 0 && itens.every((item) => item.produto_variante_id !== null)
})

const totalUnidades = computed(() =>
  (props.compra?.itens ?? []).reduce((soma, item) => soma + item.quantidade, 0)
)

const resumoVariantes = computed(() => {
  const mapa = new Map<number, { chave: string; label: string; quantidade: number }>()

  for (const item of props.compra?.itens ?? []) {
    if (!item.produto_variante_id) {
      continue
    }

    const existente = mapa.get(item.produto_variante_id)

    if (existente) {
      existente.quantidade += item.quantidade
    } else {
      mapa.set(item.produto_variante_id, {
        chave: String(item.produto_variante_id),
        label: labelVariante(item.produto_variante_id),
        quantidade: item.quantidade
      })
    }
  }

  return [...mapa.values()]
})

function labelVariante(id: number): string {
  return rotuloPorVariante.value.get(id) ?? `Variante #${id}`
}

watch(
  () => props.aberto,
  async (aberto) => {
    if (!aberto || carregados.value) {
      return
    }

    try {
      const lista = await $fetch<AdminProdutoLista[]>('/api/admin/produtos')
      produtos.value = Array.isArray(lista) ? lista : []
    } catch {
      produtos.value = []
    } finally {
      carregados.value = true
    }
  }
)

defineOptions({ name: 'ModalReceberCompra' })
</script>
