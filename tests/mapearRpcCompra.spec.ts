import { describe, expect, it } from 'vitest'
import {
  mapearRespostaRpcCompra,
  mapearRespostaRpcListaCompras
} from '../app/utils/mapearRpcCompra'

const compraLista = {
  id: 7,
  data_compra: '2026-09-21',
  tipo: 'mercadoria',
  categoria: null,
  descricao: null,
  fornecedor_id: 3,
  fornecedor_nome: 'Moda Íntima Ltda',
  subtotal: 100,
  frete: 10,
  desconto: 5,
  total: 105,
  status_pagamento: 'pendente',
  status: 'pendente',
  vencimento: null,
  pago_em: null,
  recebida_em: null,
  cancelada_em: null,
  updated_at: '2026-09-21T10:00:00Z',
  quantidade_itens: 2
}

const compraDetalhe = {
  id: 7,
  fornecedor_id: 3,
  tipo: 'mercadoria',
  categoria: null,
  descricao: null,
  data_compra: '2026-09-21',
  subtotal: 100,
  frete: 10,
  desconto: 5,
  total: 105,
  forma_pagamento: 'pix',
  status_pagamento: 'pendente',
  vencimento: null,
  pago_em: null,
  status: 'pendente',
  recebida_em: null,
  cancelada_em: null,
  observacao: null,
  comprovante_url: null,
  created_at: '2026-09-21T10:00:00Z',
  updated_at: '2026-09-21T10:00:00Z',
  fornecedor: { id: 3, nome: 'Moda Íntima Ltda' },
  itens: [
    {
      id: 1,
      produto_variante_id: 9,
      descricao: 'Vestido',
      cor: 'Preto',
      tamanho: 'M',
      quantidade: 2,
      valor_unitario: 50,
      subtotal: 100
    }
  ]
}

describe('mapearRespostaRpcListaCompras', () => {
  it('mapeia lista válida', () => {
    const r = mapearRespostaRpcListaCompras({ ok: true, compras: [compraLista] })
    expect(r?.compras).toHaveLength(1)
    expect(r?.compras[0].fornecedor_nome).toBe('Moda Íntima Ltda')
    expect(r?.compras[0].quantidade_itens).toBe(2)
  })

  it('mapeia lista vazia', () => {
    expect(mapearRespostaRpcListaCompras({ ok: true, compras: [] })).toEqual({ ok: true, compras: [] })
  })

  it('retorna null para resposta inválida', () => {
    expect(mapearRespostaRpcListaCompras({ ok: true })).toBeNull()
    expect(mapearRespostaRpcListaCompras({ ok: false })).toBeNull()
    expect(mapearRespostaRpcListaCompras(null)).toBeNull()
  })

  it('retorna null para compra com tipo/status inválidos', () => {
    expect(
      mapearRespostaRpcListaCompras({ ok: true, compras: [{ ...compraLista, tipo: 'x' }] })
    ).toBeNull()
    expect(
      mapearRespostaRpcListaCompras({ ok: true, compras: [{ ...compraLista, status: 'x' }] })
    ).toBeNull()
  })
})

describe('mapearRespostaRpcCompra', () => {
  it('mapeia detalhe com fornecedor e itens', () => {
    const r = mapearRespostaRpcCompra({ ok: true, compra: compraDetalhe })
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.compra.fornecedor?.nome).toBe('Moda Íntima Ltda')
      expect(r.compra.itens).toHaveLength(1)
      expect(r.compra.itens[0].produto_variante_id).toBe(9)
    }
  })

  it('mapeia detalhe sem fornecedor', () => {
    const r = mapearRespostaRpcCompra({
      ok: true,
      compra: { ...compraDetalhe, fornecedor_id: null, fornecedor: null, itens: [] }
    })
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.compra.fornecedor).toBeNull()
      expect(r.compra.itens).toEqual([])
    }
  })

  it('mapeia erro NAO_ENCONTRADO', () => {
    const r = mapearRespostaRpcCompra({ ok: false, codigo: 'NAO_ENCONTRADO', erro: 'Compra não encontrada.' })
    expect(r).toEqual({ ok: false, codigo: 'NAO_ENCONTRADO', erro: 'Compra não encontrada.' })
  })

  it('mapeia erro de validação', () => {
    const r = mapearRespostaRpcCompra({
      ok: false,
      codigo: 'MERCADORIA_SEM_ITENS',
      erro: 'Informe ao menos um item de mercadoria.'
    })
    expect(r?.ok).toBe(false)
    if (r && !r.ok) {
      expect(r.codigo).toBe('MERCADORIA_SEM_ITENS')
    }
  })

  it('mapeia erro de transição', () => {
    const r = mapearRespostaRpcCompra({
      ok: false,
      codigo: 'TRANSICAO_INVALIDA',
      erro: 'Transição de status inválida.'
    })
    expect(r?.ok).toBe(false)
  })

  it('retorna null para código desconhecido ou payload inválido', () => {
    expect(mapearRespostaRpcCompra({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
    expect(mapearRespostaRpcCompra({ ok: true, compra: { id: 'x' } })).toBeNull()
    expect(mapearRespostaRpcCompra(null)).toBeNull()
  })
})
