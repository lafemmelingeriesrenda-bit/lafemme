import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { BUCKET_LA_FEMME, storagePathDaUrl } from '~/utils/produtoAdmin'

export async function removerArquivosStorage(
  admin: SupabaseClient<Database>,
  urls: Array<string | null | undefined>,
  supabaseUrl: string
): Promise<void> {
  const caminhos = [
    ...new Set(
      urls
        .map((url) => storagePathDaUrl(url ?? '', supabaseUrl))
        .filter((caminho): caminho is string => caminho !== null)
    )
  ]

  if (caminhos.length === 0) {
    return
  }

  const { error } = await admin.storage.from(BUCKET_LA_FEMME).remove(caminhos)

  if (error) {
    console.error('[adminProdutos] erro ao remover arquivos do storage:', error.message)
  }
}

interface VarianteComFoto {
  id: number
  foto: string | null
}

interface FotoComIdVariante {
  url: string
  id_variante: number
}

/**
 * Coleta as URLs de todas as fotos atualmente associadas a um
 * produto (capa de cada variante + fotos complementares). Usado pelo
 * PATCH para calcular, antes do update, quais arquivos são antigos.
 */
export async function obterUrlsFotosDoProduto(
  admin: SupabaseClient<Database>,
  produtoId: number
): Promise<string[]> {
  const { data: variantes, error: erroVariantes } = await admin
    .from('produto_variante')
    .select('id, foto')
    .eq('produto_id', produtoId)

  if (erroVariantes) {
    console.error('[adminProdutos] erro ao buscar variantes:', erroVariantes.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const urls: string[] = []
  const idsVariantes: number[] = []

  for (const v of (variantes ?? []) as unknown as VarianteComFoto[]) {
    idsVariantes.push(v.id)
    if (v.foto) {
      urls.push(v.foto)
    }
  }

  if (idsVariantes.length > 0) {
    const { data: fotos, error: erroFotos } = await admin
      .from('foto_variante')
      .select('url, id_variante')
      .in('id_variante', idsVariantes)

    if (erroFotos) {
      console.error('[adminProdutos] erro ao buscar fotos:', erroFotos.message)
      throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
    }

    for (const f of (fotos ?? []) as unknown as FotoComIdVariante[]) {
      urls.push(f.url)
    }
  }

  return urls
}

/**
 * Remove das candidatas a exclusão de Storage quaisquer URLs que ainda
 * sejam referenciadas por OUTRO produto (capa ou fotos complementares).
 * Garante que um arquivo compartilhado nunca seja apagado por um PATCH
 * de outro produto.
 */
export async function filtrarFotosSemOutraReferencia(
  admin: SupabaseClient<Database>,
  produtoId: number,
  candidatas: string[],
  supabaseUrl: string
): Promise<string[]> {
  if (candidatas.length === 0) {
    return []
  }

  const caminhosCandidatos = new Set(
    candidatas
      .map((url) => storagePathDaUrl(url ?? '', supabaseUrl))
      .filter((caminho): caminho is string => caminho !== null)
  )

  if (caminhosCandidatos.size === 0) {
    return []
  }

  const [consultaVariantes, consultaItens] = await Promise.all([
    admin
      .from('produto_variante')
      .select('foto, foto_variante(url)')
      .neq('produto_id', produtoId),
    admin
      .from('itens_pedido')
      .select('foto')
  ])

  if (consultaVariantes.error || consultaItens.error) {
    const mensagemErro = consultaVariantes.error?.message ?? consultaItens.error?.message ?? 'erro desconhecido'
    console.error('[adminProdutos] erro ao verificar referências de fotos:', mensagemErro)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const referenciados = new Set<string>()

  for (const v of (consultaVariantes.data ?? []) as unknown as Array<{
    foto: string | null
    foto_variante?: Array<{ url: string }>
  }>) {
    if (v.foto) {
      const caminho = storagePathDaUrl(v.foto, supabaseUrl)
      if (caminho !== null) {
        referenciados.add(caminho)
      }
    }

    for (const f of v.foto_variante ?? []) {
      const caminho = storagePathDaUrl(f.url, supabaseUrl)
      if (caminho !== null) {
        referenciados.add(caminho)
      }
    }
  }

  for (const item of (consultaItens.data ?? []) as unknown as Array<{ foto: string | null }>) {
    if (item.foto) {
      const caminho = storagePathDaUrl(item.foto, supabaseUrl)
      if (caminho !== null) {
        referenciados.add(caminho)
      }
    }
  }

  return candidatas.filter((url) => {
    const caminho = storagePathDaUrl(url, supabaseUrl)
    return caminho !== null && !referenciados.has(caminho)
  })
}
