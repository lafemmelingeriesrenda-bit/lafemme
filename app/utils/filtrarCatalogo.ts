import type { ProdutoCard } from '~/utils/agruparProdutos'

export type OrdenacaoCatalogo = 'nome-asc' | 'nome-desc' | 'preco-asc' | 'preco-desc'

export interface FiltrosCatalogo {
  busca: string
  categoria: string | null
  cor: string | null
  tamanho: string | null
  ordenacao: OrdenacaoCatalogo
}

export const ORDENACAO_PADRAO: OrdenacaoCatalogo = 'nome-asc'

const ORDEM_TAMANHOS = ['P', 'M', 'G', 'GG', 'Tamanho Único']

export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}

/**
 * Preço exibido no card agrupado: o da primeira variante disponível
 * (mesmo critério do ProductCard). Sem variante disponível, usa o menor
 * valor conhecido para manter a ordenação determinística.
 */
export function precoDoCard(produto: ProdutoCard): number | null {
  const disponivel = produto.variantes.find((variante) => variante.disponivel)

  if (disponivel) {
    return disponivel.valor
  }

  const valores = produto.variantes
    .map((variante) => variante.valor)
    .filter((valor) => Number.isFinite(valor))

  if (valores.length === 0) {
    return null
  }

  return Math.min(...valores)
}

function compararNome(a: ProdutoCard, b: ProdutoCard): number {
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
}

function compararPreco(a: ProdutoCard, b: ProdutoCard): number {
  const precoA = precoDoCard(a)
  const precoB = precoDoCard(b)

  if (precoA === null && precoB === null) {
    return 0
  }
  if (precoA === null) {
    return 1
  }
  if (precoB === null) {
    return -1
  }

  return precoA - precoB
}

export function ordenarProdutos(
  produtos: ProdutoCard[],
  ordenacao: OrdenacaoCatalogo
): ProdutoCard[] {
  const copia = [...produtos]

  switch (ordenacao) {
    case 'nome-desc':
      return copia.sort((a, b) => compararNome(b, a))
    case 'preco-asc':
      return copia.sort((a, b) => compararPreco(a, b) || compararNome(a, b))
    case 'preco-desc':
      return copia.sort((a, b) => compararPreco(b, a) || compararNome(a, b))
    case 'nome-asc':
    default:
      return copia.sort(compararNome)
  }
}

export function filtrarProdutos(produtos: ProdutoCard[], filtros: FiltrosCatalogo): ProdutoCard[] {
  const termo = normalizarTexto(filtros.busca)
  const categoria = normalizarTexto(filtros.categoria)
  const cor = normalizarTexto(filtros.cor)
  const tamanho = normalizarTexto(filtros.tamanho)

  return produtos.filter((produto) => {
    if (termo) {
      const nome = normalizarTexto(produto.nome)
      const cat = normalizarTexto(produto.categoria)

      if (!nome.includes(termo) && !cat.includes(termo)) {
        return false
      }
    }

    if (categoria && normalizarTexto(produto.categoria) !== categoria) {
      return false
    }

    if (cor && normalizarTexto(produto.cor) !== cor) {
      return false
    }

    if (
      tamanho &&
      !produto.variantes.some((variante) => normalizarTexto(variante.tamanho) === tamanho)
    ) {
      return false
    }

    return true
  })
}

export function filtrarEOrdenar(produtos: ProdutoCard[], filtros: FiltrosCatalogo): ProdutoCard[] {
  return ordenarProdutos(filtrarProdutos(produtos, filtros), filtros.ordenacao)
}

function valoresUnicos(valores: Array<string | null | undefined>): string[] {
  const mapa = new Map<string, string>()

  for (const valor of valores) {
    if (typeof valor !== 'string') {
      continue
    }

    const texto = valor.replace(/\s+/g, ' ').trim()

    if (texto.length === 0) {
      continue
    }

    const chave = normalizarTexto(texto)

    if (!mapa.has(chave)) {
      mapa.set(chave, texto)
    }
  }

  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}

export function categoriasDisponiveis(produtos: ProdutoCard[]): string[] {
  return valoresUnicos(produtos.map((produto) => produto.categoria))
}

export function coresDisponiveis(produtos: ProdutoCard[]): string[] {
  return valoresUnicos(produtos.map((produto) => produto.cor))
}

function indiceTamanho(tamanho: string): number {
  const chave = normalizarTexto(tamanho)
  const indice = ORDEM_TAMANHOS.findIndex((conhecido) => normalizarTexto(conhecido) === chave)

  return indice === -1 ? Number.MAX_SAFE_INTEGER : indice
}

export function tamanhosDisponiveis(produtos: ProdutoCard[]): string[] {
  const tamanhos = valoresUnicos(
    produtos.flatMap((produto) => produto.variantes.map((variante) => variante.tamanho))
  )

  return tamanhos.sort((a, b) => {
    const indiceA = indiceTamanho(a)
    const indiceB = indiceTamanho(b)

    if (indiceA !== indiceB) {
      return indiceA - indiceB
    }

    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  })
}
