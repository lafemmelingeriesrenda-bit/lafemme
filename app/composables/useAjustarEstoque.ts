import type { AjusteEstoquePayload, AjusteEstoqueResultado } from '~/types/estoque-admin'

const MENSAGEM_FALHA = 'Não foi possível ajustar o estoque. Tente novamente em instantes.'

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

function ehResultado(dados: unknown): dados is AjusteEstoqueResultado {
  return (
    typeof dados === 'object' &&
    dados !== null &&
    typeof (dados as AjusteEstoqueResultado).quantidade_nova === 'number' &&
    typeof (dados as AjusteEstoqueResultado).tipo === 'string'
  )
}

export function useAjustarEstoque() {
  async function ajustar(
    varianteId: number,
    payload: AjusteEstoquePayload
  ): Promise<AjusteEstoqueResultado> {
    const resposta = await $fetch.raw<AjusteEstoqueResultado>(
      `/api/admin/produtos/variantes/${varianteId}/ajustar-estoque`,
      { method: 'POST', body: payload, ignoreResponseError: true }
    )

    if (resposta.status >= 200 && resposta.status < 300 && ehResultado(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  return { ajustar }
}
