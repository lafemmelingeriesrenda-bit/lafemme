import type { ItemCarrinho } from '~/types/carrinho'
import type { ErroValidacaoCarrinho, ItemCarrinhoValidado } from '~/types/validacao-carrinho'
import { mensagemParaMotivo } from '~/utils/mensagemErroCarrinho'

interface RespostaApiValidar {
  valido?: boolean
  itens?: ItemCarrinhoValidado[]
  subtotal?: number
  erros?: ErroValidacaoCarrinho[]
  mensagem?: string
}

export interface ResultadoValidacaoCarrinho {
  valido: boolean
  mensagem: string | null
  erros: ErroValidacaoCarrinho[]
  itens: ItemCarrinhoValidado[]
}

const MENSAGEM_FALHA = 'Não foi possível validar a sacola. Tente novamente em instantes.'

function nomeItem(itens: ItemCarrinho[], varianteId: number): string {
  const item = itens.find((candidato) => candidato.varianteId === varianteId)

  if (!item) {
    return 'Um item da sacola'
  }

  const tamanho = item.tamanho ? ` (${item.tamanho})` : ''
  return `${item.nome}${tamanho}`
}

function montarMensagem(erros: ErroValidacaoCarrinho[], itens: ItemCarrinho[]): string {
  return erros
    .map((erro) => `${nomeItem(itens, erro.varianteId)}: ${mensagemParaMotivo(erro)}`)
    .join(' ')
}

/**
 * Revalida a sacola contra o estado atual do servidor antes de criar o pedido.
 * É apenas uma camada de UX: a RPC `criar_pedido` continua sendo a validação
 * definitiva no servidor/banco.
 */
export function useValidarCarrinho() {
  const carregando = ref(false)

  async function validar(itens: ItemCarrinho[]): Promise<ResultadoValidacaoCarrinho> {
    carregando.value = true

    try {
      const resposta = await $fetch.raw<RespostaApiValidar>('/api/carrinho/validar', {
        method: 'POST',
        body: {
          itens: itens.map((item) => ({
            varianteId: item.varianteId,
            quantidade: item.quantidade
          }))
        },
        ignoreResponseError: true
      })

      const dados = resposta._data

      if (resposta.status >= 200 && resposta.status < 300 && dados?.valido === true) {
        return {
          valido: true,
          mensagem: null,
          erros: [],
          itens: Array.isArray(dados.itens) ? dados.itens : []
        }
      }

      if (Array.isArray(dados?.erros) && dados.erros.length > 0) {
        return {
          valido: false,
          mensagem: montarMensagem(dados.erros, itens),
          erros: dados.erros,
          itens: []
        }
      }

      return {
        valido: false,
        mensagem: dados?.mensagem ?? MENSAGEM_FALHA,
        erros: [],
        itens: []
      }
    } catch (error) {
      console.error('[carrinho] erro ao validar a sacola:', error)
      return { valido: false, mensagem: MENSAGEM_FALHA, erros: [], itens: [] }
    } finally {
      carregando.value = false
    }
  }

  return { carregando, validar }
}
