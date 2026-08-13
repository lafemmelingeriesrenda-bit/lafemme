export function slugificarProduto(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function slugBase(nome: string, id?: number): string {
  const base = slugificarProduto(nome)

  if (base) {
    return base
  }

  return id ? `produto-${id}` : ''
}

export function slugComSufixo(base: string, emUso: ReadonlyArray<string>): string {
  let candidato = base
  let n = 2

  while (emUso.includes(candidato)) {
    candidato = `${base}-${n}`
    n += 1
  }

  return candidato
}

export function urlProduto(id: number, slug: string): string {
  return `/produto/${id}-${slug}`
}

export function urlProdutoAbsoluta(siteUrl: string, id: number, slug: string): string {
  const base = siteUrl.replace(/\/+$/, '')

  return `${base}/produto/${id}-${slug}`
}

export function caminhoProdutoSeSlugDiferente(params: {
  id: number
  slugOficial: string | null
  slugDaRota: string
}): string | null {
  if (!params.slugOficial || params.slugOficial === params.slugDaRota) {
    return null
  }

  return urlProduto(params.id, params.slugOficial)
}
