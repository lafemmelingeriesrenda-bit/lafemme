import { serverSupabaseServiceRole } from '#supabase/server'
import type { FotosProdutoResposta } from '~/types/fotos-produto'

interface LinhaVariante {
  id: number
  cor: string | null
}

interface LinhaFoto {
  id: number
  id_variante: number
  url: string
}

export default defineEventHandler(async (event): Promise<FotosProdutoResposta> => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data: variantes, error: erroVariantes } = await supabase
    .from('produto_variante')
    .select('id, cor')
    .eq('produto_id', id)
    .order('id')

  if (erroVariantes) {
    console.error('[produtos/fotos] erro ao buscar variantes do produto:', erroVariantes.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const registrosVariantes = (variantes ?? []) as unknown as LinhaVariante[]
  const idsVariantes = registrosVariantes.map((variante) => variante.id)

  if (idsVariantes.length === 0) {
    return { fotos: [] }
  }

  const corPorVariante = new Map(registrosVariantes.map((variante) => [variante.id, variante.cor]))

  const { data: fotos, error: erroFotos } = await supabase
    .from('foto_variante')
    .select('id, id_variante, url')
    .in('id_variante', idsVariantes)
    .order('id')

  if (erroFotos) {
    console.error('[produtos/fotos] erro ao buscar fotos do produto:', erroFotos.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const registrosFotos = (fotos ?? []) as unknown as LinhaFoto[]

  return {
    fotos: registrosFotos
      .filter((foto) => typeof foto.url === 'string' && foto.url.length > 0)
      .map((foto) => ({
        varianteId: foto.id_variante,
        cor: corPorVariante.get(foto.id_variante) ?? null,
        url: foto.url
      }))
  }
})
