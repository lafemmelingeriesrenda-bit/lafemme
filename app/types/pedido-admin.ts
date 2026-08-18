export type StatusPedido =
  | 'aguardando_atendimento'
  | 'em_atendimento'
  | 'aguardando_pagamento'
  | 'pago'
  | 'enviado'
  | 'entregue'
  | 'cancelado'
  | 'finalizado'

export type StatusPedidoOperacional = 'aguardando_atendimento' | 'em_atendimento' | 'finalizado' | 'cancelado'

export interface AdminPedidoLista {
  id: number
  cliente_id: number | null
  status: StatusPedido
  subtotal: number
  frete: number
  total: number
  nome_cliente: string
  telefone_cliente: string
  observacoes: string | null
  created_at: string
  updated_at: string
  quantidade_itens: number
}

export interface AdminPedidoItem {
  id: number
  pedido_id: number
  produto_variante_id: number
  nome_produto: string
  cor: string | null
  tamanho: string
  sku: string | null
  foto: string | null
  quantidade: number
  valor_unitario: number
  subtotal: number
}

export interface AdminPedidoDetalhe {
  id: number
  cliente_id: number | null
  status: StatusPedido
  subtotal: number
  frete: number
  total: number
  nome_cliente: string
  telefone_cliente: string
  observacoes: string | null
  created_at: string
  updated_at: string
  itens: AdminPedidoItem[]
}

export interface FiltrosPedidosAdmin {
  status?: StatusPedido | null
  busca?: string | null
  dataInicio?: string | null
  dataFim?: string | null
}

export interface PedidoAcaoResultado {
  sucesso: boolean
  pedido?: { id: number; status: StatusPedido }
  statusCode?: number
  codigo?: string
  mensagem?: string
  erros?: Array<{ varianteId: number; nomeProduto: string; disponivel: number; solicitado: number }>
}