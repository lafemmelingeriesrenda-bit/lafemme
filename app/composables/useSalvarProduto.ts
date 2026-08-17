import type { AdminProdutoPayload } from '~/types/produto-admin'
import { BUCKET_LA_FEMME } from '~/utils/produtoAdmin'

export interface ItemImagem {
  id: string
  url?: string | null
  file?: File | null
}

export interface VarianteNovo {
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku?: string | null
  imagens: ItemImagem[]
}

export interface ProdutoNovo {
  id?: number | null
  nome: string
  descricao?: string | null
  categoria?: string | null
  capa: ItemImagem | null
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
  async function uploadImagem(arquivo: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', arquivo)

    const resposta = await $fetch<{ url: string }>('/api/admin/upload', {
      method: 'POST',
      body: formData
    })

    return resposta.url
  }

  async function resolverImagem(item: ItemImagem | null | undefined): Promise<string | null> {
    if (!item) {
      return null
    }

    if (item.url) {
      return item.url
    }

    if (item.file) {
      return uploadImagem(item.file)
    }

    return null
  }

  async function resolverImagens(itens: ItemImagem[]): Promise<string[]> {
    const urls: string[] = []

    for (const item of itens) {
      const url = await resolverImagem(item)
      if (url) {
        urls.push(url)
      }
    }

    return urls
  }

  async function montarPayload(payload: ProdutoNovo): Promise<AdminProdutoPayload> {
    const capa = await resolverImagem(payload.capa)

    const variantes: AdminProdutoPayload['variantes'] = []

    for (const v of payload.variantes) {
      const imagens = await resolverImagens(v.imagens)

      variantes.push({
        cor: v.cor ?? null,
        tamanho: v.tamanho,
        valor: v.valor,
        quantidade: v.quantidade,
        sku: v.sku ?? null,
        imagens
      })
    }

    return {
      nome: payload.nome,
      descricao: payload.descricao ?? null,
      categoria: payload.categoria ?? null,
      capa,
      variantes
    }
  }

  async function salvar(payload: ProdutoNovo): Promise<ProdutoSalvo> {
    const body = await montarPayload(payload)

    const criado = await $fetch<{ id: number }>('/api/admin/produtos', {
      method: 'POST',
      body
    })

    return { id: criado.id, variantes: [] }
  }

  async function atualizar(payload: ProdutoNovo): Promise<ProdutoSalvo> {
    if (!payload.id) {
      throw new Error('Informe o identificador do produto para editá-lo.')
    }

    const body = await montarPayload(payload)

    const atualizado = await $fetch<{ id: number }>(`/api/admin/produtos/${payload.id}`, {
      method: 'PATCH',
      body
    })

    return { id: atualizado.id, variantes: [] }
  }

  return { salvar, atualizar, uploadImagem, resolverImagem, bucket: BUCKET_LA_FEMME }
}