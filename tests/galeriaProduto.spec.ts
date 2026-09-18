import { describe, expect, it } from 'vitest'
import { mesmaCor, montarGaleria, normalizarCor } from '../app/utils/galeriaProduto'
import type { FotoProdutoPublica } from '../app/types/fotos-produto'

function foto(varianteId: number, cor: string | null, url: string): FotoProdutoPublica {
  return { varianteId, cor, url }
}

const fotos: FotoProdutoPublica[] = [
  foto(1, 'Preto', 'preto-1.jpg'),
  foto(2, 'Preto', 'preto-2.jpg'),
  foto(3, 'Vermelho', 'vermelho-1.jpg'),
  foto(4, 'Vermelho', 'vermelho-2.jpg')
]

describe('montarGaleria', () => {
  it('mostra a capa e apenas as fotos da cor selecionada (Preto)', () => {
    expect(montarGaleria('capa.jpg', fotos, 'Preto')).toEqual([
      'capa.jpg',
      'preto-1.jpg',
      'preto-2.jpg'
    ])
  })

  it('mostra a capa e apenas as fotos da cor selecionada (Vermelho)', () => {
    expect(montarGaleria('capa.jpg', fotos, 'Vermelho')).toEqual([
      'capa.jpg',
      'vermelho-1.jpg',
      'vermelho-2.jpg'
    ])
  })

  it('não mistura fotos de outras cores', () => {
    const galeria = montarGaleria(null, fotos, 'Preto')
    expect(galeria).not.toContain('vermelho-1.jpg')
    expect(galeria).not.toContain('vermelho-2.jpg')
  })

  it('remove duplicidades por URL mantendo ordem estável', () => {
    const duplicadas = [
      foto(1, 'Preto', 'x.jpg'),
      foto(2, 'Preto', 'x.jpg'),
      foto(3, 'Preto', 'y.jpg')
    ]
    expect(montarGaleria(null, duplicadas, 'Preto')).toEqual(['x.jpg', 'y.jpg'])
  })

  it('funciona para produto de cor única', () => {
    const umaCor = [foto(1, 'Branco', 'branco.jpg')]
    expect(montarGaleria('capa.jpg', umaCor, 'Branco')).toEqual(['capa.jpg', 'branco.jpg'])
  })

  it('funciona sem foto complementar', () => {
    expect(montarGaleria('capa.jpg', [], 'Preto')).toEqual(['capa.jpg'])
    expect(montarGaleria(null, [], 'Preto')).toEqual([])
  })

  it('trata cor nula/ausente sem misturar', () => {
    const semCor = [foto(1, null, 'sem-cor.jpg')]
    expect(montarGaleria(null, semCor, null)).toEqual(['sem-cor.jpg'])
    expect(montarGaleria(null, semCor, 'Preto')).toEqual([])
  })

  it('ignora URLs vazias', () => {
    const invalidas = [foto(1, 'Preto', ''), foto(2, 'Preto', 'ok.jpg')]
    expect(montarGaleria(null, invalidas, 'Preto')).toEqual(['ok.jpg'])
  })
})

describe('mesmaCor / normalizarCor', () => {
  it('compara ignorando caixa e espaços', () => {
    expect(normalizarCor('  Preto  ')).toBe('preto')
    expect(mesmaCor(' Preto ', 'preto')).toBe(true)
    expect(mesmaCor('Vermelho', 'Preto')).toBe(false)
    expect(mesmaCor(null, '')).toBe(true)
    expect(mesmaCor(undefined, null)).toBe(true)
  })
})
