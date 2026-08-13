import type { PayloadCriarPedido, PedidoCriado } from '~/types/pedido'
import type { ErroValidacaoCarrinho } from '~/types/validacao-carrinho'

interface RespostaApiCriarPedido {
  sucesso: boolean
  pedido?: PedidoCriado
  mensagem?: string
  erros?: ErroValidacaoCarrinho[]
}

function mensagemParaMotivo(erro: ErroValidacaoCarrinho): string {
  switch (erro.motivo) {
    case 'ESTOQUE_INSUFICIENTE': {
      const disponivel = erro.disponivel ?? 0
      const solicitado = erro.solicitado ?? 0
      return `Estoque insuficiente: restam ${disponivel} unidade(s) e você pediu ${solicitado}.`
    }
    case 'VARIANTE_NAO_ENCONTRADA':
      return 'Um dos itens da sacola não está mais disponível.'
    case 'VARIANTE_INATIVA':
      return 'Um dos itens da sacola foi desativado.'
    case 'QUANTIDADE_INVALIDA':
      return 'A quantidade de um dos itens da sacola é inválida.'
    default:
      return 'Não foi possível finalizar o pedido. Tente novamente em instantes.'
  }
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
