export interface FotoProdutoPublica {
  varianteId: number
  cor: string | null
  url: string
}

export interface FotosProdutoResposta {
  fotos: FotoProdutoPublica[]
}
