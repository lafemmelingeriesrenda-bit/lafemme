import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { ClientePayloadNormalizado } from '~/utils/clienteApi'

export type ResultadoInsercaoCliente =
  | { tipo: 'criado'; id: number }
  | { tipo: 'conflito' }
  | { tipo: 'erro' }

export async function inserirCliente(
  supabase: SupabaseClient<Database>,
  payload: ClientePayloadNormalizado
): Promise<ResultadoInsercaoCliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nome: payload.nome,
      sobrenome: payload.sobrenome,
      telefone: payload.telefone,
      telefone_normalizado: payload.telefoneNormalizado,
      data_nascimento: payload.dataNascimento
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { tipo: 'conflito' }
    }

    console.error('[clientes] erro ao inserir cliente:', error.message)
    return { tipo: 'erro' }
  }

  return { tipo: 'criado', id: data.id as number }
}
