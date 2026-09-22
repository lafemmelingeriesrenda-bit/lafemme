export type TipoCompra = 'mercadoria' | 'despesa'

export type StatusCompra = 'pendente' | 'recebida' | 'cancelada'

export type StatusPagamentoCompra = 'pendente' | 'pago'

export type CategoriaDespesa =
  | 'embalagem'
  | 'marketing'
  | 'logistica'
  | 'taxas'
  | 'materiais'
  | 'combustivel'
  | 'outros'

export interface ItemCompraAdmin {
  id: number
  produto_variante_id: number | null
  descricao: string
  cor: string | null
  tamanho: string | null
  quantidade: number
  valor_unitario: number
  subtotal: number
}

export interface CompraAdmin {
  id: number
  data_compra: string
  tipo: TipoCompra
  categoria: string | null
  descricao: string | null
  fornecedor_id: number | null
  fornecedor_nome: string | null
  subtotal: number
  frete: number
  desconto: number
  total: number
  status_pagamento: StatusPagamentoCompra
  status: StatusCompra
  vencimento: string | null
  pago_em: string | null
  recebida_em: string | null
  cancelada_em: string | null
  updated_at: string
  quantidade_itens: number
}

export interface FornecedorResumoCompra {
  id: number
  nome: string
}

export interface CompraDetalhadaAdmin {
  id: number
  fornecedor_id: number | null
  tipo: TipoCompra
  categoria: string | null
  descricao: string | null
  data_compra: string
  subtotal: number
  frete: number
  desconto: number
  total: number
  forma_pagamento: string | null
  status_pagamento: StatusPagamentoCompra
  vencimento: string | null
  pago_em: string | null
  status: StatusCompra
  recebida_em: string | null
  cancelada_em: string | null
  observacao: string | null
  comprovante_url: string | null
  created_at: string
  updated_at: string
  fornecedor: FornecedorResumoCompra | null
  itens: ItemCompraAdmin[]
}

export interface ItemCompraPayload {
  produto_variante_id?: number | null
  descricao: string
  cor?: string | null
  tamanho?: string | null
  quantidade: number
  valor_unitario: number
}

export interface CompraCriarPayload {
  tipo: TipoCompra
  fornecedor_id?: number | null
  categoria?: string | null
  descricao?: string | null
  data_compra?: string | null
  subtotal?: number | null
  frete?: number | null
  desconto?: number | null
  forma_pagamento?: string | null
  status_pagamento?: StatusPagamentoCompra | null
  vencimento?: string | null
  pago_em?: string | null
  observacao?: string | null
  comprovante_url?: string | null
  itens?: ItemCompraPayload[]
}

export type CompraAtualizarPayload = Partial<CompraCriarPayload>

export interface FiltrosComprasAdmin {
  busca?: string | null
  dataInicio?: string | null
  dataFim?: string | null
  fornecedorId?: number | null
  tipo?: TipoCompra | null
  categoria?: string | null
  status?: StatusCompra | null
  statusPagamento?: StatusPagamentoCompra | null
}

export interface ProdutoRascunhoItemPayload {
  nome: string
  descricao: null
  categoria: string | null
  capa: null
  variantes: Array<{
    id: null
    cor: string | null
    tamanho: string
    valor: number
    quantidade: number
    sku: null
    ativo: boolean
    imagens: string[]
  }>
}

export interface KpisCompras {
  total: number
  mercadorias: number
  despesas: number
  pago: number
  pendente: number
}
