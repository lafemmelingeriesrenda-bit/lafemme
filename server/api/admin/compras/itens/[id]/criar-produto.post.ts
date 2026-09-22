import { requireAdmin } from '../../../../../utils/requireAdmin'
import { lancarErroRpcRascunhoProduto } from '../../../../../utils/produtosRascunho'
import { mapearRespostaRpcRascunhoProduto } from '~/utils/mapearRpcRascunhoProduto'
import type { Json } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Payload de produto inválido.' })
  }

  const { data, error } = await admin.rpc('admin_criar_produto_rascunho_item_compra', {
    p_item_id: id,
    p_dados: body as unknown as Json
  })

  if (error) {
    console.error('[admin/compras] erro ao criar produto rascunho via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcRascunhoProduto(data)

  if (!resposta) {
    console.error('[admin/compras] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    lancarErroRpcRascunhoProduto(resposta)
  }

  return {
    produto_id: Number(resposta.dados.produto_id ?? 0),
    variante_id: Number(resposta.dados.variante_id ?? 0)
  }
})
