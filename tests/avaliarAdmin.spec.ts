import { describe, expect, it } from 'vitest'
import { avaliarAdmin } from '../app/utils/avaliarAdmin'

const usuario = { id: 'user-1', email: 'a@a.com' }

describe('avaliarAdmin (requireAdmin)', () => {
  it('sem usuário autenticado -> sem_usuario (401)', () => {
    expect(avaliarAdmin(null, false)).toEqual({ tipo: 'sem_usuario' })
    expect(avaliarAdmin(undefined, true)).toEqual({ tipo: 'sem_usuario' })
  })

  it('usuário autenticado não-admin -> nao_admin (403)', () => {
    expect(avaliarAdmin(usuario, false)).toEqual({ tipo: 'nao_admin' })
  })

  it('admin autorizado -> ok', () => {
    expect(avaliarAdmin(usuario, true)).toEqual({ tipo: 'ok' })
  })

  it('não confia em metadados enviados pelo navegador', () => {
    const isAdminVindoDoPayload = true
    expect(avaliarAdmin(usuario, isAdminVindoDoPayload)).toEqual({ tipo: 'ok' })
    expect(avaliarAdmin(null, isAdminVindoDoPayload)).toEqual({ tipo: 'sem_usuario' })
    expect(avaliarAdmin(usuario, false)).toEqual({ tipo: 'nao_admin' })
  })
})