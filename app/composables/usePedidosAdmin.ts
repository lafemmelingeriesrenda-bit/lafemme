import { mensagemParaCodigo } from '~/utils/pedidoAdmin'
import type {
  AdminPedidoDetalhe,
  AdminPedidoLista,
  FiltrosPedidosAdmin,
  PedidoAcaoResultado,
  StatusPedido
} from '~/types/pedido-admin'

export interface ErroPedidoAdmin {
  statusCode: number
  mensagem: string
  erros?: Array<{ varianteId: number; nomeProduto: string; disponivel: number; solicitado: number }>
}

const MENSAGEM_FALHA = 'Não foi possível concluir a ação. Tente novamente em instantes.'

function extrairMensagem(dados: unknown, fallback: string): string {
  if (typeof dados === 'object' && dados !== null) {
    const registro = dados as Record<string, unknown>

    if (typeof registro.statusMessage === 'string') {
      return registro.statusMessage
    }

    if (typeof registro.message === 'string') {
      return registro.message
    }

    if (typeof registro.mensagem === 'string') {
      return registro.mensagem
    }
  }

  return fallback
}

function extrairErrosEstoque(dados: unknown): ErroPedidoAdmin['erros'] {
  if (typeof dados !== 'object' || dados === null) {
    return undefined
  }

  const registro = dados as Record<string, unknown>

  if (!Array.isArray(registro.data)) {
    return undefined
  }

  const erros: ErroPedidoAdmin['erros'] = []

  for (const item of registro.data) {
    if (typeof item !== 'object' || item === null) {
      continue
    }

    const bruto = item as Record<string, unknown>

    erros.push({
      varianteId: typeof bruto.varianteId === 'number' ? bruto.varianteId : 0,
      nomeProduto: typeof bruto.nomeProduto === 'string' ? bruto.nomeProduto : '',
      disponivel: typeof bruto.disponivel === 'number' ? bruto.disponivel : 0,
      solicitado: typeof bruto.solicitado === 'number' ? bruto.solicitado : 0
    })
  }

  return erros.length > 0 ? erros : undefined
}

export function usePedidosAdmin() {
  async function listarPedidos(filtros: FiltrosPedidosAdmin): Promise<AdminPedidoLista[]> {
    const params = new URLSearchParams()

    if (filtros.status) {
      params.set('status', filtros.status)
    }

    if (filtros.busca) {
      params.set('busca', filtros.busca)
    }

    if (filtros.dataInicio) {
      params.set('dataInicio', filtros.dataInicio)
    }

    if (filtros.dataFim) {
      params.set('dataFim', filtros.dataFim)
    }

    const query = params.toString()
    const resposta = await $fetch.raw<AdminPedidoLista[]>(`/api/admin/pedidos${query ? `?${query}` : ''}`, {
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300) {
      const dados = resposta._data

      if (Array.isArray(dados)) {
        return dados
      }

      throw new Error(MENSAGEM_FALHA)
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function obterPedido(id: number): Promise<AdminPedidoDetalhe> {
    const resposta = await $fetch.raw<AdminPedidoDetalhe>(`/api/admin/pedidos/${id}`, {
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300) {
      const dados = resposta._data

      if (dados && typeof dados.id === 'number') {
        return dados
      }

      throw new Error(MENSAGEM_FALHA)
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function atualizarStatus(id: number, status: StatusPedido): Promise<PedidoAcaoResultado> {
    const resposta = await $fetch.raw<PedidoAcaoResultado>(`/api/admin/pedidos/${id}`, {
      method: 'PATCH',
      body: { status },
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300) {
      const dados = resposta._data

      if (dados && dados.sucesso === true && dados.pedido) {
        return dados
      }

      throw new Error(MENSAGEM_FALHA)
    }

    const erros = extrairErrosEstoque(resposta._data)

    return {
      sucesso: false,
      statusCode: resposta.status,
      mensagem: extrairMensagem(resposta._data, mensagemParaCodigo('')),
      erros
    }
  }

  return { listarPedidos, obterPedido, atualizarStatus }
}