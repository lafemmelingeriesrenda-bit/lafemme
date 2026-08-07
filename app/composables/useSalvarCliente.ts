import { useSupabaseClient } from '#imports'

export interface ClienteNovo {
  nome: string
  sobrenome?: string | null
  telefone: number | null
  dataNascimento?: string | null
}

export interface ClienteSalvo {
  id: number
}

export function useSalvarCliente() {
  const supabase = useSupabaseClient()

  async function salvar(payload: ClienteNovo): Promise<ClienteSalvo> {
    if (payload.telefone !== null) {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', payload.telefone)
        .maybeSingle()

      if (existente) {
        throw new Error(
          'Já existe um cliente cadastrado com esse telefone. Verifique os dados e tente novamente.'
        )
      }
    }

    const { data: cliente, error: erroCliente } = await supabase
      .from('clientes')
      .insert({
        nome: payload.nome,
        sobrenome: payload.sobrenome ?? null,
        telefone: payload.telefone,
        data_nascimento: payload.dataNascimento ?? null
      })
      .select('id')
      .single()

    if (erroCliente) {
      throw new Error(erroCliente.message)
    }
    if (!cliente) {
      throw new Error('O cliente não foi retornado após a gravação.')
    }

    return { id: cliente.id as number }
  }

  return { salvar }
}