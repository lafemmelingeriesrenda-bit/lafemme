import type { ErroValidacaoCarrinho, VarianteValidacao } from '~/types/validacao-carrinho'

export interface ItemPedidoCriado {
  produto_variante_id: number
  nome_produto: string
  cor: string | null
  tamanho: string
  sku: string | null
  foto: string | null
  produto_url: string | null
  quantidade: number
  valor_unitario: number
  subtotal: number
}

export interface PedidoCriado {
  id: number
  nome_cliente: string
  telefone_cliente: string
  observacoes: string | null
  status: string
  subtotal: number
  frete: number
  total: number
  itens: ItemPedidoCriado[]
}

export interface PayloadCriarPedido {
  itens: VarianteValidacao[]
  nome: string
  telefone: string
  observacoes?: string | null
}

export interface RespostaRpcCriarPedido {
  ok: boolean
  pedido?: PedidoCriado
  erros?: ErroValidacaoCarrinho[]
}

export type RespostaCriarPedido =
  | { sucesso: true; pedido: PedidoCriado }
  | { sucesso: false; erros: ErroValidacaoCarrinho[] }