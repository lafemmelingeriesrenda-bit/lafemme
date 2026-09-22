<template>
  <BaseModal
    :aberto="aberto"
    titulo="Cadastrar produto a partir da compra"
    texto-confirmar="Criar rascunho"
    :confirmar-carregando="salvando"
    @fechar="emit('fechar')"
  >
    <p class="mb-4 font-sans text-sm text-wine-700">
      Você poderá adicionar fotos, descrição e informações comerciais depois. O produto será criado como rascunho e não aparece no catálogo.
    </p>

    <form id="modal-produto-item-form" class="flex flex-col gap-4" @submit.prevent="handleSalvar">
      <BaseInput id="modal-produto-item-nome" v-model="form.nome" label="Nome *" placeholder="Nome do produto" required />
      <BaseInput id="modal-produto-item-categoria" v-model="form.categoria" label="Categoria" placeholder="Categoria do produto" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput id="modal-produto-item-cor" v-model="form.cor" label="Cor" placeholder="Ex.: Preto" />
        <BaseInput id="modal-produto-item-tamanho" v-model="form.tamanho" label="Tamanho *" placeholder="Ex.: M" />
      </div>

      <BaseInput
        id="modal-produto-item-preco"
        v-model="form.preco"
        label="Preço de venda (opcional)"
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
      />
      <p class="-mt-2 font-sans text-xs text-wine-500">
        O valor da compra é custo e não é usado como preço de venda. Informe o preço depois, se preferir.
      </p>
    </form>

    <template #footer>
      <BaseButton
        id="modal-produto-item-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-produto-item-salvar"
        label="Criar rascunho"
        variant="primary"
        size="md"
        full-width
        :loading="salvando"
        @click="handleSalvar"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseModal from '~/components/BaseModal.vue'
import type { ItemCompraAdmin, ProdutoRascunhoItemPayload } from '~/types/compra-admin'

interface Props {
  aberto: boolean
  item?: ItemCompraAdmin | null
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  item: null,
  salvando: false
})

const emit = defineEmits<{
  fechar: []
  salvo: [payload: ProdutoRascunhoItemPayload]
}>()

const form = reactive({
  nome: '',
  categoria: '',
  cor: '',
  tamanho: '',
  preco: ''
})

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto) {
      return
    }

    const item = props.item

    form.nome = item?.descricao ?? ''
    form.categoria = ''
    form.cor = item?.cor ?? ''
    form.tamanho = item?.tamanho ?? 'Tamanho Único'
    form.preco = ''
  }
)

function handleSalvar() {
  if (props.salvando) {
    return
  }

  const nome = form.nome.replace(/\s+/g, ' ').trim()
  const tamanho = form.tamanho.replace(/\s+/g, ' ').trim()

  if (!nome) {
    toast.error('Informe o nome do produto.')
    return
  }

  if (!tamanho) {
    toast.error('Informe o tamanho da variante.')
    return
  }

  const preco = Number(form.preco)

  emit('salvo', {
    nome,
    descricao: null,
    categoria: form.categoria.trim() || null,
    capa: null,
    variantes: [
      {
        id: null,
        cor: form.cor.trim() || null,
        tamanho,
        valor: Number.isFinite(preco) && preco > 0 ? preco : 0,
        quantidade: 0,
        sku: null,
        ativo: true,
        imagens: []
      }
    ]
  })
}

defineOptions({ name: 'ModalCadastrarProdutoItem' })
</script>
