import type { StatusCompra, StatusPagamentoCompra, TipoCompra } from '~/types/compra-admin'

export interface ResumoFinanceiro {
  total: number
  mercadorias: number
  despesas: number
  pago: number
  pendente: number
  quantidade_compras: number
}

export interface DespesaCategoriaResumo {
  categoria: string
  total: number
  quantidade: number
  percentual: number
}

export interface FornecedorFinanceiroResumo {
  fornecedor_id: number | null
  fornecedor_nome: string | null
  total: number
  quantidade_compras: number
  percentual: number
}

export interface EvolucaoMensalFinanceira {
  mes: string
  total: number
  mercadorias: number
  despesas: number
  pago: number
  pendente: number
}

export interface PendenciaFinanceira {
  id: number
  tipo: TipoCompra
  categoria: string | null
  descricao: string | null
  fornecedor_id: number | null
  fornecedor_nome: string | null
  total: number
  vencimento: string | null
  status: StatusCompra
  status_pagamento: StatusPagamentoCompra
}

export interface PeriodoRelatorio {
  dataInicio: string | null
  dataFim: string | null
}

export interface RelatorioFinanceiro {
  periodo: PeriodoRelatorio
  resumo: ResumoFinanceiro
  despesas_por_categoria: DespesaCategoriaResumo[]
  compras_por_fornecedor: FornecedorFinanceiroResumo[]
  evolucao_mensal: EvolucaoMensalFinanceira[]
  pendencias: PendenciaFinanceira[]
}

export interface FiltrosRelatorioFinanceiro {
  dataInicio?: string | null
  dataFim?: string | null
}

export interface ResumoVendas {
  receita: number
  quantidade_pedidos: number
  ticket_medio: number
}

export interface EvolucaoVendaMensal {
  mes: string
  receita: number
  quantidade_pedidos: number
  ticket_medio: number
}

export interface RelatorioVendas {
  periodo: PeriodoRelatorio
  resumo: ResumoVendas
  evolucao_mensal: EvolucaoVendaMensal[]
}

export interface RelatorioFinanceiroCompleto extends RelatorioFinanceiro {
  vendas: RelatorioVendas
}

export interface ComparacaoMensalReceitaGastos {
  mes: string
  receita: number
  mercadorias: number
  despesas: number
}

export type PresetPeriodo =
  | 'mes-atual'
  | 'mes-anterior'
  | 'ultimos-3'
  | 'ano-atual'
  | 'personalizado'

export type ClassificacaoVencimento = 'vencida' | 'hoje' | 'a_vencer' | 'sem_vencimento'
