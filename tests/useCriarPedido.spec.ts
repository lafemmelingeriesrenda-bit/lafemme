import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.stubGlobal('ref', ref)

const rawMock = vi.fn()
vi.stubGlobal('$fetch', { raw: rawMock })

import { useCriarPedido } from '../app/composables/useCriarPedido'
import type { PedidoCriado } from '../app/types/pedido'

const payload = {
  itens: [{ varianteId: 1, quantidade: 1 }],
  nome: 'Ana Silva',
  telefone: '34999999999',
  observacoes: null
}

const pedidoCriado: PedidoCriado = {
  id: 7,
  nome_cliente: 'Ana Silva',
  telefone_cliente: '34999999999',
  observacoes: null,
  status: 'aguardando_atendimento',
  subtotal: 120,
  frete: 0,
  total: 120,
  itens: [
    {
      produto_variante_id: 1,
      nome_produto: 'Vestido',
      cor: null,
      tamanho: 'M',
      sku: null,
      quantidade: 1,
      valor_unitario: 120,
      subtotal: 120
    }
  ]
}

function respostaDe(status: number, dados: unknown) {
  return { status, _data: dados }
}

describe('useCriarPedido', () => {
  beforeEach(() => {
    rawMock.mockReset()
  })

  it('retorna o pedido quando a API responde 201', async () => {
    rawMock.mockResolvedValue(respostaDe(201, { sucesso: true, pedido: pedidoCriado }))

    const { criarPedido } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(rawMock).toHaveBeenCalledWith(
      '/api/pedidos',
      expect.objectContaining({ method: 'POST', ignoreResponseError: true })
    )
    expect(pedido).toEqual(pedidoCriado)
  })

  it('trata 400 como dados inválidos usando a mensagem do servidor', async () => {
    rawMock.mockResolvedValue(
      respostaDe(400, { sucesso: false, mensagem: 'Payload de pedido inválido. Envie itens válidos, nome e telefone.' })
    )

    const { criarPedido, mensagemErro, erros } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(pedido).toBeNull()
    expect(mensagemErro.value).toBe('Payload de pedido inválido. Envie itens válidos, nome e telefone.')
    expect(erros.value).toEqual([])
  })

  it('trata 409 com estoque insuficiente', async () => {
    rawMock.mockResolvedValue(
      respostaDe(409, {
        sucesso: false,
        erros: [{ varianteId: 1, motivo: 'ESTOQUE_INSUFICIENTE', disponivel: 2, solicitado: 5 }]
      })
    )

    const { criarPedido, mensagemErro, erros } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(pedido).toBeNull()
    expect(erros.value).toHaveLength(1)
    expect(mensagemErro.value).toContain('Estoque insuficiente')
    expect(mensagemErro.value).toContain('restam 2 unidade(s) e você pediu 5')
  })

  it('trata 409 com variante inexistente, inativa e quantidade inválida', async () => {
    rawMock.mockResolvedValue(
      respostaDe(409, {
        sucesso: false,
        erros: [
          { varianteId: 1, motivo: 'VARIANTE_NAO_ENCONTRADA' },
          { varianteId: 2, motivo: 'VARIANTE_INATIVA' },
          { varianteId: 3, motivo: 'QUANTIDADE_INVALIDA' }
        ]
      })
    )

    const { criarPedido, mensagemErro, erros } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(pedido).toBeNull()
    expect(erros.value.map((erro) => erro.motivo)).toEqual([
      'VARIANTE_NAO_ENCONTRADA',
      'VARIANTE_INATIVA',
      'QUANTIDADE_INVALIDA'
    ])
    expect(mensagemErro.value).toContain('não está mais disponível')
    expect(mensagemErro.value).toContain('foi desativado')
    expect(mensagemErro.value).toContain('quantidade de um dos itens')
  })

  it('não trata 409 sem lista de erros como sucesso', async () => {
    rawMock.mockResolvedValue(respostaDe(409, { sucesso: false }))

    const { criarPedido, mensagemErro, erros } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(pedido).toBeNull()
    expect(erros.value).toEqual([])
    expect(mensagemErro.value).toBe('Não foi possível finalizar o pedido. Tente novamente em instantes.')
  })

  it('trata erro inesperado do servidor usando a mensagem retornada', async () => {
    rawMock.mockResolvedValue(respostaDe(500, { sucesso: false, mensagem: 'Erro interno do servidor.' }))

    const { criarPedido, mensagemErro } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(pedido).toBeNull()
    expect(mensagemErro.value).toBe('Erro interno do servidor.')
  })

  it('trata erro de rede como mensagem amigável', async () => {
    rawMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const { criarPedido, mensagemErro } = useCriarPedido()
    const pedido = await criarPedido(payload)

    expect(pedido).toBeNull()
    expect(mensagemErro.value).toBe('Algo deu errado ao finalizar o pedido. Tente novamente em instantes.')
  })
})