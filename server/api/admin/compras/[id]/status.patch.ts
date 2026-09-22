import { requireAdmin } from '../../../../utils/requireAdmin'
import { lancarErroRpcCompra } from '../../../../utils/compras'
import { mapearRespostaRpcCompra } from '~/utils/mapearRpcCompra'
import type { CompraDetalhadaAdmin } from '~/types/compra-admin'

function normalizarStatus(valor: unknown): 'recebida' | 'cancelada' | null {
  if (valor === 'recebida' || valor === 'cancelada') {
    return valor
  }

  return null
}

export default defineEventHandler(async (event): Promise<CompraDetalhadaAdmin> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)
  const status = normalizarStatus(
    typeof body === 'object' && body !== null ? (body as { status?: unknown }).status : null
  )

  if (!status) {
    throw createError({ statusCode: 400, statusMessage: 'Status de destino inválido.' })
  }

  const { data, error } = await admin.rpc('admin_alterar_status_compra', {
    p_id: id,
    p_status: status
  })

  if (error) {
    console.error('[admin/compras] erro ao alterar status via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcCompra(data)

  if (!resposta) {
    console.error('[admin/compras] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    lancarErroRpcCompra(resposta)
  }

  return resposta.compra
})
