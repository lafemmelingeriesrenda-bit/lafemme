export interface AdminFornecedor {
  id: number
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  observacao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface FornecedorCriarPayload {
  nome: string
  cnpj?: string | null
  telefone?: string | null
  email?: string | null
  contato?: string | null
  observacao?: string | null
}

export interface FornecedorAtualizarPayload extends FornecedorCriarPayload {
  ativo: boolean
}

export interface FiltrosFornecedoresAdmin {
  busca?: string | null
  ativo?: boolean | null
}

export type FiltroStatusFornecedor = 'todos' | 'ativos' | 'inativos'

export interface FornecedorCriadoResposta {
  id: number
}

export interface FornecedorMensagemErro {
  mensagem: string
}
