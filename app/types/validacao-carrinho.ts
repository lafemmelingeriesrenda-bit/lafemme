export interface VarianteValidacao {
  varianteId: number
  quantidade: number
}

export interface ValidacaoCarrinhoPayload {
  itens: VarianteValidacao[]
}

export interface ItemCarrinhoValidado {
  varianteId: number
  produtoId: number
  nome: string
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  foto: string | null
  sku: string | null
  disponivel: number
  subtotal: number
}

export type MotivoErroValidacaoCarrinho =
  | 'VARIANTE_NAO_ENCONTRADA'
  | 'VARIANTE_INATIVA'
  | 'ESTOQUE_INSUFICIENTE'
  | 'QUANTIDADE_INVALIDA'

export interface ErroValidacaoCarrinho {
  varianteId: number
  motivo: MotivoErroValidacaoCarrinho
  disponivel?: number
  solicitado?: number
}

export type RespostaValidacaoCarrinho =
  | { valido: true; itens: ItemCarrinhoValidado[]; subtotal: number }
  | { valido: false; erros: ErroValidacaoCarrinho[] }