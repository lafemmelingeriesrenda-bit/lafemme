import { requireAdmin } from '../../utils/requireAdmin'
import { BUCKET_LA_FEMME, validarArquivoUpload, urlPublicaBucket } from '~/utils/produtoAdmin'
import type { AdminUploadResposta } from '~/types/produto-admin'

export default defineEventHandler(async (event): Promise<AdminUploadResposta> => {
  const { admin } = await requireAdmin(event)

  const formData = await readMultipartFormData(event)

  const arquivo = formData?.find((parte) => parte.name === 'file')

  if (!arquivo || !arquivo.data || arquivo.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Envie um arquivo no campo "file".' })
  }

  const validacao = validarArquivoUpload(arquivo.type ?? null, arquivo.data.length, arquivo.data)

  if (!validacao.ok) {
    throw createError({ statusCode: validacao.status, statusMessage: validacao.erro })
  }

  const caminho = `produtos/${crypto.randomUUID()}.${validacao.extensao}`

  const { error: erroUpload } = await admin.storage
    .from(BUCKET_LA_FEMME)
    .upload(caminho, arquivo.data, {
      contentType: arquivo.type,
      cacheControl: '3600',
      upsert: false
    })

  if (erroUpload) {
    console.error('[admin/upload] erro ao enviar imagem:', erroUpload.message)
    throw createError({ statusCode: 500, statusMessage: 'Falha ao enviar a imagem.' })
  }

  const supabaseUrl = useRuntimeConfig().public.supabase.url as string

  return {
    url: urlPublicaBucket(supabaseUrl, caminho),
    storagePath: caminho
  }
})