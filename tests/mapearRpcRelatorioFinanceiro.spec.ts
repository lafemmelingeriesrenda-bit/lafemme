import { describe, expect, it } from 'vitest'
import { mapearRespostaRpcRelatorioFinanceiro } from '../app/utils/mapearRpcRelatorioFinanceiro'

const relatorioBruto = {
  ok: true,
  periodo: { dataInicio: '2026-09-01', dataFim: '2026-09-30' },
  resumo: {
    total: 500,
    mercadorias: 300,
    despesas: 200,
    pago: 100,
    pendente: 400,
    quantidade_compras: 3
  },
  despesas_por_categoria: [
    { categoria: 'marketing', total: 200, quantidade: 1, percentual: 100 }
  ],
  compras_por_fornecedor: [
    { fornecedor_id: 3, fornecedor_nome: 'Moda X', total: 300, quantidade_compras: 1, percentual: 60 },
    { fornecedor_id: null, fornecedor_nome: null, total: 200, quantidade_compras: 2, percentual: 40 }
  ],
  evolucao_mensal: [
    { mes: '2026-09', total: 500, mercadorias: 300, despesas: 200, pago: 100, pendente: 400 }
  ],
  pendencias: [
    {
      id: 7,
      tipo: 'despesa',
      categoria: 'marketing',
      descricao: 'Meta Ads',
      fornecedor_id: null,
      fornecedor_nome: null,
      total: 200,
      vencimento: null,
      status: 'pendente',
      status_pagamento: 'pendente'
    }
  ]
}

describe('mapearRespostaRpcRelatorioFinanceiro', () => {
  it('mapeia relatório completo', () => {
    const r = mapearRespostaRpcRelatorioFinanceiro(relatorioBruto)

    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.relatorio.resumo.total).toBe(500)
      expect(r.relatorio.resumo.quantidade_compras).toBe(3)
      expect(r.relatorio.despesas_por_categoria).toHaveLength(1)
      expect(r.relatorio.compras_por_fornecedor[1].fornecedor_nome).toBeNull()
      expect(r.relatorio.evolucao_mensal[0].mes).toBe('2026-09')
      expect(r.relatorio.pendencias[0].vencimento).toBeNull()
      expect(r.relatorio.periodo.dataInicio).toBe('2026-09-01')
    }
  })

  it('mapeia período sem dados', () => {
    const vazio = {
      ...relatorioBruto,
      resumo: { total: 0, mercadorias: 0, despesas: 0, pago: 0, pendente: 0, quantidade_compras: 0 },
      despesas_por_categoria: [],
      compras_por_fornecedor: [],
      evolucao_mensal: [],
      pendencias: []
    }

    const r = mapearRespostaRpcRelatorioFinanceiro(vazio)

    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.relatorio.resumo.total).toBe(0)
      expect(r.relatorio.evolucao_mensal).toEqual([])
      expect(r.relatorio.pendencias).toEqual([])
    }
  })

  it('retorna null para resposta inválida', () => {
    expect(mapearRespostaRpcRelatorioFinanceiro(null)).toBeNull()
    expect(mapearRespostaRpcRelatorioFinanceiro('texto')).toBeNull()
    expect(mapearRespostaRpcRelatorioFinanceiro({ ok: true })).toBeNull()
  })

  it('retorna null quando um item é inválido', () => {
    const invalido = {
      ...relatorioBruto,
      pendencias: [{ ...relatorioBruto.pendencias[0], tipo: 'x' }]
    }

    expect(mapearRespostaRpcRelatorioFinanceiro(invalido)).toBeNull()
  })

  it('mapeia erro conhecido', () => {
    const r = mapearRespostaRpcRelatorioFinanceiro({
      ok: false,
      codigo: 'ACESSO_NEGADO',
      erro: 'Acesso negado.'
    })

    expect(r).toEqual({ ok: false, codigo: 'ACESSO_NEGADO', erro: 'Acesso negado.' })
  })

  it('retorna null para código desconhecido', () => {
    expect(mapearRespostaRpcRelatorioFinanceiro({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
  })
})
