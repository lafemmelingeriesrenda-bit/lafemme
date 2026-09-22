import type {
  EvolucaoVendaMensal,
  PeriodoRelatorio,
  RelatorioVendas,
  ResumoVendas
} from '~/types/relatorio-financeiro'

export type CodigoErroRpcRelatorioVendas = 'DADOS_INVALIDOS' | 'ACESSO_NEGADO'

const CODIGOS_ERRO: CodigoErroRpcRelatorioVendas[] = ['DADOS_INVALIDOS', 'ACESSO_NEGADO']

export type RespostaRpcRelatorioVendas =
  | { ok: true; vendas: RelatorioVendas }
  | { ok: false; codigo: CodigoErroRpcRelatorioVendas; erro: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

function stringOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

function mapearResumo(bruto: unknown): ResumoVendas | null {
  if (!ehObjeto(bruto)) {
    return null
  }

  return {
    receita: numero(bruto.receita),
    quantidade_pedidos: numero(bruto.quantidade_pedidos),
    ticket_medio: numero(bruto.ticket_medio)
  }
}

function mapearEvolucao(bruto: Record<string, unknown>): EvolucaoVendaMensal | null {
  if (typeof bruto.mes !== 'string') {
    return null
  }

  return {
    mes: bruto.mes,
    receita: numero(bruto.receita),
    quantidade_pedidos: numero(bruto.quantidade_pedidos),
    ticket_medio: numero(bruto.ticket_medio)
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

export function mapearRespostaRpcRelatorioVendas(bruto: unknown): RespostaRpcRelatorioVendas | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: bruto.codigo as CodigoErroRpcRelatorioVendas,
      erro: stringOuNulo(bruto.erro) ?? 'Erro interno do servidor.'
    }
  }

  const resumo = mapearResumo(bruto.resumo)

  if (!resumo) {
    return null
  }

  const evolucao: EvolucaoVendaMensal[] = []

  if (!Array.isArray(bruto.evolucao_mensal)) {
    return null
  }

  for (const item of bruto.evolucao_mensal) {
    if (!ehObjeto(item)) {
      return null
    }

    const mapeado = mapearEvolucao(item)

    if (!mapeado) {
      return null
    }

    evolucao.push(mapeado)
  }

  return {
    ok: true,
    vendas: {
      periodo: mapearPeriodo(bruto.periodo),
      resumo,
      evolucao_mensal: evolucao
    }
  }
}
