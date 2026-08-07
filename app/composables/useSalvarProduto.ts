import { useSupabaseClient } from '#imports'

export const BUCKET_LA_FEMME = 'La Femme'

export interface VarianteNovo {
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku?: string | null
  imagens: File[]
}

export interface ProdutoNovo {
  nome: string
  descricao?: string | null
  categoria?: string | null
  capa: File | null
  variantes: VarianteNovo[]
}

export interface FotoVarianteNova {
  id: number
  url: string
  idVariante: number
}

export interface VarianteSalva {
  id: number
  produtoId: number
  fotos: FotoVarianteNova[]
}

export interface ProdutoSalvo {
  id: number
  variantes: VarianteSalva[]
}

export function useSalvarProduto() {
  const supabase = useSupabaseClient()

  async function uploadImagem(arquivo: File): Promise<string> {
    const caminho = `produtos/${crypto.randomUUID()}-${arquivo.name}`

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET_LA_FEMME)
      .upload(caminho, arquivo, {
        cacheControl: '3600',
        upsert: false
      })

    if (erroUpload) {
      throw new Error(`Erro ao enviar a imagem "${arquivo.name}": ${erroUpload.message}`)
    }

    const { data } = supabase.storage.from(BUCKET_LA_FEMME).getPublicUrl(caminho)
    return data.publicUrl
  }

  async function salvar(payload: ProdutoNovo): Promise<ProdutoSalvo> {
    const { data: produto, error: erroProduto } = await supabase
      .from('produtos')
      .insert({
        nome: payload.nome,
        descricao: payload.descricao ?? null,
        categoria: payload.categoria ?? null
      })
      .select('id')
      .single()

    if (erroProduto) {
      throw new Error(erroProduto.message)
    }
    if (!produto) {
      throw new Error('O produto não foi retornado após a gravação.')
    }

    const produtoId = produto.id as number

    const urlCapa = payload.capa ? await uploadImagem(payload.capa) : null

    const variantesSalvas: VarianteSalva[] = []

    for (const v of payload.variantes) {
      const { data: variante, error: erroVariante } = await supabase
        .from('produto_variante')
        .insert({
          produto_id: produtoId,
          cor: v.cor ?? null,
          tamanho: v.tamanho,
          valor: v.valor,
          quantidade: v.quantidade,
          sku: v.sku ?? null,
          foto: urlCapa,
          ativo: true
        })
        .select('id')
        .single()

      if (erroVariante) {
        throw new Error(erroVariante.message)
      }
      if (!variante) {
        throw new Error('A variante não foi retornada após a gravação.')
      }

      const varianteId = variante.id as number

      const fotos: FotoVarianteNova[] = []
      for (const imagem of v.imagens) {
        const url = await uploadImagem(imagem)

        const { data: foto, error: erroFoto } = await supabase
          .from('foto_variante')
          .insert({
            url,
            id_variante: varianteId
          })
          .select('id')
          .single()

        if (erroFoto) {
          throw new Error(erroFoto.message)
        }
        if (!foto) {
          throw new Error('A foto não foi retornada após a gravação.')
        }

        fotos.push({
          id: foto.id as number,
          url,
          idVariante: varianteId
        })
      }

      variantesSalvas.push({
        id: varianteId,
        produtoId,
        fotos
      })
    }

    return { id: produtoId, variantes: variantesSalvas }
  }

  return { salvar, uploadImagem, bucket: BUCKET_LA_FEMME }
}