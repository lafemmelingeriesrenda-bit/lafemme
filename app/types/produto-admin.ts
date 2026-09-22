export interface AdminVarianteLista {
  id: number
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
}

export interface AdminProdutoLista {
  id: number
  nome: string
  descricao: string | null
  categoria: string | null
  slug: string | null
  publicado: boolean
  capa: string | null
  variantes: AdminVarianteLista[]
}

export interface AdminVarianteDetalhe {
  id: number
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku: string | null
  ativo: boolean
  fotos: string[]
}

export interface AdminProdutoDetalhe {
  id: number
  nome: string
  descricao: string | null
  categoria: string | null
  slug: string | null
  publicado: boolean
  capa: string | null
  variantes: AdminVarianteDetalhe[]
}

export interface AdminVariantePayload {
  id?: number | null
  cor?: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku?: string | null
  ativo?: boolean
  imagens: string[]
}

export interface AdminProdutoPayload {
  nome: string
  descricao?: string | null
  categoria?: string | null
  capa?: string | null
  variantes: AdminVariantePayload[]
}

export interface AdminProdutoCriado {
  id: number
  variantes: Array<{
    id: number
    fotos: Array<{ id: number; url: string }>
  }>
}

export interface AdminUploadResposta {
  url: string
  storagePath: string
}
