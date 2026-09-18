import type { PayloadCriarPedido, PedidoCriado } from '~/types/pedido'
import type { ErroValidacaoCarrinho } from '~/types/validacao-carrinho'
import { mensagemParaMotivo } from '~/utils/mensagemErroCarrinho'

interface RespostaApiCriarPedido {
  sucesso: boolean
  pedido?: PedidoCriado
  mensagem?: string
  erros?: ErroValidacaoCarrinho[]
}

export function useCriarPedido() {
  const carregando = ref(false)
  const mensagemErro = ref<string | null>(null)
  const erros = ref<ErroValidacaoCarrinho[]>([])

  async function criarPedido(payload: PayloadCriarPedido): Promise<PedidoCriado | null> {
    carregando.value = true
    mensagemErro.value = null
    erros.value = []

    try {
      const resposta = await $fetch.raw<RespostaApiCriarPedido>('/api/pedidos', {
        method: 'POST',
        body: payload,
        ignoreResponseError: true
      })

      const dados = resposta._data

      if (resposta.status === 201 && dados?.sucesso && dados.pedido) {
        return dados.pedido
      }

      if (resposta.status === 409 && Array.isArray(dados?.erros) && dados.erros.length > 0) {
        erros.value = dados.erros
        mensagemErro.value = dados.erros.map(mensagemParaMotivo).join(' ')
        return null
      }

      if (resposta.status === 400) {
        mensagemErro.value =
          dados?.mensagem ?? 'Os dados do pedido são inválidos. Revise suas informações e tente novamente.'
        return null
      }

      mensagemErro.value =
        dados?.mensagem ?? 'Não foi possível finalizar o pedido. Tente novamente em instantes.'
      return null
    } catch (error) {
      console.error('[pedido] erro inesperado ao criar pedido:', error)
      mensagemErro.value = 'Algo deu errado ao finalizar o pedido. Tente novamente em instantes.'
      return null
    } finally {
      carregando.value = false
    }
  }

  return { carregando, mensagemErro, erros, criarPedido }
}
