export interface ClienteCriarPayload {
  nome: string
  sobrenome?: string | null
  telefone?: string | null
  dataNascimento?: string | null
}

export interface ClienteCriadoResposta {
  id: number
}

export interface ClienteMensagemErro {
  mensagem: string
}

export interface AdminCliente {
  id: number
  nome: string
  sobrenome: string | null
  telefone: string | null
  data_nascimento: string | null
  created_at: string
}
