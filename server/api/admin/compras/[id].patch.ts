import { requireAdmin } from '../../../utils/requireAdmin'
import { lancarErroRpcCompra } from '../../../utils/compras'
import { mapearRespostaRpcCompra } from '~/utils/mapearRpcCompra'
import type { Json } from '~/types/database.types'
import type { CompraDetalhadaAdmin } from '~/types/compra-admin'

export default defineEventHandler(async (event): Promise<CompraDetalhadaAdmin> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Payload de compra inválido.' })
  }

  const { data, error } = await admin.rpc('admin_atualizar_compra', {
    p_id: id,
    p_dados: body as unknown as Json
  })

  if (error) {
    console.error('[admin/compras] erro ao atualizar compra via RPC:', error.message)
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
