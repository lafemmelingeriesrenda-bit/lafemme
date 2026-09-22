<template>
  <BaseModal
    :aberto="aberto"
    titulo="Ajustar estoque"
    texto-confirmar="Confirmar ajuste"
    :confirmar-carregando="salvando"
    @fechar="emit('fechar')"
  >
    <div v-if="variante" class="flex flex-col gap-4">
      <dl class="grid grid-cols-1 gap-2 rounded-luxe bg-wine-50 px-4 py-3 font-sans text-sm sm:grid-cols-2">
        <div>
          <dt class="text-xs uppercase tracking-wide text-wine-500">Produto</dt>
          <dd class="text-ink">{{ variante.produtoNome }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-wine-500">Variante</dt>
          <dd class="text-ink">{{ variante.cor || 'Sem cor' }} / {{ variante.tamanho }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-wine-500">Estoque atual</dt>
          <dd class="text-ink">{{ variante.quantidade }}</dd>
        </div>
      </dl>

      <BaseInput
        id="modal-ajuste-nova-quantidade"
        v-model="novaQuantidade"
        label="Nova quantidade *"
        type="number"
        min="0"
        step="1"
      />

      <p
        class="rounded-luxe px-3 py-2 font-sans text-sm"
        :class="diferencaClasse"
      >
        {{ diferencaTexto }}
      </p>

      <div class="flex flex-col gap-1.5">
        <label for="modal-ajuste-motivo" class="font-sans text-sm font-medium text-wine-800">Motivo *</label>
        <select
          id="modal-ajuste-motivo"
          v-model="motivo"
          :disabled="tipo === null"
          class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 disabled:bg-wine-50 disabled:text-wine-500"
        >
          <option value="">Selecione o motivo</option>
          <option v-for="opcao in motivosDisponiveis" :key="opcao" :value="opcao">
            {{ MOTIVO_AJUSTE_LABEL[opcao] }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="modal-ajuste-observacao" class="font-sans text-sm font-medium text-wine-800">
          Observação{{ motivo === 'outro' ? ' *' : ' (opcional)' }}
        </label>
        <textarea
          id="modal-ajuste-observacao"
          v-model="observacao"
          rows="3"
          placeholder="Detalhe o motivo do ajuste"
          class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
        />
      </div>
    </div>

    <template #footer>
      <BaseButton
        id="modal-ajuste-cancelar"
        label="Cancelar"
        variant="outline"
        size="md"
        full-width
        :disabled="salvando"
        @click="emit('fechar')"
      />
      <BaseButton
        id="modal-ajuste-confirmar"
        label="Confirmar ajuste"
        variant="primary"
        size="md"
        full-width
        :loading="salvando"
        :disabled="!podeConfirmar"
        @click="handleConfirmar"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import BaseModal from '~/components/BaseModal.vue'
import {
  calcularDiferenca,
  inferirTipoAjuste,
  MOTIVO_AJUSTE_LABEL,
  motivosParaTipo,
  validarAjusteEstoque
} from '~/utils/estoqueAdmin'
import type { AjusteEstoquePayload, MotivoAjusteEstoque } from '~/types/estoque-admin'

export interface VarianteAjusteInfo {
  id: number
  produtoNome: string
  cor: string | null
  tamanho: string
  quantidade: number
}

interface Props {
  aberto: boolean
  variante?: VarianteAjusteInfo | null
  salvando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variante: null,
  salvando: false
})

const emit = defineEmits<{
  fechar: []
  salvo: [payload: AjusteEstoquePayload]
}>()

const novaQuantidade = ref('0')
const motivo = ref<MotivoAjusteEstoque | ''>('')
const observacao = ref('')

const quantidadeAtual = computed(() => props.variante?.quantidade ?? 0)
const novaNumero = computed(() => Number(novaQuantidade.value))

const diferenca = computed(() => calcularDiferenca(quantidadeAtual.value, novaNumero.value))
const tipo = computed(() => inferirTipoAjuste(diferenca.value))
const motivosDisponiveis = computed(() => (tipo.value ? motivosParaTipo(tipo.value) : []))

const diferencaTexto = computed(() => {
  if (diferenca.value === 0) {
    return 'Nenhuma alteração'
  }

  if (diferenca.value > 0) {
    return `Entrada manual: +${diferenca.value} ${diferenca.value === 1 ? 'unidade' : 'unidades'}`
  }

  return `Saída manual: ${diferenca.value} ${diferenca.value === -1 ? 'unidade' : 'unidades'}`
})

const diferencaClasse = computed(() => {
  if (diferenca.value === 0) {
    return 'bg-wine-50 text-wine-700'
  }

  return diferenca.value > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
})

const podeConfirmar = computed(
  () =>
    tipo.value !== null &&
    motivo.value !== '' &&
    Number.isInteger(novaNumero.value) &&
    novaNumero.value >= 0
)

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto) {
      return
    }

    novaQuantidade.value = String(props.variante?.quantidade ?? 0)
    motivo.value = ''
    observacao.value = ''
  }
)

watch(tipo, () => {
  if (motivo.value !== '' && !motivosDisponiveis.value.includes(motivo.value as MotivoAjusteEstoque)) {
    motivo.value = ''
  }
})

function handleConfirmar() {
  if (props.salvando) {
    return
  }

  const validacao = validarAjusteEstoque({
    quantidadeAtual: quantidadeAtual.value,
    novaQuantidade: novaNumero.value,
    motivo: motivo.value,
    observacao: observacao.value
  })

  if (!validacao.ok) {
    toast.error(validacao.erro)
    return
  }

  emit('salvo', {
    nova_quantidade: novaNumero.value,
    motivo: motivo.value as MotivoAjusteEstoque,
    observacao: observacao.value.trim() || null,
    quantidade_esperada: quantidadeAtual.value
  })
}

defineOptions({ name: 'ModalAjustarEstoque' })
</script>
