export function slugificarProduto(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function urlProduto(id: number, nome: string): string {
  return `/produto/${id}-${slugificarProduto(nome)}`
}
