import { describe, expect, it } from 'vitest'
import { mapearRespostaRpcAjusteEstoque } from '../app/utils/mapearRpcAjusteEstoque'

describe('mapearRespostaRpcAjusteEstoque', () => {
  it('mapeia ajuste negativo', () => {
    const r = mapearRespostaRpcAjusteEstoque({
      ok: true,
      quantidade_anterior: 10,
      quantidade_nova: 8,
      diferenca: -2,
      tipo: 'ajuste_negativo',
      motivo: 'avaria'
    })

    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.resultado.quantidade_anterior).toBe(10)
      expect(r.resultado.quantidade_nova).toBe(8)
      expect(r.resultado.tipo).toBe('ajuste_negativo')
      expect(r.resultado.motivo).toBe('avaria')
    }
  })

  it('mapeia ajuste positivo', () => {
    const r = mapearRespostaRpcAjusteEstoque({
      ok: true,
      quantidade_anterior: 10,
      quantidade_nova: 13,
      diferenca: 3,
      tipo: 'ajuste_positivo',
      motivo: 'inventario'
    })
    expect(r?.ok).toBe(true)
  })

  it('mapeia erro de concorrência', () => {
    const r = mapearRespostaRpcAjusteEstoque({
      ok: false,
      codigo: 'ESTOQUE_ALTERADO',
      erro: 'O estoque desta variante foi alterado...'
    })
    expect(r).toEqual({
      ok: false,
      codigo: 'ESTOQUE_ALTERADO',
      erro: 'O estoque desta variante foi alterado...'
    })
  })

  it('mapeia erro de observação obrigatória', () => {
    const r = mapearRespostaRpcAjusteEstoque({
      ok: false,
      codigo: 'OBSERVACAO_OBRIGATORIA',
      erro: 'Para o motivo "Outro", informe uma observação.'
    })
    expect(r?.ok).toBe(false)
  })

  it('retorna null para tipo inválido no sucesso', () => {
    expect(
      mapearRespostaRpcAjusteEstoque({ ok: true, tipo: 'x', quantidade_nova: 1 })
    ).toBeNull()
  })

  it('retorna null para código desconhecido ou payload inválido', () => {
    expect(mapearRespostaRpcAjusteEstoque({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
    expect(mapearRespostaRpcAjusteEstoque(null)).toBeNull()
    expect(mapearRespostaRpcAjusteEstoque('texto')).toBeNull()
  })
})
