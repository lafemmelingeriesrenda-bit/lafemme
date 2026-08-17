import { serverSupabaseServiceRole } from '#supabase/server'
import type { FotosProdutoResposta } from '~/types/fotos-produto'

export default defineEventHandler(async (event): Promise<FotosProdutoResposta> => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data: variantes, error: erroVariantes } = await supabase
    .from('produto_variante')
    .select('id')
    .eq('produto_id', id)

  if (erroVariantes) {
    console.error('[produtos/fotos] erro ao buscar variantes do produto:', erroVariantes.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const idsVariantes = (variantes ?? []).map((variante) => variante.id as number)

  if (idsVariantes.length === 0) {
    return { fotos: [] }
  }

  const { data: fotos, error: erroFotos } = await supabase
    .from('foto_variante')
    .select('url')
    .in('id_variante', idsVariantes)

  if (erroFotos) {
    console.error('[produtos/fotos] erro ao buscar fotos do produto:', erroFotos.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  return {
    fotos: (fotos ?? [])
      .map((foto) => (foto as unknown as { url: string }).url)
      .filter((url): url is string => Boolean(url))
  }
})
