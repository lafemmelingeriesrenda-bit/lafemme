import type {
  CompraAdmin,
  CompraAtualizarPayload,
  CompraCriarPayload,
  CompraDetalhadaAdmin,
  FiltrosComprasAdmin,
  ProdutoRascunhoItemPayload,
  StatusCompra
} from '~/types/compra-admin'

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

function ehCompraDetalhada(dados: unknown): dados is CompraDetalhadaAdmin {
  return (
    typeof dados === 'object' &&
    dados !== null &&
    typeof (dados as CompraDetalhadaAdmin).id === 'number' &&
    Array.isArray((dados as CompraDetalhadaAdmin).itens)
  )
}

export function useComprasAdmin() {
  async function listarCompras(filtros: FiltrosComprasAdmin = {}): Promise<CompraAdmin[]> {
    const params = new URLSearchParams()

    if (filtros.busca) {
      params.set('busca', filtros.busca)
    }
    if (filtros.dataInicio) {
      params.set('dataInicio', filtros.dataInicio)
    }
    if (filtros.dataFim) {
      params.set('dataFim', filtros.dataFim)
    }
    if (typeof filtros.fornecedorId === 'number') {
      params.set('fornecedorId', String(filtros.fornecedorId))
    }
    if (filtros.tipo) {
      params.set('tipo', filtros.tipo)
    }
    if (filtros.categoria) {
      params.set('categoria', filtros.categoria)
    }
    if (filtros.status) {
      params.set('status', filtros.status)
    }
    if (filtros.statusPagamento) {
      params.set('statusPagamento', filtros.statusPagamento)
    }

    const query = params.toString()
    const resposta = await $fetch.raw<CompraAdmin[]>(
      `/api/admin/compras${query ? `?${query}` : ''}`,
      { ignoreResponseError: true }
    )

    if (resposta.status >= 200 && resposta.status < 300) {
      const dados = resposta._data

      if (Array.isArray(dados)) {
        return dados
      }

      throw new Error(MENSAGEM_FALHA)
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function obterCompra(id: number): Promise<CompraDetalhadaAdmin> {
    const resposta = await $fetch.raw<CompraDetalhadaAdmin>(`/api/admin/compras/${id}`, {
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehCompraDetalhada(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function criarCompra(payload: CompraCriarPayload): Promise<CompraDetalhadaAdmin> {
    const resposta = await $fetch.raw<CompraDetalhadaAdmin>('/api/admin/compras', {
      method: 'POST',
      body: payload,
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehCompraDetalhada(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function atualizarCompra(
    id: number,
    payload: CompraAtualizarPayload
  ): Promise<CompraDetalhadaAdmin> {
    const resposta = await $fetch.raw<CompraDetalhadaAdmin>(`/api/admin/compras/${id}`, {
      method: 'PATCH',
      body: payload,
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehCompraDetalhada(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function alterarStatusCompra(id: number, status: StatusCompra): Promise<CompraDetalhadaAdmin> {
    const resposta = await $fetch.raw<CompraDetalhadaAdmin>(`/api/admin/compras/${id}/status`, {
      method: 'PATCH',
      body: { status },
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehCompraDetalhada(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function vincularItemCompra(itemId: number, varianteId: number): Promise<void> {
    const resposta = await $fetch.raw(`/api/admin/compras/itens/${itemId}/vinculo`, {
      method: 'PATCH',
      body: { variante_id: varianteId },
      ignoreResponseError: true
    })

    if (resposta.status < 200 || resposta.status >= 300) {
      throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
    }
  }

  async function desvincularItemCompra(itemId: number): Promise<void> {
    const resposta = await $fetch.raw(`/api/admin/compras/itens/${itemId}/vinculo`, {
      method: 'PATCH',
      body: { variante_id: null },
      ignoreResponseError: true
    })

    if (resposta.status < 200 || resposta.status >= 300) {
      throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
    }
  }

  async function criarProdutoRascunhoItemCompra(
    itemId: number,
    payload: ProdutoRascunhoItemPayload
  ): Promise<void> {
    const resposta = await $fetch.raw(`/api/admin/compras/itens/${itemId}/criar-produto`, {
      method: 'POST',
      body: payload,
      ignoreResponseError: true
    })

    if (resposta.status < 200 || resposta.status >= 300) {
      throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
    }
  }

  async function confirmarRecebimentoCompra(id: number): Promise<{ total_unidades: number }> {
    const resposta = await $fetch.raw<{ total_unidades: number }>(`/api/admin/compras/${id}/receber`, {
      method: 'POST',
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && resposta._data) {
      return { total_unidades: Number(resposta._data.total_unidades ?? 0) }
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  return {
    listarCompras,
    obterCompra,
    criarCompra,
    atualizarCompra,
    alterarStatusCompra,
    vincularItemCompra,
    desvincularItemCompra,
    criarProdutoRascunhoItemCompra,
    confirmarRecebimentoCompra
  }
}
