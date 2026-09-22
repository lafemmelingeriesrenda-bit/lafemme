import { describe, expect, it } from 'vitest'
import { mapearRespostaRpcRelatorioVendas } from '../app/utils/mapearRpcRelatorioVendas'

const vendasBruto = {
  ok: true,
  periodo: { dataInicio: '2026-09-01', dataFim: '2026-09-30' },
  resumo: { receita: 900, quantidade_pedidos: 3, ticket_medio: 300 },
  evolucao_mensal: [
    { mes: '2026-09', receita: 900, quantidade_pedidos: 3, ticket_medio: 300 }
  ]
}

describe('mapearRespostaRpcRelatorioVendas', () => {
  it('mapeia resposta com vendas', () => {
    const r = mapearRespostaRpcRelatorioVendas(vendasBruto)

    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.vendas.resumo.receita).toBe(900)
      expect(r.vendas.resumo.quantidade_pedidos).toBe(3)
      expect(r.vendas.resumo.ticket_medio).toBe(300)
      expect(r.vendas.evolucao_mensal[0].mes).toBe('2026-09')
      expect(r.vendas.periodo.dataInicio).toBe('2026-09-01')
    }
  })

  it('mapeia resposta sem vendas (tudo zero)', () => {
    const vazio = {
      ok: true,
      periodo: { dataInicio: null, dataFim: null },
      resumo: { receita: 0, quantidade_pedidos: 0, ticket_medio: 0 },
      evolucao_mensal: []
    }

    const r = mapearRespostaRpcRelatorioVendas(vazio)

    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.vendas.resumo).toEqual({ receita: 0, quantidade_pedidos: 0, ticket_medio: 0 })
      expect(r.vendas.evolucao_mensal).toEqual([])
      expect(r.vendas.periodo.dataInicio).toBeNull()
    }
  })

  it('retorna null para resposta inválida', () => {
    expect(mapearRespostaRpcRelatorioVendas(null)).toBeNull()
    expect(mapearRespostaRpcRelatorioVendas('texto')).toBeNull()
    expect(mapearRespostaRpcRelatorioVendas({ ok: true })).toBeNull()
    expect(
      mapearRespostaRpcRelatorioVendas({ ...vendasBruto, evolucao_mensal: 'x' })
    ).toBeNull()
  })

  it('retorna null quando um mês é inválido', () => {
    expect(
      mapearRespostaRpcRelatorioVendas({
        ...vendasBruto,
        evolucao_mensal: [{ receita: 1, quantidade_pedidos: 1, ticket_medio: 1 }]
      })
    ).toBeNull()
  })

  it('mapeia erro conhecido', () => {
    const r = mapearRespostaRpcRelatorioVendas({ ok: false, codigo: 'ACESSO_NEGADO', erro: 'Acesso negado.' })
    expect(r).toEqual({ ok: false, codigo: 'ACESSO_NEGADO', erro: 'Acesso negado.' })
  })

  it('retorna null para código desconhecido', () => {
    expect(mapearRespostaRpcRelatorioVendas({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
  })
})
