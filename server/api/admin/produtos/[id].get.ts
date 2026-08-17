import { requireAdmin } from '../../../utils/requireAdmin'
import type { AdminProdutoDetalhe } from '~/types/produto-admin'

interface LinhaVariante {
  id: number
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku: string | null
  foto: string | null
}

interface LinhaFoto {
  id_variante: number
  url: string
}

export default defineEventHandler(async (event): Promise<AdminProdutoDetalhe> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const { data: produto, error: erroProduto } = await admin
    .from('produtos')
    .select('id, nome, descricao, categoria, slug')
    .eq('id', id)
    .maybeSingle()

  if (erroProduto) {
    console.error('[admin/produtos] erro ao buscar produto:', erroProduto.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!produto) {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado.' })
  }

  const { data: variantesDb, error: erroVariantes } = await admin
    .from('produto_variante')
    .select('id, cor, tamanho, valor, quantidade, sku, foto')
    .eq('produto_id', id)
    .order('id')

  if (erroVariantes) {
    console.error('[admin/produtos] erro ao buscar variantes:', erroVariantes.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const variantes = (variantesDb ?? []) as unknown as LinhaVariante[]

  const idsVariantes = variantes.map((v) => v.id)

  let fotosDb: LinhaFoto[] = []

  if (idsVariantes.length > 0) {
    const { data, error: erroFotos } = await admin
      .from('foto_variante')
      .select('url, id_variante')
      .in('id_variante', idsVariantes)

    if (erroFotos) {
      console.error('[admin/produtos] erro ao buscar fotos:', erroFotos.message)
      throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
    }

    fotosDb = (data ?? []) as unknown as LinhaFoto[]
  }

  const fotosPorVariante = new Map<number, string[]>()
  for (const foto of fotosDb) {
    const lista = fotosPorVariante.get(foto.id_variante) ?? []
    lista.push(foto.url)
    fotosPorVariante.set(foto.id_variante, lista)
  }

  const capa = variantes.find((v) => v.foto)?.foto ?? null

  return {
    id: produto.id as number,
    nome: produto.nome,
    descricao: produto.descricao,
    categoria: produto.categoria,
    slug: produto.slug,
    capa,
    variantes: variantes.map((v) => ({
      id: v.id,
      cor: v.cor,
      tamanho: v.tamanho,
      valor: v.valor,
      quantidade: v.quantidade,
      sku: v.sku,
      fotos: fotosPorVariante.get(v.id) ?? []
    }))
  }
})