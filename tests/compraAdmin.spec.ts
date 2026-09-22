import { describe, expect, it } from 'vitest'
import {
  calcularKpis,
  calcularSubtotalItem,
  calcularSubtotalItens,
  calcularTotalCompra,
  dataHojeLocal,
  formatarDataCompra,
  mensagemParaCodigoCompra,
  resumoCompra,
  transicaoStatusCompraValida,
  validarCompraPayload
} from '../app/utils/compraAdmin'
import type { CompraAdmin } from '../app/types/compra-admin'

function compra(over: Partial<CompraAdmin>): CompraAdmin {
  return {
    id: 1,
    data_compra: '2026-09-21',
    tipo: 'despesa',
    categoria: 'marketing',
    descricao: 'Marketing Meta',
    fornecedor_id: null,
    fornecedor_nome: null,
    subtotal: 100,
    frete: 0,
    desconto: 0,
    total: 100,
    status_pagamento: 'pendente',
    status: 'pendente',
    vencimento: null,
    pago_em: null,
    recebida_em: null,
    cancelada_em: null,
    updated_at: '2026-09-21T10:00:00Z',
    quantidade_itens: 0,
    ...over
  }
}

describe('compraAdmin — cálculos financeiros', () => {
  it('calcula subtotal do item', () => {
    expect(calcularSubtotalItem(3, 19.9)).toBe(59.7)
  })

  it('calcula subtotal da lista de itens', () => {
    expect(
      calcularSubtotalItens([
        { quantidade: 2, valor_unitario: 10 },
        { quantidade: 3, valor_unitario: 5.5 }
      ])
    ).toBe(36.5)
  })

  it('calcula total com frete e desconto', () => {
    expect(calcularTotalCompra(100, 10, 5)).toBe(105)
  })

  it('permite total zero quando desconto consome tudo', () => {
    expect(calcularTotalCompra(100, 0, 100)).toBe(0)
  })
})

describe('compraAdmin — validarCompraPayload', () => {
  it('aceita despesa válida', () => {
    expect(validarCompraPayload({ tipo: 'despesa', subtotal: 300, frete: 0, desconto: 0 })).toEqual({ ok: true })
  })

  it('rejeita despesa com valor negativo', () => {
    const r = validarCompraPayload({ tipo: 'despesa', subtotal: -1 })
    expect(r.ok).toBe(false)
  })

  it('rejeita mercadoria sem itens', () => {
    const r = validarCompraPayload({ tipo: 'mercadoria', itens: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erro).toContain('item')
    }
  })

  it('aceita mercadoria com itens válidos', () => {
    expect(
      validarCompraPayload({
        tipo: 'mercadoria',
        itens: [{ descricao: 'Vestido', quantidade: 2, valor_unitario: 50 }]
      })
    ).toEqual({ ok: true })
  })

  it('rejeita item com quantidade zero ou fracionária', () => {
    expect(
      validarCompraPayload({ tipo: 'mercadoria', itens: [{ descricao: 'X', quantidade: 0, valor_unitario: 10 }] }).ok
    ).toBe(false)
    expect(
      validarCompraPayload({ tipo: 'mercadoria', itens: [{ descricao: 'X', quantidade: 1.5, valor_unitario: 10 }] }).ok
    ).toBe(false)
  })

  it('rejeita item sem descrição e valor negativo', () => {
    expect(
      validarCompraPayload({ tipo: 'mercadoria', itens: [{ descricao: '  ', quantidade: 1, valor_unitario: 10 }] }).ok
    ).toBe(false)
    expect(
      validarCompraPayload({ tipo: 'mercadoria', itens: [{ descricao: 'X', quantidade: 1, valor_unitario: -1 }] }).ok
    ).toBe(false)
  })

  it('rejeita frete/desconto negativos', () => {
    expect(validarCompraPayload({ tipo: 'despesa', subtotal: 10, frete: -1 }).ok).toBe(false)
    expect(validarCompraPayload({ tipo: 'despesa', subtotal: 10, desconto: -1 }).ok).toBe(false)
  })

  it('rejeita desconto que deixa total negativo', () => {
    const r = validarCompraPayload({ tipo: 'despesa', subtotal: 100, desconto: 150 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erro).toContain('desconto')
    }
  })
})

describe('compraAdmin — KPIs', () => {
  it('soma total, mercadorias, despesas, pago e pendente', () => {
    const kpis = calcularKpis([
      compra({ id: 1, tipo: 'despesa', total: 100, status_pagamento: 'pendente' }),
      compra({ id: 2, tipo: 'mercadoria', total: 200, status_pagamento: 'pago' }),
      compra({ id: 3, tipo: 'mercadoria', total: 50, status_pagamento: 'pendente' })
    ])

    expect(kpis.total).toBe(350)
    expect(kpis.mercadorias).toBe(250)
    expect(kpis.despesas).toBe(100)
    expect(kpis.pago).toBe(200)
    expect(kpis.pendente).toBe(150)
  })

  it('ignora compras canceladas em todos os KPIs', () => {
    const kpis = calcularKpis([
      compra({ id: 1, tipo: 'despesa', total: 100, status_pagamento: 'pendente', status: 'cancelada' }),
      compra({ id: 2, tipo: 'mercadoria', total: 200, status_pagamento: 'pago', status: 'recebida' }),
      compra({ id: 3, tipo: 'mercadoria', total: 50, status_pagamento: 'pendente', status: 'pendente' })
    ])

    expect(kpis).toEqual({ total: 250, mercadorias: 250, despesas: 0, pago: 200, pendente: 50 })
  })

  it('retorna zeros para lista vazia', () => {
    expect(calcularKpis([])).toEqual({ total: 0, mercadorias: 0, despesas: 0, pago: 0, pendente: 0 })
  })
})

describe('compraAdmin — resumo', () => {
  it('combina categoria e descrição para despesa', () => {
    expect(resumoCompra(compra({ tipo: 'despesa', categoria: 'marketing', descricao: 'Meta Ads' }))).toBe('Marketing · Meta Ads')
  })

  it('usa apenas a descrição quando não há categoria', () => {
    expect(resumoCompra(compra({ tipo: 'despesa', categoria: null, descricao: 'Meta Ads' }))).toBe('Meta Ads')
  })

  it('usa a categoria quando despesa sem descrição', () => {
    expect(resumoCompra(compra({ tipo: 'despesa', descricao: null, categoria: 'logistica' }))).toBe('Logística')
  })

  it('mostra a quantidade de itens para mercadoria', () => {
    expect(resumoCompra(compra({ tipo: 'mercadoria', quantidade_itens: 1 }))).toBe('1 item')
    expect(resumoCompra(compra({ tipo: 'mercadoria', quantidade_itens: 3 }))).toBe('3 itens')
  })
})

describe('compraAdmin — transições de status', () => {
  it('permite pendente -> recebida e pendente -> cancelada', () => {
    expect(transicaoStatusCompraValida('pendente', 'recebida')).toBe(true)
    expect(transicaoStatusCompraValida('pendente', 'cancelada')).toBe(true)
  })

  it('bloqueia transições a partir de recebida/cancelada', () => {
    expect(transicaoStatusCompraValida('recebida', 'cancelada')).toBe(false)
    expect(transicaoStatusCompraValida('recebida', 'recebida')).toBe(false)
    expect(transicaoStatusCompraValida('cancelada', 'recebida')).toBe(false)
    expect(transicaoStatusCompraValida('cancelada', 'cancelada')).toBe(false)
  })
})

describe('compraAdmin — formatação e mensagens', () => {
  it('gera a data local (YYYY-MM-DD) sem deslocamento de UTC', () => {
    expect(dataHojeLocal(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21')
    expect(dataHojeLocal(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('formata data de compra', () => {
    expect(formatarDataCompra('2026-09-21')).toBe('21/09/2026')
    expect(formatarDataCompra(null)).toBe('—')
  })

  it('mapeia códigos de erro conhecidos', () => {
    expect(mensagemParaCodigoCompra('NAO_ENCONTRADO')).toContain('não encontrada')
    expect(mensagemParaCodigoCompra('COMPRA_JA_RECEBIDA')).toContain('recebida')
    expect(mensagemParaCodigoCompra('COMPRA_CANCELADA')).toContain('cancelada')
    expect(mensagemParaCodigoCompra('MERCADORIA_SEM_ITENS')).toContain('item')
  })

  it('usa mensagem genérica para código desconhecido', () => {
    expect(mensagemParaCodigoCompra('X')).toContain('Erro interno')
  })
})
