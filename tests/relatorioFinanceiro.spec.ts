import { describe, expect, it } from 'vitest'
import {
  classificarVencimento,
  completarMeses,
  formatarMesLabel,
  formatarMoedaCompacta,
  nomeFornecedor,
  resolverPeriodo
} from '../app/utils/relatorioFinanceiro'
import type { EvolucaoMensalFinanceira } from '../app/types/relatorio-financeiro'

function mes(mes: string, total: number): EvolucaoMensalFinanceira {
  return { mes, total, mercadorias: total, despesas: 0, pago: 0, pendente: total }
}

describe('relatorioFinanceiro — resolverPeriodo', () => {
  const hoje = new Date(2026, 8, 21) // 2026-09-21 (mês 9)

  it('este mês', () => {
    expect(resolverPeriodo('mes-atual', hoje)).toEqual({ dataInicio: '2026-09-01', dataFim: '2026-09-21' })
  })

  it('mês anterior', () => {
    expect(resolverPeriodo('mes-anterior', hoje)).toEqual({ dataInicio: '2026-08-01', dataFim: '2026-08-31' })
  })

  it('últimos 3 meses', () => {
    expect(resolverPeriodo('ultimos-3', hoje)).toEqual({ dataInicio: '2026-07-01', dataFim: '2026-09-21' })
  })

  it('este ano', () => {
    expect(resolverPeriodo('ano-atual', hoje)).toEqual({ dataInicio: '2026-01-01', dataFim: '2026-09-21' })
  })

  it('personalizado não calcula', () => {
    expect(resolverPeriodo('personalizado', hoje)).toBeNull()
  })

  it('lida com virada de ano', () => {
    const janeiro = new Date(2026, 0, 15)
    expect(resolverPeriodo('mes-anterior', janeiro)).toEqual({ dataInicio: '2025-12-01', dataFim: '2025-12-31' })
    expect(resolverPeriodo('ultimos-3', janeiro)).toEqual({ dataInicio: '2025-11-01', dataFim: '2026-01-15' })
  })
})

describe('relatorioFinanceiro — classificarVencimento', () => {
  const hoje = '2026-09-21'

  it('classifica vencida, hoje, a vencer e sem vencimento', () => {
    expect(classificarVencimento('2026-09-20', hoje)).toBe('vencida')
    expect(classificarVencimento('2026-09-21', hoje)).toBe('hoje')
    expect(classificarVencimento('2026-09-22', hoje)).toBe('a_vencer')
    expect(classificarVencimento(null, hoje)).toBe('sem_vencimento')
  })
})

describe('relatorioFinanceiro — completarMeses', () => {
  it('preenche meses sem movimento com zero', () => {
    const resultado = completarMeses([mes('2026-08', 100)], '2026-07-01', '2026-09-30')

    expect(resultado.map((item) => item.mes)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(resultado[0].total).toBe(0)
    expect(resultado[1].total).toBe(100)
    expect(resultado[2].total).toBe(0)
  })

  it('atravessa a virada de ano', () => {
    const resultado = completarMeses([], '2025-11-01', '2026-02-28')
    expect(resultado.map((item) => item.mes)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('devolve a série original quando as datas são inválidas', () => {
    const serie = [mes('2026-08', 100)]
    expect(completarMeses(serie, '', '')).toBe(serie)
  })
})

describe('relatorioFinanceiro — formatação e labels', () => {
  it('formata mês', () => {
    expect(formatarMesLabel('2026-09')).toBe('set/2026')
    expect(formatarMesLabel('invalido')).toBe('invalido')
  })

  it('nomeia fornecedor ausente', () => {
    expect(nomeFornecedor(null)).toBe('Sem fornecedor')
    expect(nomeFornecedor('  ')).toBe('Sem fornecedor')
    expect(nomeFornecedor('Moda X')).toBe('Moda X')
  })

  it('formata moeda compacta', () => {
    expect(formatarMoedaCompacta(0)).toContain('R$')
    expect(formatarMoedaCompacta(1500)).toContain('R$')
  })
})
