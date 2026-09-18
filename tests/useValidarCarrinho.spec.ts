import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.stubGlobal('ref', ref)

const rawMock = vi.fn()
vi.stubGlobal('$fetch', { raw: rawMock })

import { useValidarCarrinho } from '../app/composables/useValidarCarrinho'
import type { ItemCarrinho } from '../app/types/carrinho'

const itens: ItemCarrinho[] = [
  {
    varianteId: 1,
    produtoId: 1,
    nome: 'Body Essence',
    cor: 'Preto',
    tamanho: 'M',
    valor: 100,
    foto: null,
    quantidade: 2,
    estoqueDisponivel: 2
  }
]

function respostaDe(status: number, dados: unknown) {
  return { status, _data: dados }
}

describe('useValidarCarrinho', () => {
  beforeEach(() => {
    rawMock.mockReset()
  })

  it('retorna válido quando o servidor confirma o estoque', async () => {
    rawMock.mockResolvedValue(
      respostaDe(200, {
        valido: true,
        itens: [{ ...itens[0], disponivel: 5, subtotal: 200 }],
        subtotal: 200
      })
    )

    const { validar } = useValidarCarrinho()
    const resultado = await validar(itens)

    expect(rawMock).toHaveBeenCalledWith(
      '/api/carrinho/validar',
      expect.objectContaining({ method: 'POST', ignoreResponseError: true })
    )
    expect(resultado.valido).toBe(true)
    expect(resultado.mensagem).toBeNull()
    expect(resultado.itens).toHaveLength(1)
  })

  it('estoque insuficiente impede o checkout e identifica o item', async () => {
    rawMock.mockResolvedValue(
      respostaDe(200, {
        valido: false,
        erros: [{ varianteId: 1, motivo: 'ESTOQUE_INSUFICIENTE', disponivel: 1, solicitado: 2 }]
      })
    )

    const { validar } = useValidarCarrinho()
    const resultado = await validar(itens)

    expect(resultado.valido).toBe(false)
    expect(resultado.erros).toHaveLength(1)
    expect(resultado.mensagem).toContain('Body Essence')
    expect(resultado.mensagem).toContain('Estoque insuficiente')
  })

  it('variante inativa impede o checkout e identifica o item', async () => {
    rawMock.mockResolvedValue(
      respostaDe(200, {
        valido: false,
        erros: [{ varianteId: 1, motivo: 'VARIANTE_INATIVA' }]
      })
    )

    const { validar } = useValidarCarrinho()
    const resultado = await validar(itens)

    expect(resultado.valido).toBe(false)
    expect(resultado.mensagem).toContain('Body Essence')
    expect(resultado.mensagem).toContain('desativado')
  })

  it('variante inexistente impede o checkout', async () => {
    rawMock.mockResolvedValue(
      respostaDe(200, {
        valido: false,
        erros: [{ varianteId: 1, motivo: 'VARIANTE_NAO_ENCONTRADA' }]
      })
    )

    const { validar } = useValidarCarrinho()
    const resultado = await validar(itens)

    expect(resultado.valido).toBe(false)
    expect(resultado.mensagem).toContain('não está mais disponível')
  })

  it('trata 400 usando a mensagem do servidor', async () => {
    rawMock.mockResolvedValue(
      respostaDe(400, { valido: false, mensagem: 'Payload de carrinho inválido.' })
    )

    const { validar } = useValidarCarrinho()
    const resultado = await validar(itens)

    expect(resultado.valido).toBe(false)
    expect(resultado.mensagem).toBe('Payload de carrinho inválido.')
  })

  it('trata erro de rede com mensagem amigável', async () => {
    rawMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const { validar } = useValidarCarrinho()
    const resultado = await validar(itens)

    expect(resultado.valido).toBe(false)
    expect(resultado.mensagem).toBe('Não foi possível validar a sacola. Tente novamente em instantes.')
  })

  it('envia apenas varianteId e quantidade do carrinho', async () => {
    rawMock.mockResolvedValue(respostaDe(200, { valido: true, itens: [] }))

    const { validar } = useValidarCarrinho()
    await validar(itens)

    expect(rawMock).toHaveBeenCalledWith(
      '/api/carrinho/validar',
      expect.objectContaining({
        body: { itens: [{ varianteId: 1, quantidade: 2 }] }
      })
    )
  })
})
