import { requireAdmin } from '../../utils/requireAdmin'
import type { AdminProdutoLista } from '~/types/produto-admin'

interface LinhaVariante {
  id: number
  produto_id: number
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  foto: string | null
}

export default defineEventHandler(async (event): Promise<AdminProdutoLista[]> => {
  const { admin } = await requireAdmin(event)

  const [consultaProdutos, consultaVariantes] = await Promise.all([
    admin.from('produtos').select('id, nome, descricao, categoria, slug').order('id'),
    admin
      .from('produto_variante')
      .select('id, produto_id, cor, tamanho, valor, quantidade, foto')
      .order('id')
  ])

  if (consultaProdutos.error || consultaVariantes.error) {
    console.error(
      '[admin/produtos] erro ao listar produtos:',
      JSON.stringify({
        produtos: consultaProdutos.error?.message ?? null,
        variantes: consultaVariantes.error?.message ?? null
      })
    )
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const capaPorProduto = new Map<number, string>()
  const variantesPorProduto = new Map<number, Array<Omit<LinhaVariante, 'produto_id' | 'foto'>>>()

  for (const variante of (consultaVariantes.data ?? []) as unknown as LinhaVariante[]) {
    const lista = variantesPorProduto.get(variante.produto_id) ?? []
    lista.push({
      id: variante.id,
      cor: variante.cor,
      tamanho: variante.tamanho,
      valor: variante.valor,
      quantidade: variante.quantidade
    })
    variantesPorProduto.set(variante.produto_id, lista)

    if (variante.foto && !capaPorProduto.has(variante.produto_id)) {
      capaPorProduto.set(variante.produto_id, variante.foto)
    }
  }

  return ((consultaProdutos.data ?? []) as Array<{
    id: number
    nome: string
    descricao: string | null
    categoria: string | null
    slug: string | null
  }>).map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    categoria: produto.categoria,
    slug: produto.slug,
    capa: capaPorProduto.get(produto.id) ?? null,
    variantes: variantesPorProduto.get(produto.id) ?? []
  }))
})