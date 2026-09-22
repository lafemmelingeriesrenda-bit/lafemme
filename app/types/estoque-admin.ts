export type MovimentoEstoqueTipo =
  | 'entrada_compra'
  | 'saida_venda'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'estorno_compra'

export type MotivoAjustePositivo =
  | 'inventario'
  | 'correcao_cadastro'
  | 'devolucao_cliente'
  | 'retorno_promocao'
  | 'outro'

export type MotivoAjusteNegativo =
  | 'avaria'
  | 'brinde'
  | 'promocao'
  | 'perda'
  | 'uso_interno'
  | 'erro_inventario'
  | 'devolucao_fornecedor'
  | 'outro'

export type MotivoAjusteEstoque = MotivoAjustePositivo | MotivoAjusteNegativo

export type TipoAjusteEstoque = 'ajuste_positivo' | 'ajuste_negativo'

export interface AjusteEstoquePayload {
  nova_quantidade: number
  motivo: MotivoAjusteEstoque
  observacao?: string | null
  quantidade_esperada?: number | null
}

export interface AjusteEstoqueResultado {
  quantidade_anterior: number
  quantidade_nova: number
  diferenca: number
  tipo: TipoAjusteEstoque
  motivo: MotivoAjusteEstoque
}

export interface MovimentoEstoque {
  id: number
  produto_variante_id: number
  tipo: MovimentoEstoqueTipo
  quantidade: number
  compra_id: number | null
  item_compra_id: number | null
  pedido_id: number | null
  item_pedido_id: number | null
  motivo: string | null
  observacao: string | null
  created_at: string
}
