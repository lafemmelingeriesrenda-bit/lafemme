import { requireAdmin } from '../../../../../utils/requireAdmin'
import { lancarErroRpcAjusteEstoque } from '../../../../../utils/estoqueAdmin'
import { mapearRespostaRpcAjusteEstoque } from '~/utils/mapearRpcAjusteEstoque'
import type { AjusteEstoqueResultado } from '~/types/estoque-admin'

function normalizarInteiroOpcional(valor: unknown): number | null | undefined {
  if (valor === null || valor === undefined) {
    return null
  }

  if (typeof valor === 'number' && Number.isInteger(valor)) {
    return valor
  }

  return undefined
}

export default defineEventHandler(async (event): Promise<AjusteEstoqueResultado> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Payload de ajuste inválido.' })
  }

  const registro = body as Record<string, unknown>
  const novaQuantidade = registro.nova_quantidade
  const motivo = registro.motivo
  const quantidadeEsperada = normalizarInteiroOpcional(registro.quantidade_esperada)

  if (typeof novaQuantidade !== 'number' || !Number.isInteger(novaQuantidade) || novaQuantidade < 0) {
    throw createError({ statusCode: 400, statusMessage: 'A nova quantidade deve ser um inteiro maior ou igual a zero.' })
  }

  if (typeof motivo !== 'string' || motivo.trim() === '') {
    throw createError({ statusCode: 400, statusMessage: 'Informe um motivo para o ajuste.' })
  }

  if (quantidadeEsperada === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Quantidade esperada inválida.' })
  }

  const observacao =
    typeof registro.observacao === 'string' && registro.observacao.trim() !== ''
      ? registro.observacao.trim()
      : null

  const { data, error } = await admin.rpc('admin_ajustar_estoque_variante', {
    p_variante_id: id,
    p_nova_quantidade: novaQuantidade,
    p_motivo: motivo.trim(),
    p_observacao: observacao,
    p_quantidade_esperada: quantidadeEsperada
  })

  if (error) {
    console.error('[admin/produtos] erro ao ajustar estoque via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcAjusteEstoque(data)

  if (!resposta) {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    lancarErroRpcAjusteEstoque(resposta)
  }

  return resposta.resultado
})
