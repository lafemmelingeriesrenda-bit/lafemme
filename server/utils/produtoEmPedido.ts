import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * Verifica se alguma variante do produto já é referenciada em
 * itens_pedido (histórico de pedidos). Usado como pré-checagem
 * amigável antes do PATCH: a RPC guard continua sendo a proteção
 * definitiva no banco.
 */
export async function produtoEmPedido(admin: SupabaseClient<Database>, produtoId: number): Promise<boolean> {
  const consultaVariantes = await admin
    .from('produto_variante')
    .select('id')
    .eq('produto_id', produtoId)

  if (consultaVariantes.error) {
    throw consultaVariantes.error
  }

  const varianteIds = (consultaVariantes.data ?? []).map((variante) => variante.id)

  if (varianteIds.length === 0) {
    return false
  }

  const consultaItens = await admin
    .from('itens_pedido')
    .select('produto_variante_id')
    .in('produto_variante_id', varianteIds)
    .limit(1)

  if (consultaItens.error) {
    throw consultaItens.error
  }

  return (consultaItens.data?.length ?? 0) > 0
}