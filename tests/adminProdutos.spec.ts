import { describe, expect, it } from 'vitest'
import {
  filtrarFotosSemOutraReferencia,
  obterUrlsFotosDoProduto,
  removerArquivosStorage
} from '../server/utils/adminProdutos'
import { BUCKET_LA_FEMME, urlPublicaBucket } from '../app/utils/produtoAdmin'

const SUPABASE_URL = 'https://projeto.supabase.co'

function urlBucket(caminho: string): string {
  return urlPublicaBucket(SUPABASE_URL, caminho)
}

interface Consulta {
  tabela: string
  seletor: string
  tipo: 'eq' | 'in' | 'neq'
  coluna: string
  valor: unknown
}

interface RespostaConsulta {
  data: unknown
  error: { message: string } | null
}

interface ChamadaStorageRemove {
  bucket: string
  caminhos: string[]
}

function criarAdminMock(
  onConsulta: (consulta: Consulta) => RespostaConsulta,
  onRemove: (bucket: string, caminhos: string[]) => void = () => {}
) {
  const remocoes: ChamadaStorageRemove[] = []

  const admin = {
    from(tabela: string) {
      return {
        select(seletor: string) {
          return {
            eq(coluna: string, valor: unknown) {
              return Promise.resolve(onConsulta({ tabela, seletor, tipo: 'eq', coluna, valor }))
            },
            in(coluna: string, valor: unknown) {
              return Promise.resolve(onConsulta({ tabela, seletor, tipo: 'in', coluna, valor }))
            },
            neq(coluna: string, valor: unknown) {
              return Promise.resolve(onConsulta({ tabela, seletor, tipo: 'neq', coluna, valor }))
            }
          }
        }
      }
    },
    storage: {
      from(bucket: string) {
        return {
          remove(caminhos: string[]) {
            remocoes.push({ bucket, caminhos })
            onRemove(bucket, caminhos)
            return Promise.resolve({ data: null, error: null })
          }
        }
      }
    },
    _remocoes: remocoes
  }

  return admin as unknown as {
    from: (tabela: string) => {
      select: (seletor: string) => {
        eq: (coluna: string, valor: unknown) => Promise<RespostaConsulta>
        in: (coluna: string, valor: unknown) => Promise<RespostaConsulta>
        neq: (coluna: string, valor: unknown) => Promise<RespostaConsulta>
      }
    }
    storage: {
      from: (bucket: string) => { remove: (caminhos: string[]) => Promise<{ data: null; error: null }> }
    }
    _remocoes: ChamadaStorageRemove[]
  }
}

describe('obterUrlsFotosDoProduto', () => {
  it('coleta capa de cada variante e fotos complementares', async () => {
    const admin = criarAdminMock((consulta) => {
      if (consulta.tabela === 'produto_variante') {
        return {
          data: [
            { id: 1, foto: urlBucket('produtos/capa.jpg') },
            { id: 2, foto: urlBucket('produtos/capa.jpg') }
          ],
          error: null
        }
      }
      if (consulta.tabela === 'foto_variante') {
        return {
          data: [
            { url: urlBucket('produtos/v1-foto1.jpg'), id_variante: 1 },
            { url: urlBucket('produtos/v1-foto2.jpg'), id_variante: 1 },
            { url: urlBucket('produtos/v2-foto1.jpg'), id_variante: 2 }
          ],
          error: null
        }
      }
      return { data: null, error: { message: 'tabela inesperada' } }
    })

    const urls = await obterUrlsFotosDoProduto(admin as never, 7)

    expect(urls).toEqual([
      urlBucket('produtos/capa.jpg'),
      urlBucket('produtos/capa.jpg'),
      urlBucket('produtos/v1-foto1.jpg'),
      urlBucket('produtos/v1-foto2.jpg'),
      urlBucket('produtos/v2-foto1.jpg')
    ])
  })

  it('retorna lista vazia quando o produto não possui variantes', async () => {
    let consultouFotosComplementares = false

    const admin = criarAdminMock((consulta) => {
      if (consulta.tabela === 'produto_variante') {
        return { data: [], error: null }
      }
      if (consulta.tabela === 'foto_variante') {
        consultouFotosComplementares = true
        return { data: [], error: null }
      }
      return { data: null, error: { message: 'tabela inesperada' } }
    })

    const urls = await obterUrlsFotosDoProduto(admin as never, 7)

    expect(urls).toEqual([])
    expect(consultouFotosComplementares).toBe(false)
  })

  it('ignora capa nula ao coletar URLs', async () => {
    const admin = criarAdminMock((consulta) => {
      if (consulta.tabela === 'produto_variante') {
        return { data: [{ id: 1, foto: null }], error: null }
      }
      return { data: [], error: null }
    })

    const urls = await obterUrlsFotosDoProduto(admin as never, 7)

    expect(urls).toEqual([])
  })

  it('filtra variantes apenas do produto consultado', async () => {
    const consultas: Consulta[] = []

    const admin = criarAdminMock((consulta) => {
      consultas.push(consulta)
      if (consulta.tabela === 'produto_variante') {
        return { data: [{ id: 1, foto: null }], error: null }
      }
      return { data: [], error: null }
    })

    await obterUrlsFotosDoProduto(admin as never, 42)

    const filtroVariantes = consultas.find((c) => c.tabela === 'produto_variante')
    expect(filtroVariantes).toMatchObject({ tipo: 'eq', coluna: 'produto_id', valor: 42 })
  })
})

describe('filtrarFotosSemOutraReferencia', () => {
  it('permite remover imagem pertencente somente ao produto editado', async () => {
    const admin = criarAdminMock(() => ({ data: [], error: null }))

    const candidatas = [urlBucket('produtos/somente-deste.jpg')]

    const resultado = await filtrarFotosSemOutraReferencia(admin as never, 7, candidatas, SUPABASE_URL)

    expect(resultado).toEqual(candidatas)
  })

  it('nunca remove imagem referenciada por outro produto na capa', async () => {
    const admin = criarAdminMock(() => ({
      data: [{ foto: urlBucket('produtos/compartilhada.jpg'), foto_variante: [] }],
      error: null
    }))

    const resultado = await filtrarFotosSemOutraReferencia(
      admin as never,
      7,
      [urlBucket('produtos/compartilhada.jpg'), urlBucket('produtos/so-deste.jpg')],
      SUPABASE_URL
    )

    expect(resultado).toEqual([urlBucket('produtos/so-deste.jpg')])
  })

  it('nunca remove imagem referenciada por outro produto como foto complementar', async () => {
    const admin = criarAdminMock(() => ({
      data: [
        {
          foto: null,
          foto_variante: [{ url: urlBucket('produtos/compartilhada-foto.jpg') }]
        }
      ],
      error: null
    }))

    const resultado = await filtrarFotosSemOutraReferencia(
      admin as never,
      7,
      [urlBucket('produtos/compartilhada-foto.jpg'), urlBucket('produtos/so-deste.jpg')],
      SUPABASE_URL
    )

    expect(resultado).toEqual([urlBucket('produtos/so-deste.jpg')])
  })

  it('consulta apenas produtos diferentes do editado', async () => {
    const consultas: Consulta[] = []

    const admin = criarAdminMock((consulta) => {
      consultas.push(consulta)
      return { data: [], error: null }
    })

    await filtrarFotosSemOutraReferencia(admin as never, 7, [urlBucket('produtos/x.jpg')], SUPABASE_URL)

    const filtro = consultas.find((c) => c.tabela === 'produto_variante')
    expect(filtro).toMatchObject({ tipo: 'neq', coluna: 'produto_id', valor: 7 })
  })

  it('normaliza caminhos equivalentes (espaço literal vs %20)', async () => {
    const comEspaco = `${SUPABASE_URL}/storage/v1/object/public/La Femme/produtos/compartilhada.jpg`

    const admin = criarAdminMock(() => ({
      data: [{ foto: comEspaco, foto_variante: [] }],
      error: null
    }))

    const resultado = await filtrarFotosSemOutraReferencia(
      admin as never,
      7,
      [urlBucket('produtos/compartilhada.jpg')],
      SUPABASE_URL
    )

    expect(resultado).toEqual([])
  })

  it('retorna lista vazia quando não há candidatas', async () => {
    const admin = criarAdminMock(() => ({ data: [], error: null }))

    const resultado = await filtrarFotosSemOutraReferencia(admin as never, 7, [], SUPABASE_URL)

    expect(resultado).toEqual([])
  })

  it('ignora candidatas fora do bucket', async () => {
    const admin = criarAdminMock(() => ({ data: [], error: null }))

    const resultado = await filtrarFotosSemOutraReferencia(
      admin as never,
      7,
      ['https://evil.com/x.jpg', urlBucket('produtos/valida.jpg')],
      SUPABASE_URL
    )

    expect(resultado).toEqual([urlBucket('produtos/valida.jpg')])
  })
})

describe('removerArquivosStorage', () => {
  it('deduplica caminhos repetidos antes de remover', async () => {
    const admin = criarAdminMock(() => ({ data: [], error: null }))
    const mock = admin as unknown as {
      _remocoes: ChamadaStorageRemove[]
    }

    await removerArquivosStorage(
      admin as never,
      [urlBucket('produtos/repetida.jpg'), urlBucket('produtos/repetida.jpg')],
      SUPABASE_URL
    )

    expect(mock._remocoes).toHaveLength(1)
    expect(mock._remocoes[0]?.bucket).toBe(BUCKET_LA_FEMME)
    expect(mock._remocoes[0]?.caminhos).toEqual([
      'produtos/repetida.jpg',
      'produtos/thumbs/repetida.webp'
    ])
  })

  it('remove também o thumbnail derivado', async () => {
    const admin = criarAdminMock(() => ({ data: [], error: null }))
    const mock = admin as unknown as {
      _remocoes: ChamadaStorageRemove[]
    }

    await removerArquivosStorage(admin as never, [urlBucket('produtos/foto.png')], SUPABASE_URL)

    expect(mock._remocoes[0]?.caminhos).toEqual(['produtos/foto.png', 'produtos/thumbs/foto.webp'])
  })

  it('não chama o Storage quando não há caminhos válidos', async () => {
    const admin = criarAdminMock(() => ({ data: [], error: null }))
    const mock = admin as unknown as {
      _remocoes: ChamadaStorageRemove[]
    }

    await removerArquivosStorage(admin as never, ['https://evil.com/x.jpg', null, ''], SUPABASE_URL)

    expect(mock._remocoes).toHaveLength(0)
  })
})