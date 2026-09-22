import { requireAdmin } from '../../../../../utils/requireAdmin'
import { lancarErroRpcRascunhoProduto } from '../../../../../utils/produtosRascunho'
import { mapearRespostaRpcRascunhoProduto } from '~/utils/mapearRpcRascunhoProduto'

export default defineEventHandler(async (event) => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)
  const varianteId =
    typeof body === 'object' && body !== null
      ? (body as { variante_id?: unknown }).variante_id
      : undefined

  let data: unknown = null
  let error: { message: string } | null = null

  if (varianteId === null || varianteId === undefined) {
    const resultado = await admin.rpc('admin_desvincular_item_compra_variante', {
      p_item_id: id
    })

    data = resultado.data
    error = resultado.error
  } else if (typeof varianteId === 'number' && Number.isInteger(varianteId) && varianteId > 0) {
    const resultado = await admin.rpc('admin_vincular_item_compra_variante', {
      p_item_id: id,
      p_variante_id: varianteId
    })

    data = resultado.data
    error = resultado.error
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Variante inválida.' })
  }

  if (error) {
    console.error('[admin/compras] erro ao alterar vínculo do item via RPC:', error.message)
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

  return resposta.dados.item ?? null
})
