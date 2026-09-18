import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  obterUrlsFotos: vi.fn(),
  filtrarFotos: vi.fn(),
  removerArquivos: vi.fn(),
  requireAdmin: vi.fn()
}))

vi.mock('../server/utils/requireAdmin', () => ({
  requireAdmin: mocks.requireAdmin
}))

vi.mock('../server/utils/adminProdutos', () => ({
  obterUrlsFotosDoProduto: mocks.obterUrlsFotos,
  filtrarFotosSemOutraReferencia: mocks.filtrarFotos,
  removerArquivosStorage: mocks.removerArquivos
}))

let bodyAtual: unknown = null

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('getRouterParam', () => '5')
vi.stubGlobal('readBody', () => bodyAtual)
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { supabase: { url: 'https://proj.supabase.co' } }
}))
vi.stubGlobal('createError', (opts: { statusCode: number; statusMessage?: string }) => {
  const erro = new Error(opts.statusMessage ?? 'erro') as Error & {
    statusCode: number
    statusMessage?: string
  }
  erro.statusCode = opts.statusCode
  erro.statusMessage = opts.statusMessage
  return erro
})

async function carregarHandler() {
  const modulo = await import('../server/api/admin/produtos/[id].patch')
  return modulo.default
}

const payloadHistorico = {
  nome: 'Produto Editado',
  descricao: 'Descrição',
  categoria: 'Categoria',
  capa: null,
  variantes: [
    {
      id: 10,
      cor: 'Preto',
      tamanho: 'M',
      valor: 89.9,
      quantidade: 5,
      sku: 'ABC',
      ativo: true,
      imagens: []
    }
  ]
}

describe('PATCH /api/admin/produtos/:id — produto com histórico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bodyAtual = payloadHistorico
    mocks.requireAdmin.mockResolvedValue({ admin: { rpc: mocks.rpc } })
    mocks.obterUrlsFotos.mockResolvedValue([])
    mocks.filtrarFotos.mockResolvedValue([])
    mocks.removerArquivos.mockResolvedValue(undefined)
  })

  it('envia o produto com histórico para a RPC e retorna a atualização', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ok: true, id: 5, variantes: [{ id: 10, fotos: [] }] },
      error: null
    })

    const handler = await carregarHandler()
    const resposta = await handler({} as never)

    expect(mocks.rpc).toHaveBeenCalledWith('admin_atualizar_produto', {
      p_id: 5,
      p_dados: expect.objectContaining({ nome: 'Produto Editado' })
    })
    expect(resposta).toEqual({ id: 5, variantes: [{ id: 10, fotos: [] }] })
  })

  it('propaga VARIANTE_HISTORICA_IMUTAVEL como HTTP 409', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        ok: false,
        codigo: 'VARIANTE_HISTORICA_IMUTAVEL',
        erro: 'A identidade comercial da variante histórica não pode ser alterada.'
      },
      error: null
    })

    const handler = await carregarHandler()

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('propaga VARIANTE_FORA_DO_PRODUTO como HTTP 409', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ok: false, codigo: 'VARIANTE_FORA_DO_PRODUTO', erro: 'Variante de outro produto.' },
      error: null
    })

    const handler = await carregarHandler()

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('propaga PAYLOAD_INVALIDO como HTTP 400', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ok: false, codigo: 'PAYLOAD_INVALIDO', erro: 'Payload inválido.' },
      error: null
    })

    const handler = await carregarHandler()

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('propaga NAO_ENCONTRADO como HTTP 404', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ok: false, codigo: 'NAO_ENCONTRADO', erro: 'Produto não encontrado.' },
      error: null
    })

    const handler = await carregarHandler()

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('propaga VARIANTE_ATIVO_INVALIDO como HTTP 400 (não 500)', async () => {
    mocks.rpc.mockResolvedValue({
      data: { ok: false, codigo: 'VARIANTE_ATIVO_INVALIDO', erro: 'Ativo deve ser um booleano.' },
      error: null
    })

    const handler = await carregarHandler()

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 })
  })
})
