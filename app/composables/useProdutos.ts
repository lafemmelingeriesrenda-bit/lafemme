import { useAsyncData, useSupabaseClient } from '#imports'

export interface VarianteProduto {
  id: number
  tamanho: string
  valor: number
  quantidade: number
}

export interface ProdutoCard {
  produtoId: number
  nome: string
  slug: string | null
  descricao: string | null
  categoria: string | null
  cor: string | null
  foto: string | null
  variantes: VarianteProduto[]
}

export function useProdutos() {
  const supabase = useSupabaseClient()

  const { data, pending, error } = useAsyncData('catalogo_produtos', async () => {
    const { data, error: queryError } = await supabase
      .from('catalogo_produtos')
      .select(
        'produto_id, nome, slug, descricao, categoria, cor, variante_id, tamanho, valor, foto, quantidade'
      )
      .order('nome')

    if (queryError) {
      throw new Error(queryError.message)
    }

    const grupos = new Map<string, ProdutoCard>()

    for (const item of data ?? []) {
      const chave = `${item.produto_id}|${item.cor ?? ''}|${item.foto ?? ''}`
      let grupo = grupos.get(chave)

      if (!grupo) {
        grupo = {
          produtoId: item.produto_id,
          nome: item.nome,
          slug: item.slug,
          descricao: item.descricao,
          categoria: item.categoria,
          cor: item.cor,
          foto: item.foto,
          variantes: []
        }
        grupos.set(chave, grupo)
      }

      grupo.variantes.push({
        id: item.variante_id,
        tamanho: item.tamanho,
        valor: item.valor,
        quantidade: item.quantidade
      })
    }

    return [...grupos.values()]
  })

  return {
    produtos: data,
    loading: pending,
    error: computed(() => error.value?.message ?? null)
  }
}