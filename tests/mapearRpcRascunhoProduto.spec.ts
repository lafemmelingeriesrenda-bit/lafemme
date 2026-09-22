import { describe, expect, it } from 'vitest'
import { mapearRespostaRpcRascunhoProduto } from '../app/utils/mapearRpcRascunhoProduto'

describe('mapearRespostaRpcRascunhoProduto', () => {
  it('mapeia sucesso com dados', () => {
    const r = mapearRespostaRpcRascunhoProduto({ ok: true, produto_id: 10, variante_id: 20 })
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.dados.produto_id).toBe(10)
      expect(r.dados.variante_id).toBe(20)
    }
  })

  it('mapeia sucesso de vínculo', () => {
    const r = mapearRespostaRpcRascunhoProduto({ ok: true, item: { id: 1, produto_variante_id: 9 } })
    expect(r?.ok).toBe(true)
  })

  it('mapeia erro conhecido', () => {
    const r = mapearRespostaRpcRascunhoProduto({
      ok: false,
      codigo: 'ITEM_NAO_ENCONTRADO',
      erro: 'Item de compra não encontrado.'
    })
    expect(r).toEqual({ ok: false, codigo: 'ITEM_NAO_ENCONTRADO', erro: 'Item de compra não encontrado.' })
  })

  it('mapeia erro de compra cancelada', () => {
    const r = mapearRespostaRpcRascunhoProduto({
      ok: false,
      codigo: 'COMPRA_CANCELADA',
      erro: 'Compra cancelada não pode ser alterada.'
    })
    expect(r?.ok).toBe(false)
    if (r && !r.ok) {
      expect(r.codigo).toBe('COMPRA_CANCELADA')
    }
  })

  it('retorna null para código desconhecido', () => {
    expect(mapearRespostaRpcRascunhoProduto({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
  })

  it('retorna null para payload inválido', () => {
    expect(mapearRespostaRpcRascunhoProduto(null)).toBeNull()
    expect(mapearRespostaRpcRascunhoProduto('texto')).toBeNull()
    expect(mapearRespostaRpcRascunhoProduto({ codigo: 'X' })).toBeNull()
  })
})
