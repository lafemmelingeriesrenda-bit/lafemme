import { requireAdmin } from '../../../utils/requireAdmin'
import { mapearRespostaRpcRelatorioFinanceiro } from '~/utils/mapearRpcRelatorioFinanceiro'
import { mapearRespostaRpcRelatorioVendas } from '~/utils/mapearRpcRelatorioVendas'
import type { RelatorioFinanceiroCompleto } from '~/types/relatorio-financeiro'

function normalizarData(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null
  }

  return valor
}

export default defineEventHandler(async (event): Promise<RelatorioFinanceiroCompleto> => {
  const { admin } = await requireAdmin(event)

  const query = getQuery(event)
  const dataInicio = normalizarData(query.dataInicio)
  const dataFim = normalizarData(query.dataFim)

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw createError({ statusCode: 400, statusMessage: 'A data inicial não pode ser posterior à data final.' })
  }

  const filtros = {
    dataInicio: dataInicio ?? null,
    dataFim: dataFim ?? null
  }

  const [comprasRpc, vendasRpc] = await Promise.all([
    admin.rpc('admin_relatorio_financeiro_compras', { p_filtros: filtros }),
    admin.rpc('admin_relatorio_vendas', { p_filtros: filtros })
  ])

  if (comprasRpc.error) {
    console.error('[admin/relatorios] erro na RPC financeira:', comprasRpc.error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (vendasRpc.error) {
    console.error('[admin/relatorios] erro na RPC de vendas:', vendasRpc.error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const compras = mapearRespostaRpcRelatorioFinanceiro(comprasRpc.data)

  if (!compras) {
    console.error('[admin/relatorios] resposta inesperada da RPC financeira:', JSON.stringify(comprasRpc.data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!compras.ok) {
    const statusCode = compras.codigo === 'ACESSO_NEGADO' ? 403 : 400
    throw createError({ statusCode, statusMessage: compras.erro })
  }

  const vendas = mapearRespostaRpcRelatorioVendas(vendasRpc.data)

  if (!vendas) {
    console.error('[admin/relatorios] resposta inesperada da RPC de vendas:', JSON.stringify(vendasRpc.data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!vendas.ok) {
    const statusCode = vendas.codigo === 'ACESSO_NEGADO' ? 403 : 400
    throw createError({ statusCode, statusMessage: vendas.erro })
  }

  return {
    ...compras.relatorio,
    vendas: vendas.vendas
  }
})
