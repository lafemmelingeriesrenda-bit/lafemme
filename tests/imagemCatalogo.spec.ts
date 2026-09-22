import { describe, expect, it } from 'vitest'
import {
  caminhoThumbStorage,
  ehCaminhoThumb,
  obterImagemCatalogo,
  urlPublicaBucket
} from '../app/utils/produtoAdmin'

const BASE = 'https://qwwwakahdmbpczntfrlq.supabase.co'

function urlOriginal(caminho: string): string {
  return urlPublicaBucket(BASE, caminho)
}

describe('produtoAdmin — caminhoThumbStorage', () => {
  it('deriva thumbnail de original em produtos/', () => {
    expect(caminhoThumbStorage('produtos/abc.jpg')).toBe('produtos/thumbs/abc.webp')
  })

  it('deriva thumbnail de original legado na raiz', () => {
    expect(caminhoThumbStorage('abc.jpg')).toBe('thumbs/abc.webp')
  })

  it('troca jpg/jpeg/png por webp', () => {
    expect(caminhoThumbStorage('produtos/a.jpeg')).toBe('produtos/thumbs/a.webp')
    expect(caminhoThumbStorage('produtos/a.png')).toBe('produtos/thumbs/a.webp')
  })

  it('preserva nomes com espaços', () => {
    expect(caminhoThumbStorage('Camisola Insaciavel vermelha.JPG')).toBe(
      'thumbs/Camisola Insaciavel vermelha.webp'
    )
  })

  it('é idempotente para caminho já em thumbs/', () => {
    expect(caminhoThumbStorage('produtos/thumbs/abc.webp')).toBe('produtos/thumbs/abc.webp')
    expect(caminhoThumbStorage('thumbs/abc.webp')).toBe('thumbs/abc.webp')
  })

  it('ehCaminhoThumb reconhece a pasta', () => {
    expect(ehCaminhoThumb('produtos/thumbs/abc.webp')).toBe(true)
    expect(ehCaminhoThumb('produtos/abc.jpg')).toBe(false)
  })
})

describe('produtoAdmin — obterImagemCatalogo', () => {
  it('transforma URL válida do bucket para o thumbnail', () => {
    expect(obterImagemCatalogo(urlOriginal('produtos/abc.jpg'), BASE)).toBe(
      urlPublicaBucket(BASE, 'produtos/thumbs/abc.webp')
    )
  })

  it('transforma URL legada da raiz', () => {
    expect(obterImagemCatalogo(urlOriginal('IMG_0475.JPG'), BASE)).toBe(
      urlPublicaBucket(BASE, 'thumbs/IMG_0475.webp')
    )
  })

  it('transforma URL legada com espaços no nome do arquivo', () => {
    const url =
      'https://qwwwakahdmbpczntfrlq.supabase.co/storage/v1/object/public/La%20Femme/Camisola%20Insaciavel%20vermelha.JPG'
    expect(obterImagemCatalogo(url, BASE)).toBe(
      urlPublicaBucket(BASE, 'thumbs/Camisola Insaciavel vermelha.webp')
    )
  })

  it('não transforma URL que já é thumbnail', () => {
    const thumbUrl = urlPublicaBucket(BASE, 'produtos/thumbs/abc.webp')
    expect(obterImagemCatalogo(thumbUrl, BASE)).toBe(thumbUrl)
  })

  it('não altera URL externa', () => {
    const externa = 'https://exemplo.com/imagens/abc.jpg'
    expect(obterImagemCatalogo(externa, BASE)).toBe(externa)
  })

  it('não altera URL inválida', () => {
    expect(obterImagemCatalogo('nao-e-url', BASE)).toBe('nao-e-url')
  })

  it('retorna string vazia para ausência de foto', () => {
    expect(obterImagemCatalogo(null, BASE)).toBe('')
    expect(obterImagemCatalogo(undefined, BASE)).toBe('')
    expect(obterImagemCatalogo('', BASE)).toBe('')
  })
})
