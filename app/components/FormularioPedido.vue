<template>
  <form
    id="formulario-pedido"
    novalidate
    class="flex flex-col gap-4"
    @submit.prevent="enviarPedido"
  >
    <button
      id="formulario-pedido-voltar"
      type="button"
      class="inline-flex items-center gap-1.5 self-start rounded-luxe px-2 py-1 font-sans text-sm font-medium text-wine-700 transition hover:bg-wine-50 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
      @click="emit('voltar')"
    >
      <ArrowLeftIcon class="h-4 w-4" aria-hidden="true" />
      Voltar para a sacola
    </button>

    <p class="font-sans text-sm text-wine-700">
      Preencha seus dados para finalizar o pedido.
    </p>

    <BaseInput
      id="formulario-pedido-nome"
      v-model="form.nome"
      label="Nome"
      placeholder="Seu nome completo"
      required
    />

    <BaseInput
      id="formulario-pedido-telefone"
      v-model="form.telefone"
      label="Telefone / WhatsApp"
      type="tel"
      placeholder="(00) 00000-0000"
      required
    />

    <div class="flex flex-col gap-1.5">
      <label for="formulario-pedido-observacoes" class="font-sans text-sm font-medium text-wine-800">
        Observações
      </label>
      <textarea
        id="formulario-pedido-observacoes"
        v-model="form.observacoes"
        rows="3"
        maxlength="1000"
        placeholder="Alguma observação sobre o pedido? (opcional)"
        class="w-full resize-none rounded-luxe border border-wine-200 bg-white px-4 py-3 font-sans text-base text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
      />
    </div>

    <div
      v-if="erroExibido"
      id="formulario-pedido-erro"
      class="flex items-start gap-2 rounded-luxe border border-red-300 bg-red-50 px-4 py-3"
      role="alert"
    >
      <ExclamationTriangleIcon class="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
      <p class="font-sans text-sm text-red-700">{{ erroExibido }}</p>
    </div>

    <BaseButton
      id="formulario-pedido-enviar"
      type="submit"
      label="Confirmar pedido"
      variant="primary"
      size="md"
      class="w-full"
      :loading="carregando || validando"
      :disabled="itens.length === 0"
    />
  </form>
</template>

<script setup lang="ts">
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import { useCarrinho } from '~/composables/useCarrinho'
import { useCriarPedido } from '~/composables/useCriarPedido'
import { useValidarCarrinho } from '~/composables/useValidarCarrinho'
import { useWhatsApp } from '~/composables/useWhatsApp'
import type { PedidoCriado } from '~/types/pedido'

const emit = defineEmits<{
  voltar: []
  concluido: [pedido: PedidoCriado]
}>()

defineOptions({ name: 'FormularioPedido' })

const { itens, limpar, alterarQuantidade, definirEstoque } = useCarrinho()
const { carregando, mensagemErro, criarPedido } = useCriarPedido()
const { carregando: validando, validar: validarCarrinho } = useValidarCarrinho()
const { abrirWhatsAppPedido } = useWhatsApp()

const mensagemValidacao = ref<string | null>(null)

const erroExibido = computed(() => mensagemValidacao.value ?? mensagemErro.value)

const form = reactive({
  nome: '',
  telefone: '',
  observacoes: ''
})

function validarNome(): boolean {
  const nome = form.nome.replace(/\s+/g, ' ').trim()

  if (nome.length === 0) {
    toast.error('Informe seu nome para continuar.')
    return false
  }

  if (nome.length > 120) {
    toast.error('O nome deve ter no máximo 120 caracteres.')
    return false
  }

  return true
}

function validarTelefone(): boolean {
  const digitos = form.telefone.replace(/\D/g, '')

  if (digitos.length < 8 || digitos.length > 15) {
    toast.error('Informe um telefone/WhatsApp válido.')
    return false
  }

  return true
}

function validar(): boolean {
  return validarNome() && validarTelefone()
}

async function enviarPedido() {
  if (carregando.value || validando.value) {
    return
  }

  if (itens.value.length === 0) {
    toast.error('Sua sacola está vazia.')
    return
  }

  if (!validar()) {
    return
  }

  mensagemValidacao.value = null

  // Revalida contra o servidor antes de criar o pedido (camada de UX).
  // A RPC criar_pedido continua sendo a validação definitiva no banco.
  const validacao = await validarCarrinho(itens.value)

  if (!validacao.valido) {
    let ajustou = false

    for (const erro of validacao.erros) {
      if (
        erro.motivo === 'ESTOQUE_INSUFICIENTE' &&
        typeof erro.disponivel === 'number' &&
        erro.disponivel >= 1
      ) {
        alterarQuantidade(erro.varianteId, erro.disponivel)
        ajustou = true
      }
    }

    mensagemValidacao.value = validacao.mensagem

    if (ajustou) {
      toast.info('Ajustamos as quantidades ao estoque disponível. Confira e confirme novamente.')
    }

    return
  }

  for (const item of validacao.itens) {
    definirEstoque(item.varianteId, item.disponivel)
  }

  const pedido = await criarPedido({
    itens: itens.value.map((item) => ({
      varianteId: item.varianteId,
      quantidade: item.quantidade
    })),
    nome: form.nome.replace(/\s+/g, ' ').trim(),
    telefone: form.telefone.replace(/\D/g, ''),
    observacoes: form.observacoes.trim() || null
  })

  if (!pedido) {
    return
  }

  abrirWhatsAppPedido(pedido)
  limpar()
  toast.success('Pedido confirmado com sucesso!')
  emit('concluido', pedido)
}
</script>
