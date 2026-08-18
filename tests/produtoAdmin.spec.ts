import { describe, expect, it } from 'vitest'
import {
  extensaoPorMime,
  mimePermitido,
  TAMANHO_MAXIMO_UPLOAD,
  validarArquivoUpload,
  detectarTipoImagem,
  validarProdutoPayload,
  urlPertenceAoBucket,
  storagePathDaUrl,
  urlPublicaBucket,
  calcularFotosRemover
} from '../app/utils/produtoAdmin'
import { slugBase, slugComSufixo, slugificarProduto } from '../app/utils/slugProduto'

const SUPABASE_URL = 'https://projeto.supabase.co'

function urlBucket(caminho: string): string {
  return urlPublicaBucket(SUPABASE_URL, caminho)
}

const payloadValido = {
  nome: 'Camisola Insaciável',
  descricao: 'Descrição do produto',
  categoria: 'Camisolas',
  capa: urlBucket('produtos/capa.jpg'),
  variantes: [
    {
      cor: 'Preto',
      tamanho: 'P',
      valor: 89.9,
      quantidade: 10,
      sku: 'SKU-1',
      imagens: [urlBucket('produtos/foto1.jpg')]
    }
  ]
}

describe('upload — MIME e tamanho', () => {
  it('aceita MIME de imagem permitido', () => {
    expect(mimePermitido('image/jpeg')).toBe(true)
    expect(mimePermitido('image/png')).toBe(true)
    expect(mimePermitido('image/webp')).toBe(true)
    expect(mimePermitido('image/gif')).toBe(true)
    expect(mimePermitido('image/avif')).toBe(true)
  })

  it('rejeita MIME não permitido (415)', () => {
    expect(mimePermitido('text/html')).toBe(false)
    const r = validarArquivoUpload('text/html', 100)
    expect(r).toEqual({ ok: false, status: 415, erro: expect.any(String) })
  })

  it('rejeita arquivo sem tipo (400)', () => {
    expect(validarArquivoUpload(null, 100)).toMatchObject({ ok: false, status: 400 })
  })

  it('rejeita arquivo acima de 2 MB (413)', () => {
    const r = validarArquivoUpload('image/jpeg', TAMANHO_MAXIMO_UPLOAD + 1)
    expect(r).toEqual({ ok: false, status: 413, erro: expect.any(String) })
  })

  it('aceita arquivo de até 2 MB e retorna extensão correta', () => {
    const r = validarArquivoUpload('image/webp', TAMANHO_MAXIMO_UPLOAD)
    expect(r).toEqual({ ok: true, extensao: 'webp' })
  })

  it('extensão por MIME', () => {
    expect(extensaoPorMime('image/jpeg')).toBe('jpg')
    expect(extensaoPorMime('image/png')).toBe('png')
    expect(extensaoPorMime('application/pdf')).toBeNull()
  })
})

describe('detecção de conteúdo real (magic bytes)', () => {
  function bytesBase64(base64: string): Uint8Array {
    return Buffer.from(base64, 'base64')
  }

  const png = bytesBase64(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  )

  const jpeg = bytesBase64(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
  )

  const gif = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
  ])

  function webp(): Uint8Array {
    const corpo = new Uint8Array([0x56, 0x50, 0x38, 0x4c, 0x05, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00])
    const cab = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    const tamanho = cab.length + corpo.length - 8
    cab[4] = tamanho & 0xff
    cab[5] = (tamanho >> 8) & 0xff
    cab[6] = (tamanho >> 16) & 0xff
    cab[7] = (tamanho >> 24) & 0xff
    const out = new Uint8Array(cab.length + corpo.length)
    out.set(cab, 0)
    out.set(corpo, cab.length)
    return out
  }

  function avif(): Uint8Array {
    return new Uint8Array([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00,
      0x6d, 0x69, 0x66, 0x31, 0x61, 0x76, 0x69, 0x66, 0x61, 0x76, 0x30, 0x31, 0x00, 0x00, 0x00, 0x00
    ])
  }

  it('reconhece os 5 formatos suportados', () => {
    expect(detectarTipoImagem(jpeg)).toEqual({ mime: 'image/jpeg', extensao: 'jpg' })
    expect(detectarTipoImagem(png)).toEqual({ mime: 'image/png', extensao: 'png' })
    expect(detectarTipoImagem(webp())).toEqual({ mime: 'image/webp', extensao: 'webp' })
    expect(detectarTipoImagem(gif)).toEqual({ mime: 'image/gif', extensao: 'gif' })
    expect(detectarTipoImagem(avif())).toEqual({ mime: 'image/avif', extensao: 'avif' })
  })

  it('não reconhece conteúdo que não é imagem', () => {
    const texto = new TextEncoder().encode('isto não é uma imagem, apenas texto')
    expect(detectarTipoImagem(texto)).toBeNull()
    expect(detectarTipoImagem(new Uint8Array([1, 2, 3]))).toBeNull()
  })

  it('rejeita spoofing de MIME (texto declarado image/png)', () => {
    const texto = new TextEncoder().encode('isto não é uma imagem, apenas texto')
    const r = validarArquivoUpload('image/png', texto.length, texto)
    expect(r).toEqual({ ok: false, status: 415, erro: expect.any(String) })
  })

  it('rejeita MIME declarado incompatível com o conteúdo', () => {
    const r = validarArquivoUpload('image/png', jpeg.length, jpeg)
    expect(r).toEqual({ ok: false, status: 415, erro: expect.any(String) })
  })

  it('aceita arquivos válidos por conteúdo e retorna extensão do servidor', () => {
    expect(validarArquivoUpload('image/jpeg', jpeg.length, jpeg)).toEqual({ ok: true, extensao: 'jpg' })
    expect(validarArquivoUpload('image/png', png.length, png)).toEqual({ ok: true, extensao: 'png' })
    expect(validarArquivoUpload('image/webp', webp().length, webp())).toEqual({ ok: true, extensao: 'webp' })
    expect(validarArquivoUpload('image/gif', gif.length, gif)).toEqual({ ok: true, extensao: 'gif' })
    expect(validarArquivoUpload('image/avif', avif().length, avif())).toEqual({ ok: true, extensao: 'avif' })
  })

  it('mantém rejeição por tamanho acima de 2 MB mesmo com conteúdo', () => {
    const r = validarArquivoUpload('image/png', TAMANHO_MAXIMO_UPLOAD + 1, png)
    expect(r).toEqual({ ok: false, status: 413, erro: expect.any(String) })
  })
})

describe('URLs de imagem — bucket', () => {
  it('considera URL do bucket como válida', () => {
    expect(urlPertenceAoBucket(urlBucket('produtos/x.jpg'), SUPABASE_URL)).toBe(true)
  })

  it('rejeita URL externa', () => {
    expect(urlPertenceAoBucket('https://evil.com/x.jpg', SUPABASE_URL)).toBe(false)
    expect(urlPertenceAoBucket('', SUPABASE_URL)).toBe(false)
    expect(urlPertenceAoBucket(null, SUPABASE_URL)).toBe(false)
  })

  it('extrai storagePath apenas de URL do bucket', () => {
    expect(storagePathDaUrl(urlBucket('produtos/x.jpg'), SUPABASE_URL)).toBe('produtos/x.jpg')
    expect(storagePathDaUrl('https://evil.com/produtos/x.jpg', SUPABASE_URL)).toBeNull()
    expect(storagePathDaUrl(urlBucket('produtos/../escapar.jpg'), SUPABASE_URL)).toBeNull()
  })
})

describe('URLs de Storage — validação endurecida', () => {
  const base = SUPABASE_URL

  function urlPublica(caminho: string): string {
    return `${base}/storage/v1/object/public/La%20Femme/${caminho}`
  }

  it('aceita URL pública real de objeto existente', () => {
    const url = urlPublica('produtos/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg')
    expect(urlPertenceAoBucket(url, base)).toBe(true)
    expect(storagePathDaUrl(url, base)).toBe('produtos/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg')
  })

  it('aceita espaço codificado no bucket e também espaço literal', () => {
    expect(storagePathDaUrl(urlPublica('produtos/foto1.jpg'), base)).toBe('produtos/foto1.jpg')
    const comEspaco = `${base}/storage/v1/object/public/La Femme/produtos/foto1.jpg`
    expect(storagePathDaUrl(comEspaco, base)).toBe('produtos/foto1.jpg')
  })

  it('aceita imagem real do catálogo (uuid.extensão)', () => {
    const url = urlPublica('produtos/550e8400-e29b-41d4-a716-446655440000.webp')
    expect(storagePathDaUrl(url, base)).toBe('produtos/550e8400-e29b-41d4-a716-446655440000.webp')
  })

  it('aceita URL legada na raiz do bucket (compatibilidade IMG_*.JPG)', () => {
    const url = urlPublica('IMG_20240101_123456.JPG')
    expect(urlPertenceAoBucket(url, base)).toBe(true)
    expect(storagePathDaUrl(url, base)).toBe('IMG_20240101_123456.JPG')
  })

  it('aceita URL legada na raiz também com espaço literal no bucket', () => {
    const url = `${base}/storage/v1/object/public/La Femme/foto-antiga.jpg`
    expect(storagePathDaUrl(url, base)).toBe('foto-antiga.jpg')
  })

  it('rejeita segmento único da raiz com nome inválido', () => {
    expect(storagePathDaUrl(urlPublica('..'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('.'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('a b.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('a&b.jpg'), base)).toBeNull()
  })

  it('rejeita segmento único da raiz com encoding malicioso', () => {
    expect(storagePathDaUrl(urlPublica('%2e%2e'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('%2e%2e%2f'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('a%2fb.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('a%5cb.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('a%00.jpg'), base)).toBeNull()
  })

  it('rejeita path traversal na raiz do bucket', () => {
    expect(storagePathDaUrl(urlPublica('../x.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('..%2Fx.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('%2e%2e/x.jpg'), base)).toBeNull()
  })

  it('normaliza capa legada da raiz para a URL canônica', () => {
    const r = validarProdutoPayload(
      {
        ...payloadValido,
        capa: `${base}/storage/v1/object/public/La Femme/IMG_20240101_123456.JPG`
      },
      base
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.capa).toBe(urlPublicaBucket(base, 'IMG_20240101_123456.JPG'))
    }
  })

  it('aceita imagem legada da raiz em variante', () => {
    const r = validarProdutoPayload(
      {
        ...payloadValido,
        variantes: [{ tamanho: 'P', valor: 10, quantidade: 1, imagens: [urlPublica('IMG_1.JPG')] }]
      },
      base
    )
    expect(r.ok).toBe(true)
  })

  it('rejeita outro bucket', () => {
    expect(storagePathDaUrl(`${base}/storage/v1/object/public/OutroBucket/produtos/x.jpg`, base)).toBeNull()
  })

  it('rejeita outro prefixo', () => {
    expect(storagePathDaUrl(`${base}/storage/v1/object/public/La%20Femme/outros/x.jpg`, base)).toBeNull()
  })

  it('rejeita outro host e hosts parecidos', () => {
    expect(storagePathDaUrl('https://evil.com/storage/v1/object/public/La%20Femme/produtos/x.jpg', base)).toBeNull()
    expect(
      storagePathDaUrl('https://projeto.supabase.co.evil.com/storage/v1/object/public/La%20Femme/produtos/x.jpg', base)
    ).toBeNull()
    expect(
      storagePathDaUrl('https://projetosupabase.co/storage/v1/object/public/La%20Femme/produtos/x.jpg', base)
    ).toBeNull()
  })

  it('rejeita HTTP', () => {
    expect(storagePathDaUrl(`http://projeto.supabase.co/storage/v1/object/public/La%20Femme/produtos/x.jpg`, base)).toBeNull()
  })

  it('rejeita URL relativa', () => {
    expect(storagePathDaUrl('/storage/v1/object/public/La%20Femme/produtos/x.jpg', base)).toBeNull()
    expect(storagePathDaUrl('storage/v1/object/public/La%20Femme/produtos/x.jpg', base)).toBeNull()
  })

  it('rejeita protocolos perigosos', () => {
    expect(storagePathDaUrl('javascript:alert(1)', base)).toBeNull()
    expect(storagePathDaUrl('data:image/png;base64,xxxx', base)).toBeNull()
    expect(storagePathDaUrl('file:///etc/passwd', base)).toBeNull()
  })

  it('rejeita traversal ../', () => {
    expect(storagePathDaUrl(urlPublica('produtos/../x.jpg'), base)).toBeNull()
  })

  it('rejeita traversal codificado %2e%2e', () => {
    expect(storagePathDaUrl(urlPublica('produtos/%2e%2e.jpg'), base)).toBeNull()
  })

  it('rejeita traversal codificado %2E%2E', () => {
    expect(storagePathDaUrl(urlPublica('produtos/%2E%2E.jpg'), base)).toBeNull()
  })

  it('rejeita ..%2F', () => {
    expect(storagePathDaUrl(urlPublica('produtos/..%2Fescape.jpg'), base)).toBeNull()
  })

  it('rejeita %2e%2e%2f', () => {
    expect(storagePathDaUrl(urlPublica('produtos/%2e%2e%2fescape.jpg'), base)).toBeNull()
  })

  it('rejeita barra codificada %2f isolada no nome', () => {
    expect(storagePathDaUrl(urlPublica('produtos/a%2Fb.jpg'), base)).toBeNull()
  })

  it('rejeita nome de arquivo inválido em produtos/', () => {
    expect(storagePathDaUrl(urlPublica('produtos/a b.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('produtos/a&b.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('produtos/%20%20.jpg'), base)).toBeNull()
  })

  it('rejeita backslash', () => {
    expect(storagePathDaUrl(urlPublica('produtos/a\\b.jpg'), base)).toBeNull()
  })

  it('rejeita %5c', () => {
    expect(storagePathDaUrl(urlPublica('produtos/a%5cb.jpg'), base)).toBeNull()
  })

  it('rejeita NUL e %00', () => {
    expect(storagePathDaUrl(urlPublica('produtos/a\u0000.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(urlPublica('produtos/a%00.jpg'), base)).toBeNull()
  })

  it('rejeita caminho duplicado ou ambíguo', () => {
    expect(storagePathDaUrl(urlPublica('produtos/a/b.jpg'), base)).toBeNull()
    expect(storagePathDaUrl(`${base}/storage/v1/object/public/La%20Femme/La%20Femme/produtos/x.jpg`, base)).toBeNull()
  })

  it('rejeita URL com credenciais', () => {
    expect(
      storagePathDaUrl('https://user:pass@projeto.supabase.co/storage/v1/object/public/La%20Femme/produtos/x.jpg', base)
    ).toBeNull()
  })

  it('rejeita endpoint /storage/v1/object/sign/', () => {
    expect(storagePathDaUrl(`${base}/storage/v1/object/sign/La%20Femme/produtos/x.jpg`, base)).toBeNull()
  })

  it('rejeita endpoint /storage/v1/object/authenticated/', () => {
    expect(storagePathDaUrl(`${base}/storage/v1/object/authenticated/La%20Femme/produtos/x.jpg`, base)).toBeNull()
  })

  it('rejeita URLs com query string ou fragmento', () => {
    expect(storagePathDaUrl(`${urlPublica('produtos/x.jpg')}?token=abc`, base)).toBeNull()
    expect(storagePathDaUrl(`${urlPublica('produtos/x.jpg')}#fragmento`, base)).toBeNull()
  })

  it('normaliza capa e imagens para a URL canônica do bucket', () => {
    const payload = {
      ...payloadValido,
      capa: `${base}/storage/v1/object/public/La Femme/produtos/capa.jpg`
    }
    const r = validarProdutoPayload(payload, base)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.capa).toBe(urlPublicaBucket(base, 'produtos/capa.jpg'))
      expect(r.payload.variantes[0]?.imagens[0]).toBe(urlPublicaBucket(base, 'produtos/foto1.jpg'))
    }
  })

  it('rejeita capa com prefixo errado', () => {
    const r = validarProdutoPayload(
      { ...payloadValido, capa: `${base}/storage/v1/object/public/OutroBucket/produtos/x.jpg` },
      base
    )
    expect(r.ok).toBe(false)
  })

  it('rejeita imagens com traversal', () => {
    const r = validarProdutoPayload(
      {
        ...payloadValido,
        variantes: [{ tamanho: 'P', valor: 10, quantidade: 1, imagens: [urlPublica('produtos/../x.jpg')] }]
      },
      base
    )
    expect(r.ok).toBe(false)
  })
})

describe('validação de produto', () => {
  it('aceita payload válido', () => {
    const r = validarProdutoPayload(payloadValido, SUPABASE_URL)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.nome).toBe('Camisola Insaciável')
      expect(r.payload.variantes[0]?.tamanho).toBe('P')
    }
  })

  it('rejeita nome ausente/vazio (400)', () => {
    const r = validarProdutoPayload({ ...payloadValido, nome: '   ' }, SUPABASE_URL)
    expect(r).toEqual({ ok: false, erro: expect.any(String) })
  })

  it('rejeita nome com mais de 120 caracteres', () => {
    const r = validarProdutoPayload({ ...payloadValido, nome: 'a'.repeat(121) }, SUPABASE_URL)
    expect(r.ok).toBe(false)
  })

  it('rejeita descricao com mais de 2000 caracteres', () => {
    const r = validarProdutoPayload({ ...payloadValido, descricao: 'a'.repeat(2001) }, SUPABASE_URL)
    expect(r.ok).toBe(false)
  })

  it('rejeita categoria com mais de 100 caracteres', () => {
    const r = validarProdutoPayload({ ...payloadValido, categoria: 'a'.repeat(101) }, SUPABASE_URL)
    expect(r.ok).toBe(false)
  })

  it('rejeita variantes não sendo array', () => {
    const r = validarProdutoPayload({ ...payloadValido, variantes: 'nao-array' }, SUPABASE_URL)
    expect(r.ok).toBe(false)
  })

  it('rejeita variante sem tamanho', () => {
    const r = validarProdutoPayload(
      { ...payloadValido, variantes: [{ cor: 'Preto', valor: 10, quantidade: 1, imagens: [] }] },
      SUPABASE_URL
    )
    expect(r.ok).toBe(false)
  })

  it('rejeita cor com mais de 60 caracteres', () => {
    const r = validarProdutoPayload(
      { ...payloadValido, variantes: [{ cor: 'a'.repeat(61), tamanho: 'P', valor: 10, quantidade: 1, imagens: [] }] },
      SUPABASE_URL
    )
    expect(r.ok).toBe(false)
  })

  it('rejeita valor negativo', () => {
    const r = validarProdutoPayload(
      { ...payloadValido, variantes: [{ tamanho: 'P', valor: -1, quantidade: 1, imagens: [] }] },
      SUPABASE_URL
    )
    expect(r.ok).toBe(false)
  })

  it('rejeita quantidade não inteira ou negativa', () => {
    expect(
      validarProdutoPayload(
        { ...payloadValido, variantes: [{ tamanho: 'P', valor: 10, quantidade: 1.5, imagens: [] }] },
        SUPABASE_URL
      ).ok
    ).toBe(false)
    expect(
      validarProdutoPayload(
        { ...payloadValido, variantes: [{ tamanho: 'P', valor: 10, quantidade: -1, imagens: [] }] },
        SUPABASE_URL
      ).ok
    ).toBe(false)
  })

  it('rejeita sku com mais de 40 caracteres', () => {
    const r = validarProdutoPayload(
      {
        ...payloadValido,
        variantes: [{ tamanho: 'P', valor: 10, quantidade: 1, sku: 's'.repeat(41), imagens: [] }]
      },
      SUPABASE_URL
    )
    expect(r.ok).toBe(false)
  })

  it('rejeita imagem fora do bucket', () => {
    const r = validarProdutoPayload(
      {
        ...payloadValido,
        variantes: [{ tamanho: 'P', valor: 10, quantidade: 1, imagens: ['https://evil.com/x.jpg'] }]
      },
      SUPABASE_URL
    )
    expect(r.ok).toBe(false)
  })

  it('rejeita capa fora do bucket', () => {
    const r = validarProdutoPayload({ ...payloadValido, capa: 'https://evil.com/x.jpg' }, SUPABASE_URL)
    expect(r.ok).toBe(false)
  })
})

describe('calcularFotosRemover (limpeza de Storage no PATCH)', () => {
  const base = SUPABASE_URL

  function urlPublica(caminho: string): string {
    return urlPublicaBucket(base, caminho)
  }

  it('remove imagem antiga retirada do payload', () => {
    const fotosAntigas = [urlPublica('produtos/antiga.jpg'), urlPublica('produtos/mantida.jpg')]
    const fotosNovas = [urlPublica('produtos/mantida.jpg')]

    expect(calcularFotosRemover(fotosAntigas, fotosNovas, base)).toEqual([urlPublica('produtos/antiga.jpg')])
  })

  it('preserva imagem antiga mantida no payload', () => {
    const fotosAntigas = [urlPublica('produtos/mantida.jpg')]
    const fotosNovas = [urlPublica('produtos/mantida.jpg')]

    expect(calcularFotosRemover(fotosAntigas, fotosNovas, base)).toEqual([])
  })

  it('preserva nova imagem (não existia antes)', () => {
    const fotosAntigas: string[] = []
    const fotosNovas = [urlPublica('produtos/nova.jpg')]

    expect(calcularFotosRemover(fotosAntigas, fotosNovas, base)).toEqual([])
  })

  it('nunca remove imagem de outro produto (fora do escopo de fotos antigas)', () => {
    const fotosAntigas = [urlPublica('produtos/deste-produto.jpg')]
    const fotosNovas: string[] = []

    const resultado = calcularFotosRemover(fotosAntigas, fotosNovas, base)

    expect(resultado).toEqual([urlPublica('produtos/deste-produto.jpg')])
    expect(resultado).not.toContain(urlPublica('produtos/outro-produto.jpg'))
  })

  it('ignora URLs fora do bucket', () => {
    const fotosAntigas = ['https://evil.com/x.jpg', urlPublica('produtos/valida.jpg')]
    const fotosNovas: string[] = []

    expect(calcularFotosRemover(fotosAntigas, fotosNovas, base)).toEqual([urlPublica('produtos/valida.jpg')])
  })

  it('compara por caminho de Storage, não pela string da URL', () => {
    const comEspaco = `${base}/storage/v1/object/public/La Femme/produtos/foto.jpg`

    expect(calcularFotosRemover([comEspaco], [urlPublica('produtos/foto.jpg')], base)).toEqual([])
  })

  it('deduplica caminhos repetidos', () => {
    const url = urlPublica('produtos/repetida.jpg')

    expect(calcularFotosRemover([url, url], [], base)).toEqual([url])
  })
})

describe('slug (regra reutilizada no servidor)', () => {
  it('gera slug base do nome', () => {
    expect(slugificarProduto('Camisola Insaciável')).toBe('camisola-insaciavel')
    expect(slugBase('Camisola Insaciável', 1)).toBe('camisola-insaciavel')
  })

  it('evita colisão com sufixo numérico', () => {
    expect(slugComSufixo('camisola-insaciavel', ['camisola-insaciavel'])).toBe('camisola-insaciavel-2')
    expect(slugComSufixo('camisola-insaciavel', ['camisola-insaciavel', 'camisola-insaciavel-2'])).toBe(
      'camisola-insaciavel-3'
    )
  })
})