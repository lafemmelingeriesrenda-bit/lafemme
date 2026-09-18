import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import {
  carregarDoLocalStorage,
  estoqueConhecido,
  normalizarItemCarrinho,
  useCarrinho
} from '../app/composables/useCarrinho'
import type { ItemCarrinho, NovoItemCarrinho } from '../app/types/carrinho'

function novoItem(sobrescreve: Partial<NovoItemCarrinho> = {}): NovoItemCarrinho {
  return {
    varianteId: 1,
    produtoId: 1,
    nome: 'Body Essence',
    cor: 'Preto',
    tamanho: 'M',
    valor: 100,
    foto: null,
    estoqueDisponivel: 2,
    ...sobrescreve
  }
}

function stubLocalStorage(valor: string | null) {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: vi.fn(() => valor),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
  })
}

describe('useCarrinho — limite local de estoque', () => {
  beforeEach(() => {
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useState', function useStateStub<T>(_chave: string, inicial: () => T) {
      return ref(inicial())
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adicionar respeita o estoque conhecido', () => {
    const { adicionar, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 2 }), 5)
    expect(itens.value[0]?.quantidade).toBe(2)
  })

  it('adicionar novamente a mesma variante não ultrapassa o estoque', () => {
    const { adicionar, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)
    expect(itens.value[0]?.quantidade).toBe(2)
  })

  it('aumentar respeita o estoque', () => {
    const { adicionar, aumentar, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)

    aumentar(1)
    expect(itens.value[0]?.quantidade).toBe(2)

    aumentar(1)
    expect(itens.value[0]?.quantidade).toBe(2)
  })

  it('estoque 1 impede aumento a partir de 1', () => {
    const { adicionar, aumentar, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 1 }), 1)
    aumentar(1)
    expect(itens.value[0]?.quantidade).toBe(1)
  })

  it('diminuir continua funcionando e nunca fica abaixo de 1', () => {
    const { adicionar, diminuir, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 5 }), 3)

    diminuir(1)
    expect(itens.value[0]?.quantidade).toBe(2)

    diminuir(1)
    diminuir(1)
    diminuir(1)
    expect(itens.value[0]?.quantidade).toBe(1)
  })

  it('alterarQuantidade limita quantidade acima do estoque', () => {
    const { adicionar, alterarQuantidade, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)
    alterarQuantidade(1, 10)
    expect(itens.value[0]?.quantidade).toBe(2)
  })

  it('alterarQuantidade com zero remove o item', () => {
    const { adicionar, alterarQuantidade, itens } = useCarrinho()
    adicionar(novoItem(), 1)
    alterarQuantidade(1, 0)
    expect(itens.value).toHaveLength(0)
  })

  it('sem estoque conhecido não aplica limite local (compatibilidade)', () => {
    const { adicionar, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: undefined }), 7)
    expect(itens.value[0]?.quantidade).toBe(7)
  })

  it('não adiciona item novo quando o estoque conhecido é zero', () => {
    const { adicionar, itens } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 0 }), 1)
    expect(itens.value).toHaveLength(0)
  })

  it('podeAumentar reflete o estoque conhecido', () => {
    const { adicionar, podeAumentar } = useCarrinho()
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)
    expect(podeAumentar(1)).toBe(true)
    adicionar(novoItem({ estoqueDisponivel: 2 }), 1)
    expect(podeAumentar(1)).toBe(false)
  })
})

describe('useCarrinho — persistência e compatibilidade', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('carrega itens do localStorage', () => {
    const itens: ItemCarrinho[] = [
      { ...novoItem(), quantidade: 2, estoqueDisponivel: 2 } as ItemCarrinho
    ]
    stubLocalStorage(JSON.stringify({ itens }))

    const carrinho = carregarDoLocalStorage()
    expect(carrinho?.itens[0]?.quantidade).toBe(2)
  })

  it('carrega carrinho antigo sem estoqueDisponivel sem quebrar', () => {
    const itens = [
      {
        varianteId: 9,
        produtoId: 9,
        nome: 'Antigo',
        cor: null,
        tamanho: 'P',
        valor: 50,
        foto: null,
        quantidade: 1
      }
    ]
    stubLocalStorage(JSON.stringify({ itens }))

    const carrinho = carregarDoLocalStorage()
    expect(carrinho?.itens[0]?.estoqueDisponivel).toBeNull()
    expect(carrinho?.itens[0]?.quantidade).toBe(1)
  })

  it('normaliza item antigo sem estoqueDisponivel', () => {
    const antigo = {
      ...novoItem(),
      quantidade: 3,
      estoqueDisponivel: undefined
    } as ItemCarrinho

    const normalizado = normalizarItemCarrinho(antigo)
    expect(normalizado.estoqueDisponivel).toBeNull()
    expect(normalizado.quantidade).toBe(3)
  })

  it('corrige quantidade inválida ao normalizar', () => {
    const item = { ...novoItem({ estoqueDisponivel: 2 }), quantidade: 0 } as ItemCarrinho
    expect(normalizarItemCarrinho(item).quantidade).toBe(1)
  })

  it('estoqueConhecido distingue desconhecido de zero', () => {
    expect(estoqueConhecido(undefined)).toBeNull()
    expect(estoqueConhecido(null)).toBeNull()
    expect(estoqueConhecido(Number.NaN)).toBeNull()
    expect(estoqueConhecido(0)).toBe(0)
    expect(estoqueConhecido(3)).toBe(3)
  })
})
