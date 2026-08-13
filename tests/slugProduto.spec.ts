import { describe, expect, it } from 'vitest'
import {
  caminhoProdutoSeSlugDiferente,
  slugBase,
  slugComSufixo,
  slugificarProduto,
  urlProduto,
  urlProdutoAbsoluta
} from '../app/utils/slugProduto'

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

  it('retorna vazio quando não há caracteres válidos', () => {
    expect(slugificarProduto('!!!')).toBe('')
    expect(slugificarProduto('')).toBe('')
  })
})

describe('slugBase', () => {
  it('gera a base a partir do nome', () => {
    expect(slugBase('Camisola Insaciável')).toBe('camisola-insaciavel')
  })

  it('usa fallback produto-{id} quando o nome não gera slug', () => {
    expect(slugBase('!!!', 12)).toBe('produto-12')
  })

  it('retorna vazio sem id quando o nome não gera slug', () => {
    expect(slugBase('!!!')).toBe('')
  })
})

describe('slugComSufixo', () => {
  it('mantém a base quando não há colisão', () => {
    expect(slugComSufixo('camisola-insaciavel', ['outro-produto'])).toBe('camisola-insaciavel')
  })

  it('adiciona sufixo -2 quando a base já existe', () => {
    expect(slugComSufixo('camisola-insaciavel', ['camisola-insaciavel'])).toBe(
      'camisola-insaciavel-2'
    )
  })

  it('adiciona sufixo -3 quando base e -2 já existem', () => {
    expect(
      slugComSufixo('camisola-insaciavel', ['camisola-insaciavel', 'camisola-insaciavel-2'])
    ).toBe('camisola-insaciavel-3')
  })

  it('preserva slug existente (-2) quando a base está ocupada mas -2 está livre', () => {
    expect(
      slugComSufixo('camisola-insaciavel', ['camisola-insaciavel', 'camisola-insaciavel-3'])
    ).toBe('camisola-insaciavel-2')
  })
})

describe('urlProduto', () => {
  it('monta o path usando o slug oficial', () => {
    expect(urlProduto(12, 'camisola-insaciavel')).toBe('/produto/12-camisola-insaciavel')
  })

  it('preserva slug com sufixo de colisão', () => {
    expect(urlProduto(12, 'camisola-insaciavel-2')).toBe('/produto/12-camisola-insaciavel-2')
  })
})

describe('urlProdutoAbsoluta', () => {
  it('monta URL absoluta com siteUrl sem barra final', () => {
    expect(urlProdutoAbsoluta('https://lafemme-sepia.vercel.app', 1, 'camisola-insaciavel')).toBe(
      'https://lafemme-sepia.vercel.app/produto/1-camisola-insaciavel'
    )
  })

  it('monta URL absoluta com siteUrl com barra final sem gerar //produto', () => {
    expect(urlProdutoAbsoluta('https://lafemme-sepia.vercel.app/', 1, 'camisola-insaciavel')).toBe(
      'https://lafemme-sepia.vercel.app/produto/1-camisola-insaciavel'
    )
  })

  it('usa o slug oficial vindo do banco sem recalcular a partir do nome', () => {
    expect(urlProdutoAbsoluta('https://lafemme-sepia.vercel.app', 11, 'conjunto-valentina')).toBe(
      'https://lafemme-sepia.vercel.app/produto/11-conjunto-valentina'
    )
  })

  it('preserva slug com sufixo de colisão na URL absoluta', () => {
    expect(urlProdutoAbsoluta('https://lafemme-sepia.vercel.app', 12, 'camisola-insaciavel-2')).toBe(
      'https://lafemme-sepia.vercel.app/produto/12-camisola-insaciavel-2'
    )
  })

  it('remover barra final duplicada mesmo com múltiplas barras', () => {
    expect(urlProdutoAbsoluta('https://lafemme-sepia.vercel.app///', 1, 'camisola-insaciavel')).toBe(
      'https://lafemme-sepia.vercel.app/produto/1-camisola-insaciavel'
    )
  })
})

describe('caminhoProdutoSeSlugDiferente', () => {
  it('retorna null quando o slug da rota é igual ao slug oficial', () => {
    expect(
      caminhoProdutoSeSlugDiferente({
        id: 12,
        slugOficial: 'camisola-insaciavel',
        slugDaRota: 'camisola-insaciavel'
      })
    ).toBeNull()
  })

  it('redireciona para o slug oficial quando o da rota está incorreto', () => {
    expect(
      caminhoProdutoSeSlugDiferente({
        id: 12,
        slugOficial: 'camisola-insaciavel-2',
        slugDaRota: 'camisola-insaciavel'
      })
    ).toBe('/produto/12-camisola-insaciavel-2')
  })

  it('retorna null quando o produto não possui slug', () => {
    expect(
      caminhoProdutoSeSlugDiferente({
        id: 12,
        slugOficial: null,
        slugDaRota: 'qualquer-coisa'
      })
    ).toBeNull()
  })
})
