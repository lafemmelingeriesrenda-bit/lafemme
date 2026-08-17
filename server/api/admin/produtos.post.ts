import { requireAdmin } from '../../utils/requireAdmin'
import { validarProdutoPayload } from '~/utils/produtoAdmin'
import { mapearRespostaRpcProduto } from '~/utils/mapearRpcProduto'
import type { Json } from '~/types/database.types'
import type { AdminProdutoCriado } from '~/types/produto-admin'

export default defineEventHandler(async (event): Promise<AdminProdutoCriado> => {
  const { admin } = await requireAdmin(event)

  const body: unknown = await readBody(event)
  const supabaseUrl = useRuntimeConfig().public.supabase.url as string

  const validado = validarProdutoPayload(body, supabaseUrl)

  if (!validado.ok) {
    throw createError({ statusCode: 400, statusMessage: validado.erro })
  }

  const { data, error } = await admin.rpc('admin_criar_produto', {
    p_dados: validado.payload as unknown as Json
  })

  if (error) {
    console.error('[admin/produtos] erro ao criar produto via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcProduto(data)

  if (!resposta) {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }

  if (resposta.tipo !== 'criado_ou_atualizado') {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  return { id: resposta.id, variantes: resposta.variantes }
})