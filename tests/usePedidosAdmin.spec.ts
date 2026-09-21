import { beforeEach, describe, expect, it, vi } from 'vitest'

const rawMock = vi.fn()
vi.stubGlobal('$fetch', { raw: rawMock })

import { usePedidosAdmin } from '../app/composables/usePedidosAdmin'
import type { AdminPedidoDetalhe, AdminPedidoLista } from '../app/types/pedido-admin'

const pedidoLista: AdminPedidoLista = {
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

const pedidoDetalhe: AdminPedidoDetalhe = {
  ...pedidoLista,
  status: 'aguardando_atendimento',
  itens: [
    {
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
  ]
}

function respostaDe(status: number, dados: unknown) {
  return { status, _data: dados }
}

describe('usePedidosAdmin', () => {
  beforeEach(() => {
    rawMock.mockReset()
  })

  it('listarPedidos monta query com filtros e retorna a lista', async () => {
    rawMock.mockResolvedValue(respostaDe(200, [pedidoLista]))

    const { listarPedidos } = usePedidosAdmin()
    const pedidos = await listarPedidos({ status: 'aguardando_atendimento', busca: 'ana' })

    expect(rawMock).toHaveBeenCalledWith(
      '/api/admin/pedidos?status=aguardando_atendimento&busca=ana',
      expect.objectContaining({ ignoreResponseError: true })
    )
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].id).toBe(7)
  })

  it('listarPedidos chama endpoint sem query quando não há filtros', async () => {
    rawMock.mockResolvedValue(respostaDe(200, []))

    const { listarPedidos } = usePedidosAdmin()
    await listarPedidos({})

    expect(rawMock).toHaveBeenCalledWith('/api/admin/pedidos', expect.any(Object))
  })

  it('listarPedidos lança erro amigável quando a resposta não é array', async () => {
    rawMock.mockResolvedValue(respostaDe(200, { ok: true }))

    const { listarPedidos } = usePedidosAdmin()

    await expect(listarPedidos({})).rejects.toThrow('Não foi possível concluir a ação')
  })

  it('listarPedidos usa a mensagem do servidor em erro', async () => {
    rawMock.mockResolvedValue(respostaDe(400, { statusMessage: 'Data inicial inválida.' }))

    const { listarPedidos } = usePedidosAdmin()

    await expect(listarPedidos({})).rejects.toThrow('Data inicial inválida.')
  })

  it('obterPedido retorna o detalhe', async () => {
    rawMock.mockResolvedValue(respostaDe(200, pedidoDetalhe))

    const { obterPedido } = usePedidosAdmin()
    const pedido = await obterPedido(7)

    expect(rawMock).toHaveBeenCalledWith('/api/admin/pedidos/7', expect.any(Object))
    expect(pedido.itens).toHaveLength(1)
  })

  it('obterPedido lança erro quando retorno é inválido', async () => {
    rawMock.mockResolvedValue(respostaDe(200, { status: 'x' }))

    const { obterPedido } = usePedidosAdmin()

    await expect(obterPedido(7)).rejects.toThrow('Não foi possível concluir a ação')
  })

  it('atualizarStatus retorna sucesso para 2xx', async () => {
    rawMock.mockResolvedValue(respostaDe(200, { sucesso: true, pedido: { id: 7, status: 'cancelado' } }))

    const { atualizarStatus } = usePedidosAdmin()
    const resultado = await atualizarStatus(7, 'cancelado')

    expect(rawMock).toHaveBeenCalledWith(
      '/api/admin/pedidos/7',
      expect.objectContaining({ method: 'PATCH', body: { status: 'cancelado' } })
    )
    expect(resultado).toEqual({ sucesso: true, pedido: { id: 7, status: 'cancelado' } })
  })

  it('atualizarStatus retorna erro com mensagem em 409', async () => {
    rawMock.mockResolvedValue(
      respostaDe(409, {
        statusCode: 409,
        statusMessage: 'Pedido já finalizado.',
        message: 'Pedido já finalizado.'
      })
    )

    const { atualizarStatus } = usePedidosAdmin()
    const resultado = await atualizarStatus(7, 'finalizado')

    expect(resultado.sucesso).toBe(false)
    expect(resultado.statusCode).toBe(409)
    expect(resultado.mensagem).toContain('finalizado')
  })

  it('atualizarStatus expõe erros de estoque do body em 409', async () => {
    rawMock.mockResolvedValue(
      respostaDe(409, {
        statusCode: 409,
        statusMessage: 'Estoque insuficiente.',
        data: [{ varianteId: 9, nomeProduto: 'Vestido', disponivel: 1, solicitado: 3 }]
      })
    )

    const { atualizarStatus } = usePedidosAdmin()
    const resultado = await atualizarStatus(7, 'finalizado')

    expect(resultado.sucesso).toBe(false)
    expect(resultado.erros).toHaveLength(1)
    expect(resultado.erros?.[0].disponivel).toBe(1)
  })

  it('atualizarStatus lança erro para retorno de sucesso inválido', async () => {
    rawMock.mockResolvedValue(respostaDe(200, { sucesso: true }))

    const { atualizarStatus } = usePedidosAdmin()

    await expect(atualizarStatus(7, 'finalizado')).rejects.toThrow('Não foi possível concluir a ação')
  })
})