import { requireAdmin } from '../../../utils/requireAdmin'
import { mapearRespostaRpcObterPedido } from '~/utils/mapearRpcPedido'
import type { AdminPedidoDetalhe } from '~/types/pedido-admin'

export default defineEventHandler(async (event): Promise<AdminPedidoDetalhe> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const { data, error } = await admin.rpc('admin_obter_pedido', {
    p_id: id
  })

  if (error) {
    console.error('[admin/pedidos] erro ao obter pedido via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcObterPedido(data)

  if (!resposta) {
    console.error('[admin/pedidos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    if (resposta.codigo === 'NAO_ENCONTRADO') {
      throw createError({ statusCode: 404, statusMessage: 'Pedido não encontrado.' })
    }
    throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }

  return resposta.pedido
})