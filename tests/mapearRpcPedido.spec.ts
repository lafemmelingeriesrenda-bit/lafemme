import { describe, expect, it } from 'vitest'
import {
  mapearRespostaRpcAcaoPedido,
  mapearRespostaRpcListaPedidos,
  mapearRespostaRpcObterPedido
} from '../app/utils/mapearRpcPedido'

const pedidoLista = {
  id: 7,
  cliente_id: null,
  status: 'aguardando_atendimento',
  subtotal: 120,
  frete: 0,
  total: 120,
  nome_cliente: 'Ana Silva',
  telefone_cliente: '34999999999',
  observacoes: null,
  created_at: '2026-08-18T10:00:00Z',
  updated_at: '2026-08-18T10:00:00Z',
  quantidade_itens: 2
}

describe('mapearRespostaRpcListaPedidos', () => {
  it('mapeia lista válida de pedidos', () => {
    const resultado = mapearRespostaRpcListaPedidos({ ok: true, pedidos: [pedidoLista] })

    expect(resultado).toEqual({ ok: true, pedidos: [{ ...pedidoLista, cliente_id: null }] })
    expect(resultado?.pedidos[0].quantidade_itens).toBe(2)
  })

  it('retorna lista vazia quando o banco devolve array vazio', () => {
    expect(mapearRespostaRpcListaPedidos({ ok: true, pedidos: [] })).toEqual({ ok: true, pedidos: [] })
  })

  it('retorna null para resposta sem array de pedidos', () => {
    expect(mapearRespostaRpcListaPedidos({ ok: true })).toBeNull()
    expect(mapearRespostaRpcListaPedidos({ ok: false })).toBeNull()
    expect(mapearRespostaRpcListaPedidos(null)).toBeNull()
  })

  it('retorna null para pedido com status inválido', () => {
    expect(
      mapearRespostaRpcListaPedidos({ ok: true, pedidos: [{ ...pedidoLista, status: 'inexistente' }] })
    ).toBeNull()
  })
})

describe('mapearRespostaRpcObterPedido', () => {
  const pedidoDetalhe = {
    id: 7,
    cliente_id: null,
    status: 'aguardando_atendimento',
    subtotal: 120,
    frete: 0,
    total: 120,
    nome_cliente: 'Ana Silva',
    telefone_cliente: '34999999999',
    observacoes: null,
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T10:00:00Z'
  }

  const item = {
    id: 1,
    pedido_id: 7,
    produto_variante_id: 9,
    nome_produto: 'Vestido',
    cor: null,
    tamanho: 'M',
    sku: 'SKU-1',
    foto: null,
    quantidade: 1,
    valor_unitario: 120,
    subtotal: 120
  }

  it('mapeia pedido com itens', () => {
    const resultado = mapearRespostaRpcObterPedido({ ok: true, pedido: pedidoDetalhe, itens: [item] })

    expect(resultado?.ok).toBe(true)
    expect(resultado?.pedido.id).toBe(7)
    expect(resultado?.pedido.itens).toHaveLength(1)
    expect(resultado?.pedido.itens[0].produto_variante_id).toBe(9)
  })

  it('mapeia pedido sem itens como lista vazia', () => {
    const resultado = mapearRespostaRpcObterPedido({ ok: true, pedido: pedidoDetalhe })

    expect(resultado?.pedido.itens).toEqual([])
  })

  it('mapeia erro NAO_ENCONTRADO', () => {
    const resultado = mapearRespostaRpcObterPedido({
      ok: false,
      codigo: 'NAO_ENCONTRADO',
      erro: 'Pedido não encontrado.'
    })

    expect(resultado).toEqual({
      ok: false,
      codigo: 'NAO_ENCONTRADO',
      erro: 'Pedido não encontrado.'
    })
  })

  it('retorna null para código de erro desconhecido', () => {
    expect(mapearRespostaRpcObterPedido({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
  })

  it('retorna null para pedido com status inválido', () => {
    expect(mapearRespostaRpcObterPedido({ ok: true, pedido: { ...pedidoDetalhe, status: 'x' } })).toBeNull()
  })
})

describe('mapearRespostaRpcAcaoPedido', () => {
  it('mapeia sucesso com pedido', () => {
    expect(mapearRespostaRpcAcaoPedido({ ok: true, pedido: { id: 7, status: 'finalizado' } })).toEqual({
      ok: true,
      pedido: { id: 7, status: 'finalizado' }
    })
  })

  it('mapeia erro com lista de estoque insuficiente', () => {
    const resultado = mapearRespostaRpcAcaoPedido({
      ok: false,
      codigo: 'ESTOQUE_INSUFICIENTE',
      erro: 'Estoque insuficiente.',
      erros: [{ varianteId: 9, nomeProduto: 'Vestido', disponivel: 1, solicitado: 3 }]
    })

    expect(resultado).toEqual({
      ok: false,
      codigo: 'ESTOQUE_INSUFICIENTE',
      erro: 'Estoque insuficiente.',
      erros: [{ varianteId: 9, nomeProduto: 'Vestido', disponivel: 1, solicitado: 3 }]
    })
  })

  it('mapeia erro sem lista de erros', () => {
    expect(
      mapearRespostaRpcAcaoPedido({ ok: false, codigo: 'PEDIDO_JA_FINALIZADO', erro: 'Já finalizado.' })
    ).toEqual({ ok: false, codigo: 'PEDIDO_JA_FINALIZADO', erro: 'Já finalizado.' })
  })

  it('retorna null para sucesso sem pedido válido', () => {
    expect(mapearRespostaRpcAcaoPedido({ ok: true, pedido: { id: 'x' } })).toBeNull()
  })

  it('retorna null para código desconhecido', () => {
    expect(mapearRespostaRpcAcaoPedido({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
  })
})