import { useAsyncData, useSupabaseClient } from '#imports'

export interface VarianteProdutoPublico {
  id: number
  tamanho: string
  valor: number
  quantidade: number
  disponivel: boolean
}

export interface CorProdutoPublico {
  cor: string | null
  foto: string | null
  variantes: VarianteProdutoPublico[]
}

export interface ProdutoPublico {
  id: number
  nome: string
  slug: string | null
  descricao: string | null
  categoria: string | null
  cores: CorProdutoPublico[]
}

export function useProdutoPublico(id: number) {
  const supabase = useSupabaseClient()

  const { data, pending, error } = useAsyncData(`produto_publico_${id}`, async () => {
    const { data: linhas, error: queryError } = await supabase
      .from('catalogo_produtos')
      .select(
        'produto_id, nome, slug, descricao, categoria, cor, variante_id, tamanho, valor, foto, quantidade, disponivel'
      )
      .eq('produto_id', id)
      .order('cor')
      .order('tamanho')

    if (queryError) {
      throw new Error(queryError.message)
    }

    if (!linhas || linhas.length === 0) {
      return null
    }

    const primeiraLinha = linhas[0]

    if (!primeiraLinha) {
      return null
    }

    const produto: ProdutoPublico = {
      id: primeiraLinha.produto_id,
      nome: primeiraLinha.nome,
      slug: primeiraLinha.slug,
      descricao: primeiraLinha.descricao,
      categoria: primeiraLinha.categoria,
      cores: []
    }

    const cores = new Map<string, CorProdutoPublico>()

    for (const linha of linhas) {
      const chave = linha.cor ?? ''
      let cor = cores.get(chave)

      if (!cor) {
        cor = { cor: linha.cor, foto: linha.foto, variantes: [] }
        cores.set(chave, cor)
      }

      cor.variantes.push({
        id: linha.variante_id,
        tamanho: linha.tamanho,
        valor: linha.valor,
        quantidade: linha.quantidade,
        disponivel: linha.disponivel === true && linha.quantidade > 0
      })
    }

    produto.cores = [...cores.values()]

    return produto
  })

  return {
    produto: data,
    carregando: pending,
    erro: computed(() => error.value?.message ?? null)
  }
}
