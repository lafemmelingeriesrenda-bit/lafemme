import { requireAdmin } from '../../../utils/requireAdmin'
import { lancarErroRpcFornecedor } from '../../../utils/fornecedores'
import { mapearRespostaRpcFornecedor } from '~/utils/mapearRpcFornecedor'
import type { AdminFornecedor } from '~/types/fornecedor-admin'

export default defineEventHandler(async (event): Promise<AdminFornecedor> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const { data, error } = await admin.rpc('admin_obter_fornecedor', {
    p_id: id
  })

  if (error) {
    console.error('[admin/fornecedores] erro ao obter fornecedor via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcFornecedor(data)

  if (!resposta) {
    console.error('[admin/fornecedores] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    lancarErroRpcFornecedor(resposta)
  }

  return resposta.fornecedor
})
