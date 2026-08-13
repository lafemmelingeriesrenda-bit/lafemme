import { describe, expect, it } from 'vitest'
import { slugificarProduto, urlProduto } from '../app/utils/slugProduto'

describe('slugificarProduto', () => {
  it('converte nome com acentos e espaços para slug', () => {
    expect(slugificarProduto('Camisola Insaciável')).toBe('camisola-insaciavel')
  })

  it('converte espaços em hífens e remove acentos', () => {
    expect(slugificarProduto('Conjunto Madame Preto')).toBe('conjunto-madame-preto')
  })

  it('remove caracteres especiais', () => {
    expect(slugificarProduto('Vestido 1/2 e 3!')).toBe('vestido-1-2-e-3')
  })

  it('evita hífens duplicados', () => {
    expect(slugificarProduto('Camisola   Insaciável  ')).toBe('camisola-insaciavel')
  })

  it('remove hífens nas pontas', () => {
    expect(slugificarProduto('  -Camisola-  ')).toBe('camisola')
  })

  it('monta a URL pública do produto', () => {
    expect(urlProduto(10, 'Camisola Insaciável')).toBe('/produto/10-camisola-insaciavel')
  })
})
