import { requireAdmin } from '../../utils/requireAdmin'
import { lancarErroRpcCompra } from '../../utils/compras'
import { mapearRespostaRpcCompra } from '~/utils/mapearRpcCompra'
import type { Json } from '~/types/database.types'
import type { CompraDetalhadaAdmin } from '~/types/compra-admin'

export default defineEventHandler(async (event): Promise<CompraDetalhadaAdmin> => {
  const { admin } = await requireAdmin(event)

  const body: unknown = await readBody(event)

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Payload de compra inválido.' })
  }

  const { data, error } = await admin.rpc('admin_criar_compra', {
    p_dados: body as unknown as Json
  })

  if (error) {
    console.error('[admin/compras] erro ao criar compra via RPC:', error.message)
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

  setResponseStatus(event, 201)
  return resposta.compra
})
