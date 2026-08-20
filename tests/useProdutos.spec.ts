import { describe, expect, it } from 'vitest'
import { agruparProdutos, type LinhaCatalogo } from '../app/utils/agruparProdutos'

function linha(parcial: Partial<LinhaCatalogo>): LinhaCatalogo {
  return {
    produto_id: 1,
    nome: 'Produto X',
    slug: 'produto-x',
    descricao: null,
    categoria: 'Lingerie',
    cor: 'Preto',
    variante_id: 1,
    tamanho: 'P',
    valor: 100,
    foto: null,
    quantidade: 0,
    disponivel: false,
    ...parcial
  }
}

describe('agruparProdutos', () => {
  it('preserva variantes esgotadas e transporta disponibilidade', () => {
    const produtos = agruparProdutos([
      linha({ variante_id: 1, tamanho: 'P', quantidade: 0, disponivel: false }),
      linha({ variante_id: 2, tamanho: 'M', quantidade: 2, disponivel: true }),
      linha({ variante_id: 3, tamanho: 'G', quantidade: 5, disponivel: true })
    ])

    expect(produtos).toHaveLength(1)
    expect(produtos[0]?.variantes).toEqual([
      { id: 1, tamanho: 'P', valor: 100, quantidade: 0, disponivel: false },
      { id: 2, tamanho: 'M', valor: 100, quantidade: 2, disponivel: true },
      { id: 3, tamanho: 'G', valor: 100, quantidade: 5, disponivel: true }
    ])
  })

  it('mantém o agrupamento por produto, cor e foto', () => {
    const produtos = agruparProdutos([
      linha({ variante_id: 1, cor: 'Preto', foto: 'preto.jpg' }),
      linha({ variante_id: 2, cor: 'Preto', foto: 'preto.jpg', tamanho: 'M' }),
      linha({ variante_id: 3, cor: 'Rosa', foto: 'rosa.jpg' })
    ])

    expect(produtos).toHaveLength(2)
    expect(produtos.map((produto) => produto.variantes.length)).toEqual([2, 1])
  })
})
