import { requireAdmin } from '../../utils/requireAdmin'
import { mapearRespostaRpcListaPedidos } from '~/utils/mapearRpcPedido'
import type { AdminPedidoLista, FiltrosPedidosAdmin } from '~/types/pedido-admin'

function normalizarStatus(valor: unknown): FiltrosPedidosAdmin['status'] {
  if (typeof valor !== 'string' || valor.length === 0) {
    return null
  }

  const validos = [
    'aguardando_atendimento',
    'aguardando_pagamento',
    'pago',
    'enviado',
    'entregue',
    'cancelado',
    'finalizado'
  ]

  if (!(validos as string[]).includes(valor)) {
    return null
  }

  return valor as FiltrosPedidosAdmin['status']
}

function normalizarData(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.length === 0) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null
  }

  return valor
}

export default defineEventHandler(async (event): Promise<AdminPedidoLista[]> => {
  const { admin } = await requireAdmin(event)

  const query = getQuery(event)
  const filtros: FiltrosPedidosAdmin = {
    status: normalizarStatus(query.status),
    busca: typeof query.busca === 'string' && query.busca.trim().length > 0 ? query.busca.trim() : null,
    dataInicio: normalizarData(query.dataInicio),
    dataFim: normalizarData(query.dataFim)
  }

  if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
    throw createError({ statusCode: 400, statusMessage: 'A data inicial não pode ser posterior à data final.' })
  }

  const { data, error } = await admin.rpc('admin_listar_pedidos', {
    p_filtros: {
      status: filtros.status ?? null,
      busca: filtros.busca ?? null,
      dataInicio: filtros.dataInicio ?? null,
      dataFim: filtros.dataFim ?? null
    }
  })

  if (error) {
    console.error('[admin/pedidos] erro ao listar pedidos via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcListaPedidos(data)

  if (!resposta) {
    console.error('[admin/pedidos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  return resposta.pedidos
})