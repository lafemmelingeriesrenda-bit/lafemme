import { requireAdmin } from '../../../utils/requireAdmin'
import { removerArquivosStorage } from '../../../utils/adminProdutos'
import { mapearRespostaRpcProduto } from '~/utils/mapearRpcProduto'

export default defineEventHandler(async (event) => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const { data, error } = await admin.rpc('admin_excluir_produto', {
    p_id: id
  })

  if (error) {
    console.error('[admin/produtos] erro ao excluir produto via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcProduto(data)

  if (!resposta) {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    if (resposta.codigo === 'NAO_ENCONTRADO') {
      throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado.' })
    }
    if (resposta.codigo === 'PRODUTO_EM_PEDIDO') {
      throw createError({ statusCode: 409, statusMessage: resposta.erro })
    }
    throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }

  if (resposta.tipo !== 'excluido') {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const supabaseUrl = useRuntimeConfig().public.supabase.url as string
  await removerArquivosStorage(admin, resposta.fotos, supabaseUrl)

  return { sucesso: true as const }
})