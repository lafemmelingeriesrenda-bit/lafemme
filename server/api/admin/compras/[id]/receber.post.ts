import { requireAdmin } from '../../../../utils/requireAdmin'
import { lancarErroRpcRascunhoProduto } from '../../../../utils/produtosRascunho'
import { mapearRespostaRpcRascunhoProduto } from '~/utils/mapearRpcRascunhoProduto'

export default defineEventHandler(async (event) => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const { data, error } = await admin.rpc('admin_confirmar_recebimento_compra', {
    p_id: id
  })

  if (error) {
    console.error('[admin/compras] erro ao confirmar recebimento via RPC:', error.message)
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
    total_unidades: Number(resposta.dados.total_unidades ?? 0)
  }
})
