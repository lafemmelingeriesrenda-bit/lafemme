import { computed, unref } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export interface ProdutoFiltravel {
  id: number
  nome: string
  categoria: string | null
}

export interface BuscaProdutosResult<T extends ProdutoFiltravel> {
  filtrados: computed
}

export function useBuscaProdutos<T extends ProdutoFiltravel>(
  produtos: MaybeRefOrGetter<T[] | null | undefined>,
  busca: MaybeRefOrGetter<string>
) {
  const termo = computed(() => unref(busca).trim().toLowerCase())

  const filtrados = computed<T[]>(() => {
    const lista = unref(produtos)
    const rows: T[] = Array.isArray(lista) ? lista : []

    if (!termo.value) {
      return rows
    }

    return rows.filter((item) => {
      const nome = item.nome.toLowerCase()
      const categoria = (item.categoria ?? '').toLowerCase()
      return nome.includes(termo.value) || categoria.includes(termo.value)
    })
  })

  return { filtrados }
}