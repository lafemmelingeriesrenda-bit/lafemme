import { describe, expect, it } from 'vitest'
import {
  ORDENACAO_PADRAO,
  categoriasDisponiveis,
  coresDisponiveis,
  filtrarEOrdenar,
  filtrarProdutos,
  normalizarTexto,
  ordenarProdutos,
  precoDoCard,
  tamanhosDisponiveis,
  type FiltrosCatalogo
} from '../app/utils/filtrarCatalogo'
import type { ProdutoCard, VarianteProduto } from '../app/utils/agruparProdutos'

function variante(parcial: Partial<VarianteProduto> = {}): VarianteProduto {
  return { id: 1, tamanho: 'M', valor: 100, quantidade: 3, disponivel: true, ...parcial }
}

function card(parcial: Partial<ProdutoCard> = {}): ProdutoCard {
  return {
    produtoId: 1,
    nome: 'Body Essence',
    slug: 'body-essence',
    descricao: null,
    categoria: 'Body',
    cor: 'Preto',
    foto: null,
    variantes: [variante()],
    ...parcial
  }
}

const camisola = card({
  produtoId: 1,
  nome: 'Camisola Renda',
  categoria: 'Camisola',
  cor: 'Preto',
  variantes: [
    variante({ id: 1, tamanho: 'P', valor: 80, disponivel: true }),
    variante({ id: 2, tamanho: 'M', valor: 80, disponivel: true })
  ]
})

const body = card({
  produtoId: 2,
  nome: 'Body Essence',
  categoria: 'Body',
  cor: 'Vermelho',
  variantes: [variante({ id: 3, tamanho: 'M', valor: 120, disponivel: true })]
})

const conjunto = card({
  produtoId: 3,
  nome: 'Conjunto Madame',
  categoria: 'Conjunto',
  cor: 'Preto',
  variantes: [variante({ id: 4, tamanho: 'G', valor: 60, disponivel: false })]
})

const catalogo: ProdutoCard[] = [camisola, body, conjunto]

const semFiltro: FiltrosCatalogo = {
  busca: '',
  categoria: null,
  cor: null,
  tamanho: null,
  ordenacao: ORDENACAO_PADRAO
}

function nomes(produtos: ProdutoCard[]): string[] {
  return produtos.map((produto) => produto.nome)
}

describe('normalizarTexto', () => {
  it('remove acentos, caixa e espaços extras', () => {
    expect(normalizarTexto('  Sutiã  ')).toBe('sutia')
    expect(normalizarTexto(null)).toBe('')
    expect(normalizarTexto(undefined)).toBe('')
  })
})

describe('filtrarProdutos — busca', () => {
  it('busca vazia retorna todos', () => {
    expect(filtrarProdutos(catalogo, semFiltro)).toHaveLength(3)
  })

  it('busca por nome', () => {
    expect(nomes(filtrarProdutos(catalogo, { ...semFiltro, busca: 'essence' }))).toEqual([
      'Body Essence'
    ])
  })

  it('busca é case-insensitive e ignora espaços extras', () => {
    expect(nomes(filtrarProdutos(catalogo, { ...semFiltro, busca: '  RENDA ' }))).toEqual([
      'Camisola Renda'
    ])
  })

  it('busca também encontra por categoria', () => {
    expect(nomes(filtrarProdutos(catalogo, { ...semFiltro, busca: 'conjunto' }))).toEqual([
      'Conjunto Madame'
    ])
  })

  it('busca sem correspondência retorna vazio', () => {
    expect(filtrarProdutos(catalogo, { ...semFiltro, busca: 'inexistente' })).toEqual([])
  })
})

describe('filtrarProdutos — categoria, cor e tamanho', () => {
  it('filtra por categoria', () => {
    expect(nomes(filtrarProdutos(catalogo, { ...semFiltro, categoria: 'Camisola' }))).toEqual([
      'Camisola Renda'
    ])
  })

  it('filtra por cor', () => {
    expect(nomes(filtrarProdutos(catalogo, { ...semFiltro, cor: 'Preto' }))).toEqual([
      'Camisola Renda',
      'Conjunto Madame'
    ])
  })

  it('filtra por tamanho considerando as variantes do card', () => {
    expect(nomes(filtrarProdutos(catalogo, { ...semFiltro, tamanho: 'M' }))).toEqual([
      'Camisola Renda',
      'Body Essence'
    ])
  })

  it('combina busca e filtros com lógica AND', () => {
    const resultado = filtrarProdutos(catalogo, {
      ...semFiltro,
      busca: 'renda',
      categoria: 'Camisola',
      cor: 'Preto',
      tamanho: 'M'
    })
    expect(nomes(resultado)).toEqual(['Camisola Renda'])
  })

  it('combinação sem correspondência retorna vazio', () => {
    const resultado = filtrarProdutos(catalogo, {
      ...semFiltro,
      categoria: 'Camisola',
      cor: 'Vermelho'
    })
    expect(resultado).toEqual([])
  })
})

describe('ordenarProdutos', () => {
  it('ordena por nome A–Z', () => {
    expect(nomes(ordenarProdutos(catalogo, 'nome-asc'))).toEqual([
      'Body Essence',
      'Camisola Renda',
      'Conjunto Madame'
    ])
  })

  it('ordena por nome Z–A', () => {
    expect(nomes(ordenarProdutos(catalogo, 'nome-desc'))).toEqual([
      'Conjunto Madame',
      'Camisola Renda',
      'Body Essence'
    ])
  })

  it('ordena por menor preço', () => {
    expect(nomes(ordenarProdutos(catalogo, 'preco-asc'))).toEqual([
      'Conjunto Madame',
      'Camisola Renda',
      'Body Essence'
    ])
  })

  it('ordena por maior preço', () => {
    expect(nomes(ordenarProdutos(catalogo, 'preco-desc'))).toEqual([
      'Body Essence',
      'Camisola Renda',
      'Conjunto Madame'
    ])
  })
})

describe('precoDoCard', () => {
  it('usa o preço da primeira variante disponível', () => {
    expect(precoDoCard(camisola)).toBe(80)
  })

  it('usa o menor valor quando nenhuma variante está disponível', () => {
    expect(precoDoCard(conjunto)).toBe(60)
  })

  it('retorna null quando não há variantes', () => {
    expect(precoDoCard(card({ variantes: [] }))).toBeNull()
  })
})

describe('filtrarEOrdenar', () => {
  it('aplica filtros e ordenação juntos', () => {
    const resultado = filtrarEOrdenar(catalogo, {
      ...semFiltro,
      cor: 'Preto',
      ordenacao: 'preco-asc'
    })
    expect(nomes(resultado)).toEqual(['Conjunto Madame', 'Camisola Renda'])
  })

  it('filtros padrão retornam todos ordenados por nome', () => {
    expect(nomes(filtrarEOrdenar(catalogo, semFiltro))).toEqual([
      'Body Essence',
      'Camisola Renda',
      'Conjunto Madame'
    ])
  })
})

describe('opções derivadas', () => {
  it('deriva categorias únicas, sem nulos e ordenadas', () => {
    const comNulos = [camisola, body, conjunto, card({ categoria: null }), card({ categoria: 'Body' })]
    expect(categoriasDisponiveis(comNulos)).toEqual(['Body', 'Camisola', 'Conjunto'])
  })

  it('deriva cores únicas ignorando vazias', () => {
    const comNulos = [camisola, body, conjunto, card({ cor: null }), card({ cor: 'Preto' })]
    expect(coresDisponiveis(comNulos)).toEqual(['Preto', 'Vermelho'])
  })

  it('deriva tamanhos em ordem amigável e mantém desconhecidos', () => {
    const comTamanhos = [
      card({ variantes: [variante({ tamanho: 'GG' })] }),
      card({ variantes: [variante({ tamanho: 'P' })] }),
      card({ variantes: [variante({ tamanho: 'XG' })] }),
      card({ variantes: [variante({ tamanho: 'M' })] })
    ]
    expect(tamanhosDisponiveis(comTamanhos)).toEqual(['P', 'M', 'GG', 'XG'])
  })

  it('não quebra com valores nulos/vazios', () => {
    const bagunçado = [card({ categoria: '', cor: '   ', variantes: [variante({ tamanho: '' })] })]
    expect(categoriasDisponiveis(bagunçado)).toEqual([])
    expect(coresDisponiveis(bagunçado)).toEqual([])
    expect(tamanhosDisponiveis(bagunçado)).toEqual([])
  })
})
