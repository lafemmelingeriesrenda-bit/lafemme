import { requireAdmin } from '../../../../utils/requireAdmin'
import { lancarErroRpcRascunhoProduto } from '../../../../utils/produtosRascunho'
import { mapearRespostaRpcRascunhoProduto } from '~/utils/mapearRpcRascunhoProduto'

export default defineEventHandler(async (event) => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)
  const publicado =
    typeof body === 'object' && body !== null && typeof (body as { publicado?: unknown }).publicado === 'boolean'
      ? (body as { publicado: boolean }).publicado
      : null

  if (publicado === null) {
    throw createError({ statusCode: 400, statusMessage: 'Publicação inválida.' })
  }

  const { data, error } = await admin.rpc('admin_alterar_publicacao_produto', {
    p_id: id,
    p_publicado: publicado
  })

  if (error) {
    console.error('[admin/produtos] erro ao alterar publicação via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcRascunhoProduto(data)

  if (!resposta) {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    lancarErroRpcRascunhoProduto(resposta)
  }

  return resposta.dados.produto ?? null
})
