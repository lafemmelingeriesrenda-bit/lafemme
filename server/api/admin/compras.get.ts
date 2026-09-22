import { requireAdmin } from '../../utils/requireAdmin'
import { mapearRespostaRpcListaCompras } from '~/utils/mapearRpcCompra'
import { ehCategoriaDespesa, ehStatusCompra, ehStatusPagamentoCompra, ehTipoCompra } from '~/utils/compraAdmin'
import type { CompraAdmin } from '~/types/compra-admin'

function normalizarData(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null
  }

  return valor
}

function normalizarFornecedorId(valor: unknown): number | null {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return null
  }

  const numero = Number(valor)

  return Number.isInteger(numero) && numero > 0 ? numero : null
}

export default defineEventHandler(async (event): Promise<CompraAdmin[]> => {
  const { admin } = await requireAdmin(event)

  const query = getQuery(event)

  const busca = typeof query.busca === 'string' && query.busca.trim() !== '' ? query.busca.trim() : null
  const tipo = ehTipoCompra(query.tipo) ? query.tipo : null
  const categoria = ehCategoriaDespesa(query.categoria) ? query.categoria : null
  const status = ehStatusCompra(query.status) ? query.status : null
  const statusPagamento = ehStatusPagamentoCompra(query.statusPagamento) ? query.statusPagamento : null

  const { data, error } = await admin.rpc('admin_listar_compras', {
    p_filtros: {
      busca: busca ?? null,
      dataInicio: normalizarData(query.dataInicio) ?? null,
      dataFim: normalizarData(query.dataFim) ?? null,
      fornecedorId: normalizarFornecedorId(query.fornecedorId) ?? null,
      tipo: tipo ?? null,
      categoria: categoria ?? null,
      status: status ?? null,
      statusPagamento: statusPagamento ?? null
    }
  })

  if (error) {
    console.error('[admin/compras] erro ao listar compras via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcListaCompras(data)

  if (!resposta) {
    console.error('[admin/compras] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  return resposta.compras
})
