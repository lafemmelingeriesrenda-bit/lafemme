import { describe, expect, it, vi } from 'vitest'
import { produtoEmPedido } from '../server/utils/produtoEmPedido'
import type { Database } from '../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

function builderPara(resolucao: { data: unknown[] | null; error: unknown } | null) {
  const builder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(resolucao),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolucao)
  }

  return builder as unknown as SupabaseClient<Database>
}

describe('produtoEmPedido', () => {
  it('retorna true quando o produto tem variantes em itens_pedido', async () => {
    const admin = builderPara({ data: [{ produto_variante_id: 2 }], error: null })
    const adminVariantes = builderPara({ data: [{ id: 1 }, { id: 2 }], error: null })

    // eq consulta variantes; in/limit consultam itens (mesmo mock por query)
    ;(admin.from as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => adminVariantes)
      .mockImplementationOnce(() => adminVariantes)

    await expect(produtoEmPedido(admin, 10)).resolves.toBe(true)
  })

  it('retorna false quando nenhuma variante está em itens_pedido', async () => {
    const admin = builderPara({ data: [], error: null })
    const adminVariantes = builderPara({ data: [{ id: 1 }, { id: 2 }], error: null })
    const adminItens = builderPara({ data: [], error: null })

    ;(admin.from as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => adminVariantes)
      .mockImplementationOnce(() => adminItens)

    await expect(produtoEmPedido(admin, 10)).resolves.toBe(false)
  })

  it('retorna false quando o produto não possui variantes', async () => {
    const admin = builderPara({ data: [], error: null })

    await expect(produtoEmPedido(admin, 10)).resolves.toBe(false)
  })

  it('propaga erro na consulta de variantes', async () => {
    const admin = builderPara({ data: null, error: new Error('falha nas variantes') })

    await expect(produtoEmPedido(admin, 10)).rejects.toThrow('falha nas variantes')
  })

  it('propaga erro na consulta de itens', async () => {
    const admin = builderPara({ data: [{ id: 1 }], error: null })
    const adminItens = builderPara({ data: null, error: new Error('falha nos itens') })

    ;(admin.from as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => admin)
      .mockImplementationOnce(() => adminItens)

    await expect(produtoEmPedido(admin, 10)).rejects.toThrow('falha nos itens')
  })
})