export interface RotaPublica {
  prefixo?: string
  exata?: string
}

export const ROTAS_PUBLICAS: RotaPublica[] = [
  { exata: '/login' },
  { exata: '/catalogo' },
  { prefixo: '/produto/' },
  { prefixo: '/api/' }
]

export function rotaPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => {
    if (rota.exata !== undefined) {
      return caminho === rota.exata
    }

    return rota.prefixo !== undefined && caminho.startsWith(rota.prefixo)
  })
}