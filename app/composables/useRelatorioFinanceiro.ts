import type { FiltrosRelatorioFinanceiro, RelatorioFinanceiroCompleto } from '~/types/relatorio-financeiro'

const MENSAGEM_FALHA = 'Não foi possível carregar o relatório. Tente novamente em instantes.'

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

function ehRelatorio(dados: unknown): dados is RelatorioFinanceiroCompleto {
  return (
    typeof dados === 'object' &&
    dados !== null &&
    typeof (dados as RelatorioFinanceiroCompleto).resumo === 'object' &&
    (dados as RelatorioFinanceiroCompleto).resumo !== null &&
    Array.isArray((dados as RelatorioFinanceiroCompleto).evolucao_mensal) &&
    typeof (dados as RelatorioFinanceiroCompleto).vendas === 'object' &&
    (dados as RelatorioFinanceiroCompleto).vendas !== null &&
    typeof (dados as RelatorioFinanceiroCompleto).vendas.resumo === 'object' &&
    Array.isArray((dados as RelatorioFinanceiroCompleto).vendas.evolucao_mensal)
  )
}

export function useRelatorioFinanceiro() {
  async function obterRelatorio(filtros: FiltrosRelatorioFinanceiro): Promise<RelatorioFinanceiroCompleto> {
    const params = new URLSearchParams()

    if (filtros.dataInicio) {
      params.set('dataInicio', filtros.dataInicio)
    }

    if (filtros.dataFim) {
      params.set('dataFim', filtros.dataFim)
    }

    const query = params.toString()
    const resposta = await $fetch.raw<RelatorioFinanceiroCompleto>(
      `/api/admin/relatorios/financeiro${query ? `?${query}` : ''}`,
      { ignoreResponseError: true }
    )

    if (resposta.status >= 200 && resposta.status < 300 && ehRelatorio(resposta._data)) {
      return resposta._data
    }

    throw new Error(extrairMensagem(resposta._data, MENSAGEM_FALHA))
  }

  return { obterRelatorio }
}
