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