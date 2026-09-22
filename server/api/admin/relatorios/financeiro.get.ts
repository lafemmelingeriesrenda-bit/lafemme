import { requireAdmin } from '../../../utils/requireAdmin'
import { mapearRespostaRpcRelatorioFinanceiro } from '~/utils/mapearRpcRelatorioFinanceiro'
import type { RelatorioFinanceiro } from '~/types/relatorio-financeiro'

function normalizarData(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null
  }

  return valor
}

export default defineEventHandler(async (event): Promise<RelatorioFinanceiro> => {
  const { admin } = await requireAdmin(event)

  const query = getQuery(event)
  const dataInicio = normalizarData(query.dataInicio)
  const dataFim = normalizarData(query.dataFim)

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw createError({ statusCode: 400, statusMessage: 'A data inicial não pode ser posterior à data final.' })
  }

  const { data, error } = await admin.rpc('admin_relatorio_financeiro_compras', {
    p_filtros: {
      dataInicio: dataInicio ?? null,
      dataFim: dataFim ?? null
    }
  })

  if (error) {
    console.error('[admin/relatorios] erro ao obter relatório financeiro via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcRelatorioFinanceiro(data)

  if (!resposta) {
    console.error('[admin/relatorios] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    const statusCode = resposta.codigo === 'ACESSO_NEGADO' ? 403 : 400
    throw createError({ statusCode, statusMessage: resposta.erro })
  }

  return resposta.relatorio
})
