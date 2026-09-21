import { requireAdmin } from '../../../utils/requireAdmin'
import { mapearRespostaRpcAcaoPedido } from '~/utils/mapearRpcPedido'
import type { PedidoAcaoResultado } from '~/types/pedido-admin'

type StatusDestino = 'cancelado' | 'finalizado'

function normalizarStatusDestino(valor: unknown): StatusDestino | null {
  if (typeof valor !== 'string') {
    return null
  }

  if (valor === 'cancelado' || valor === 'finalizado') {
    return valor
  }

  return null
}

export default defineEventHandler(async (event): Promise<PedidoAcaoResultado> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)
  const status = normalizarStatusDestino(typeof body === 'object' && body !== null ? (body as { status?: unknown }).status : null)

  if (!status) {
    throw createError({ statusCode: 400, statusMessage: 'Status de destino inválido.' })
  }

  const { data, error } =
    status === 'finalizado'
      ? await admin.rpc('admin_finalizar_pedido', { p_id: id })
      : await admin.rpc('admin_atualizar_status_pedido', { p_id: id, p_status: status })

  if (error) {
    console.error('[admin/pedidos] erro ao alterar pedido via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcAcaoPedido(data)

  if (!resposta) {
    console.error('[admin/pedidos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    switch (resposta.codigo) {
      case 'NAO_ENCONTRADO':
        throw createError({ statusCode: 404, statusMessage: 'Pedido não encontrado.' })
      case 'PEDIDO_JA_FINALIZADO':
        throw createError({ statusCode: 409, statusMessage: 'Pedido já finalizado.' })
      case 'PEDIDO_CANCELADO':
        throw createError({ statusCode: 409, statusMessage: 'Pedido já cancelado.' })
      case 'ESTOQUE_INSUFICIENTE':
        throw createError({
          statusCode: 409,
          statusMessage: 'Estoque insuficiente para finalizar a venda.',
          data: resposta.erros ?? []
        })
      case 'TRANSICAO_INVALIDA':
      default:
        throw createError({ statusCode: 400, statusMessage: resposta.erro })
    }
  }

  return { sucesso: true, pedido: resposta.pedido }
})