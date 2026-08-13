export interface NovoItemCarrinho {
  varianteId: number
  produtoId: number
  nome: string
  cor: string | null
  tamanho: string
  valor: number
  foto: string | null
}

export interface ItemCarrinho extends NovoItemCarrinho {
  quantidade: number
}

export interface Carrinho {
  itens: ItemCarrinho[]
}