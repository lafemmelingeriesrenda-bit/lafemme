export interface VarianteProduto {
  id: number
  tamanho: string
  valor: number
  quantidade: number
  disponivel: boolean
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

export interface LinhaCatalogo {
  produto_id: number
  nome: string
  slug: string | null
  descricao: string | null
  categoria: string | null
  cor: string | null
  variante_id: number
  tamanho: string
  valor: number
  foto: string | null
  quantidade: number
  disponivel: boolean
}

export function agruparProdutos(linhas: LinhaCatalogo[]): ProdutoCard[] {
  const grupos = new Map<string, ProdutoCard>()

  for (const item of linhas) {
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
      quantidade: item.quantidade,
      disponivel: item.disponivel === true
    })
  }

  return [...grupos.values()]
}
