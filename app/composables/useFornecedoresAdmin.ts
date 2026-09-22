import type {
  AdminFornecedor,
  FiltrosFornecedoresAdmin,
  FornecedorAtualizarPayload,
  FornecedorCriarPayload
} from '~/types/fornecedor-admin'

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

function ehFornecedor(dados: unknown): dados is AdminFornecedor {
  return (
    typeof dados === 'object' &&
    dados !== null &&
    typeof (dados as AdminFornecedor).id === 'number' &&
    typeof (dados as AdminFornecedor).nome === 'string'
  )
}

export function useFornecedoresAdmin() {
  async function listarFornecedores(filtros: FiltrosFornecedoresAdmin = {}): Promise<AdminFornecedor[]> {
    const params = new URLSearchParams()

    if (filtros.busca) {
      params.set('busca', filtros.busca)
    }

    if (typeof filtros.ativo === 'boolean') {
      params.set('ativo', String(filtros.ativo))
    }

    const query = params.toString()
    const resposta = await $fetch.raw<AdminFornecedor[]>(
      `/api/admin/fornecedores${query ? `?${query}` : ''}`,
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

  async function obterFornecedor(id: number): Promise<AdminFornecedor> {
    const resposta = await $fetch.raw<AdminFornecedor>(`/api/admin/fornecedores/${id}`, {
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehFornecedor(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function criarFornecedor(payload: FornecedorCriarPayload): Promise<AdminFornecedor> {
    const resposta = await $fetch.raw<AdminFornecedor>('/api/admin/fornecedores', {
      method: 'POST',
      body: payload,
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehFornecedor(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function atualizarFornecedor(
    id: number,
    payload: FornecedorAtualizarPayload
  ): Promise<AdminFornecedor> {
    const resposta = await $fetch.raw<AdminFornecedor>(`/api/admin/fornecedores/${id}`, {
      method: 'PATCH',
      body: payload,
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehFornecedor(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  async function alterarStatusFornecedor(id: number, ativo: boolean): Promise<AdminFornecedor> {
    const resposta = await $fetch.raw<AdminFornecedor>(`/api/admin/fornecedores/${id}`, {
      method: 'PATCH',
      body: { ativo },
      ignoreResponseError: true
    })

    if (resposta.status >= 200 && resposta.status < 300 && ehFornecedor(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  return {
    listarFornecedores,
    obterFornecedor,
    criarFornecedor,
    atualizarFornecedor,
    alterarStatusFornecedor
  }
}
