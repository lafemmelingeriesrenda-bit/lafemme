import sharp from 'sharp'
import { requireAdmin } from '../../utils/requireAdmin'
import {
  BUCKET_LA_FEMME,
  caminhoThumbStorage,
  validarArquivoUpload,
  urlPublicaBucket
} from '~/utils/produtoAdmin'
import type { AdminUploadResposta } from '~/types/produto-admin'

const LARGURA_THUMB = 600
const ALTURA_THUMB = 800
const QUALIDADE_THUMB = 78

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

  // Thumbnail derivado (WebP) para o catálogo. Em falha, remove o
  // original para não deixar o Storage em estado incoerente.
  try {
    const thumbBuffer = await sharp(arquivo.data)
      .rotate()
      .resize({
        width: LARGURA_THUMB,
        height: ALTURA_THUMB,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: QUALIDADE_THUMB })
      .toBuffer()

    const { error: erroThumb } = await admin.storage
      .from(BUCKET_LA_FEMME)
      .upload(caminhoThumbStorage(caminho), thumbBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false
      })

    if (erroThumb) {
      throw new Error(erroThumb.message)
    }
  } catch (erro) {
    await admin.storage.from(BUCKET_LA_FEMME).remove([caminho])
    console.error('[admin/upload] falha ao gerar thumbnail:', erro instanceof Error ? erro.message : String(erro))
    throw createError({ statusCode: 500, statusMessage: 'Falha ao processar a imagem.' })
  }

  return {
    url: urlPublicaBucket(supabaseUrl, caminho),
    storagePath: caminho
  }
})
