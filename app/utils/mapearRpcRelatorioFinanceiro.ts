import { ehStatusCompra, ehStatusPagamentoCompra, ehTipoCompra } from '~/utils/compraAdmin'
import type {
  DespesaCategoriaResumo,
  EvolucaoMensalFinanceira,
  FornecedorFinanceiroResumo,
  PendenciaFinanceira,
  PeriodoRelatorio,
  RelatorioFinanceiro,
  ResumoFinanceiro
} from '~/types/relatorio-financeiro'

export type CodigoErroRpcRelatorioFinanceiro = 'DADOS_INVALIDOS' | 'ACESSO_NEGADO'

const CODIGOS_ERRO: CodigoErroRpcRelatorioFinanceiro[] = ['DADOS_INVALIDOS', 'ACESSO_NEGADO']

export type RespostaRpcRelatorioFinanceiro =
  | { ok: true; relatorio: RelatorioFinanceiro }
  | { ok: false; codigo: CodigoErroRpcRelatorioFinanceiro; erro: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

function stringOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

function mapearResumo(bruto: unknown): ResumoFinanceiro | null {
  if (!ehObjeto(bruto)) {
    return null
  }

  return {
    total: numero(bruto.total),
    mercadorias: numero(bruto.mercadorias),
    despesas: numero(bruto.despesas),
    pago: numero(bruto.pago),
    pendente: numero(bruto.pendente),
    quantidade_compras: numero(bruto.quantidade_compras)
  }
}

function mapearCategoria(bruto: Record<string, unknown>): DespesaCategoriaResumo | null {
  if (typeof bruto.categoria !== 'string') {
    return null
  }

  return {
    categoria: bruto.categoria,
    total: numero(bruto.total),
    quantidade: numero(bruto.quantidade),
    percentual: numero(bruto.percentual)
  }
}

function mapearFornecedor(bruto: Record<string, unknown>): FornecedorFinanceiroResumo | null {
  const fornecedorId = typeof bruto.fornecedor_id === 'number' ? bruto.fornecedor_id : null
  const fornecedorNome = stringOuNulo(bruto.fornecedor_nome)

  return {
    fornecedor_id: fornecedorId,
    fornecedor_nome: fornecedorNome,
    total: numero(bruto.total),
    quantidade_compras: numero(bruto.quantidade_compras),
    percentual: numero(bruto.percentual)
  }
}

function mapearEvolucao(bruto: Record<string, unknown>): EvolucaoMensalFinanceira | null {
  if (typeof bruto.mes !== 'string') {
    return null
  }

  return {
    mes: bruto.mes,
    total: numero(bruto.total),
    mercadorias: numero(bruto.mercadorias),
    despesas: numero(bruto.despesas),
    pago: numero(bruto.pago),
    pendente: numero(bruto.pendente)
  }
}

function mapearPendencia(bruto: Record<string, unknown>): PendenciaFinanceira | null {
  if (
    typeof bruto.id !== 'number' ||
    !ehTipoCompra(bruto.tipo) ||
    !ehStatusCompra(bruto.status) ||
    !ehStatusPagamentoCompra(bruto.status_pagamento)
  ) {
    return null
  }

  return {
    id: bruto.id,
    tipo: bruto.tipo,
    categoria: stringOuNulo(bruto.categoria),
    descricao: stringOuNulo(bruto.descricao),
    fornecedor_id: typeof bruto.fornecedor_id === 'number' ? bruto.fornecedor_id : null,
    fornecedor_nome: stringOuNulo(bruto.fornecedor_nome),
    total: numero(bruto.total),
    vencimento: stringOuNulo(bruto.vencimento),
    status: bruto.status,
    status_pagamento: bruto.status_pagamento
  }
}

function mapearPeriodo(bruto: unknown): PeriodoRelatorio {
  if (!ehObjeto(bruto)) {
    return { dataInicio: null, dataFim: null }
  }

  return {
    dataInicio: stringOuNulo(bruto.dataInicio),
    dataFim: stringOuNulo(bruto.dataFim)
  }
}

function mapearLista<T>(valor: unknown, mapeador: (item: Record<string, unknown>) => T | null): T[] | null {
  if (!Array.isArray(valor)) {
    return []
  }

  const lista: T[] = []

  for (const item of valor) {
    if (!ehObjeto(item)) {
      return null
    }

    const mapeado = mapeador(item)

    if (mapeado === null) {
      return null
    }

    lista.push(mapeado)
  }

  return lista
}

export function mapearRespostaRpcRelatorioFinanceiro(bruto: unknown): RespostaRpcRelatorioFinanceiro | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: bruto.codigo as CodigoErroRpcRelatorioFinanceiro,
      erro: stringOuNulo(bruto.erro) ?? 'Erro interno do servidor.'
    }
  }

  const resumo = mapearResumo(bruto.resumo)
  const categorias = mapearLista(bruto.despesas_por_categoria, mapearCategoria)
  const fornecedores = mapearLista(bruto.compras_por_fornecedor, mapearFornecedor)
  const evolucao = mapearLista(bruto.evolucao_mensal, mapearEvolucao)
  const pendencias = mapearLista(bruto.pendencias, mapearPendencia)

  if (!resumo || !categorias || !fornecedores || !evolucao || !pendencias) {
    return null
  }

  return {
    ok: true,
    relatorio: {
      periodo: mapearPeriodo(bruto.periodo),
      resumo,
      despesas_por_categoria: categorias,
      compras_por_fornecedor: fornecedores,
      evolucao_mensal: evolucao,
      pendencias
    }
  }
}
