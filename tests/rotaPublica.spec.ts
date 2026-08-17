import { describe, expect, it } from 'vitest'
import { ROTAS_PUBLICAS, rotaPublica } from '../app/utils/rotaPublica'

describe('rotaPublica', () => {
  it('considera /login público (exato)', () => {
    expect(rotaPublica('/login')).toBe(true)
  })

  it('considera /catalogo público (exato)', () => {
    expect(rotaPublica('/catalogo')).toBe(true)
  })

  it('considera /produto/** público (prefixo)', () => {
    expect(rotaPublica('/produto/12-camisola')).toBe(true)
    expect(rotaPublica('/produto/7-cinto')).toBe(true)
  })

  it('considera /api/** público (prefixo)', () => {
    expect(rotaPublica('/api/carrinho/validar')).toBe(true)
    expect(rotaPublica('/api/pedidos')).toBe(true)
  })

  it('considera rotas administrativas como não públicas', () => {
    expect(rotaPublica('/')).toBe(false)
    expect(rotaPublica('/produtos')).toBe(false)
    expect(rotaPublica('/clientes')).toBe(false)
    expect(rotaPublica('/compras')).toBe(false)
    expect(rotaPublica('/relatorios')).toBe(false)
  })

  it('não confunde /produtos (admin) com /produto/** (público)', () => {
    expect(rotaPublica('/produtos')).toBe(false)
    expect(rotaPublica('/produtos/1')).toBe(false)
  })

  it('lista de rotas públicas contém apenas as permitidas', () => {
    const exatas = ROTAS_PUBLICAS.map((r) => r.exata).filter(Boolean)
    expect(exatas).toEqual(['/login', '/catalogo'])
  })
})