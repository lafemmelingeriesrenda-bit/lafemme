import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useBuscaProdutos } from '../app/composables/useBuscaProdutos'

interface ProdutoTeste {
  id: number
  nome: string
  categoria: string | null
}

const produtos: ProdutoTeste[] = [
  { id: 1, nome: 'Camisola Renda', categoria: 'Camisola' },
  { id: 2, nome: 'Body Essence', categoria: 'Body' },
  { id: 3, nome: 'Conjunto Madame', categoria: 'Conjunto' }
]

function idsFiltrados(produtosEntrada: ProdutoTeste[], termo: string): number[] {
  const { filtrados } = useBuscaProdutos(ref(produtosEntrada), ref(termo))
  return filtrados.value.map((produto) => produto.id)
}

describe('useBuscaProdutos', () => {
  it('retorna todos os produtos quando a busca está vazia', () => {
    expect(idsFiltrados(produtos, '')).toEqual([1, 2, 3])
  })

  it('retorna todos os produtos quando a busca é apenas espaços', () => {
    expect(idsFiltrados(produtos, '   ')).toEqual([1, 2, 3])
  })

  it('filtra por nome', () => {
    expect(idsFiltrados(produtos, 'essence')).toEqual([2])
  })

  it('filtra por categoria', () => {
    expect(idsFiltrados(produtos, 'conjunto')).toEqual([3])
  })

  it('ignora maiúsculas/minúsculas', () => {
    expect(idsFiltrados(produtos, 'CAMISOLA')).toEqual([1])
  })

  it('ignora espaços extras ao redor do termo', () => {
    expect(idsFiltrados(produtos, '  madame  ')).toEqual([3])
  })

  it('reage à mudança do termo de busca', () => {
    const busca = ref('')
    const { filtrados } = useBuscaProdutos(ref(produtos), busca)

    expect(filtrados.value.map((produto) => produto.id)).toEqual([1, 2, 3])

    busca.value = 'body'
    expect(filtrados.value.map((produto) => produto.id)).toEqual([2])
  })

  it('aceita getter como entrada (MaybeRefOrGetter)', () => {
    const busca = ref('renda')
    const { filtrados } = useBuscaProdutos(() => produtos, () => busca.value)

    expect(filtrados.value.map((produto) => produto.id)).toEqual([1])

    busca.value = 'madame'
    expect(filtrados.value.map((produto) => produto.id)).toEqual([3])
  })

  it('trata lista nula/indefinida como vazia', () => {
    const { filtrados } = useBuscaProdutos(ref<ProdutoTeste[] | null>(null), ref(''))
    expect(filtrados.value).toEqual([])
  })

  it('considera categoria nula sem quebrar', () => {
    const semCategoria: ProdutoTeste[] = [{ id: 9, nome: 'Sutiã', categoria: null }]
    expect(idsFiltrados(semCategoria, 'sutiã')).toEqual([9])
    expect(idsFiltrados(semCategoria, 'inexistente')).toEqual([])
  })
})
