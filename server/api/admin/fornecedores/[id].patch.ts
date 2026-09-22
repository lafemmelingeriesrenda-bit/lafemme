import { requireAdmin } from '../../../utils/requireAdmin'
import { lancarErroRpcFornecedor } from '../../../utils/fornecedores'
import { validarFornecedorPayload } from '~/utils/fornecedorAdmin'
import { mapearRespostaRpcFornecedor } from '~/utils/mapearRpcFornecedor'
import type { Json } from '~/types/database.types'
import type { AdminFornecedor } from '~/types/fornecedor-admin'

export default defineEventHandler(async (event): Promise<AdminFornecedor> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Payload de fornecedor inválido.' })
  }

  const registro = body as Record<string, unknown>
  const ativo = typeof registro.ativo === 'boolean' ? registro.ativo : undefined

  let data: unknown = null
  let error: { message: string } | null = null

  if (typeof registro.nome === 'string') {
    const validado = validarFornecedorPayload(registro)

    if (!validado.ok) {
      throw createError({ statusCode: 400, statusMessage: validado.erro })
    }

    const p_dados = {
      ...validado.payload,
      ...(typeof ativo === 'boolean' ? { ativo } : {})
    }

    const resultado = await admin.rpc('admin_atualizar_fornecedor', {
      p_id: id,
      p_dados: p_dados as unknown as Json
    })

    data = resultado.data
    error = resultado.error
  } else if (typeof ativo === 'boolean') {
    const resultado = await admin.rpc('admin_alterar_status_fornecedor', {
      p_id: id,
      p_ativo: ativo
    })

    data = resultado.data
    error = resultado.error
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Payload de fornecedor inválido.' })
  }

  if (error) {
    console.error('[admin/fornecedores] erro ao atualizar fornecedor via RPC:', error.message)
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
