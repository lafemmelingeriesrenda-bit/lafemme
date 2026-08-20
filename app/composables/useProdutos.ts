import { useAsyncData, useSupabaseClient } from '#imports'
import { agruparProdutos, type ProdutoCard } from '~/utils/agruparProdutos'

export function useProdutos() {
  const supabase = useSupabaseClient()

  const { data: produtos, pending, error } = useAsyncData<ProdutoCard[]>('catalogo_produtos', async () => {
    const { data, error: queryError } = await supabase
      .from('catalogo_produtos')
      .select(
        'produto_id, nome, slug, descricao, categoria, cor, variante_id, tamanho, valor, foto, quantidade, disponivel'
      )
      .order('nome')

    if (queryError) {
      throw new Error(queryError.message)
    }

    return agruparProdutos(data ?? [])
  })

  return {
    produtos,
    loading: pending,
    error: computed(() => error.value?.message ?? null)
  }
}
