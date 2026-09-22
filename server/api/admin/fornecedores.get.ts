import { requireAdmin } from '../../utils/requireAdmin'
import { mapearRespostaRpcListaFornecedores } from '~/utils/mapearRpcFornecedor'
import type { AdminFornecedor } from '~/types/fornecedor-admin'

function normalizarAtivo(valor: unknown): 'true' | 'false' | null {
  if (valor === 'true' || valor === true) {
    return 'true'
  }

  if (valor === 'false' || valor === false) {
    return 'false'
  }

  return null
}

export default defineEventHandler(async (event): Promise<AdminFornecedor[]> => {
  const { admin } = await requireAdmin(event)

  const query = getQuery(event)
  const busca =
    typeof query.busca === 'string' && query.busca.trim().length > 0 ? query.busca.trim() : null
  const ativo = normalizarAtivo(query.ativo)

  const { data, error } = await admin.rpc('admin_listar_fornecedores', {
    p_filtros: {
      busca: busca ?? null,
      ativo: ativo ?? null
    }
  })

  if (error) {
    console.error('[admin/fornecedores] erro ao listar fornecedores via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcListaFornecedores(data)

  if (!resposta) {
    console.error('[admin/fornecedores] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  return resposta.fornecedores
})
