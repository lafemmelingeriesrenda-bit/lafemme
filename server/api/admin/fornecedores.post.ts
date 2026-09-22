import { requireAdmin } from '../../utils/requireAdmin'
import { lancarErroRpcFornecedor } from '../../utils/fornecedores'
import { validarFornecedorPayload } from '~/utils/fornecedorAdmin'
import { mapearRespostaRpcFornecedor } from '~/utils/mapearRpcFornecedor'
import type { Json } from '~/types/database.types'
import type { AdminFornecedor } from '~/types/fornecedor-admin'

export default defineEventHandler(async (event): Promise<AdminFornecedor> => {
  const { admin } = await requireAdmin(event)

  const body: unknown = await readBody(event)
  const validado = validarFornecedorPayload(body)

  if (!validado.ok) {
    throw createError({ statusCode: 400, statusMessage: validado.erro })
  }

  const { data, error } = await admin.rpc('admin_criar_fornecedor', {
    p_dados: validado.payload as unknown as Json
  })

  if (error) {
    console.error('[admin/fornecedores] erro ao criar fornecedor via RPC:', error.message)
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

  setResponseStatus(event, 201)
  return resposta.fornecedor
})
