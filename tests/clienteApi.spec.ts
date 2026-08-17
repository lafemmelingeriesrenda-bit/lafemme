import { describe, expect, it } from 'vitest'
import { validarClientePayload } from '../app/utils/clienteApi'

const payloadValido = {
  nome: 'Ana Silva',
  sobrenome: 'Souza',
  telefone: '(34) 99999-9999',
  dataNascimento: '1990-05-15'
}

describe('validarClientePayload', () => {
  it('aceita payload válido e normaliza campos', () => {
    const r = validarClientePayload(payloadValido)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.nome).toBe('Ana Silva')
      expect(r.payload.sobrenome).toBe('Souza')
      expect(r.payload.telefone).toBe('(34) 99999-9999')
      expect(r.payload.telefoneNormalizado).toBe('34999999999')
      expect(r.payload.dataNascimento).toBe('1990-05-15')
    }
  })

  it('colapsa espaços em nome e sobrenome', () => {
    const r = validarClientePayload({ ...payloadValido, nome: '  Ana    Silva  ', sobrenome: ' Souza ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.nome).toBe('Ana Silva')
      expect(r.payload.sobrenome).toBe('Souza')
    }
  })

  it('rejeita payload que não é objeto', () => {
    expect(validarClientePayload(null).ok).toBe(false)
    expect(validarClientePayload('texto').ok).toBe(false)
    expect(validarClientePayload([1, 2]).ok).toBe(false)
  })

  it('rejeita nome ausente ou vazio', () => {
    expect(validarClientePayload({ ...payloadValido, nome: undefined }).ok).toBe(false)
    expect(validarClientePayload({ ...payloadValido, nome: '' }).ok).toBe(false)
    expect(validarClientePayload({ ...payloadValido, nome: '   ' }).ok).toBe(false)
  })

  it('rejeita nome com mais de 120 caracteres', () => {
    const r = validarClientePayload({ ...payloadValido, nome: 'a'.repeat(121) })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erro).toContain('Nome')
    }
  })

  it('rejeita sobrenome com mais de 120 caracteres', () => {
    const r = validarClientePayload({ ...payloadValido, sobrenome: 'a'.repeat(121) })
    expect(r.ok).toBe(false)
  })

  it('aceita sobrenome ausente como null', () => {
    const r = validarClientePayload({ ...payloadValido, sobrenome: undefined })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.sobrenome).toBeNull()
    }
  })

  it('aceita telefone ausente como null', () => {
    const r = validarClientePayload({ ...payloadValido, telefone: null })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.telefone).toBeNull()
      expect(r.payload.telefoneNormalizado).toBeNull()
    }
  })

  it('aceita telefone vazio como null', () => {
    const r = validarClientePayload({ ...payloadValido, telefone: '   ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.telefone).toBeNull()
      expect(r.payload.telefoneNormalizado).toBeNull()
    }
  })

  it('rejeita telefone curto (menos de 8 dígitos)', () => {
    const r = validarClientePayload({ ...payloadValido, telefone: '34999' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erro).toContain('Telefone')
    }
  })

  it('rejeita telefone longo (mais de 15 dígitos)', () => {
    const r = validarClientePayload({ ...payloadValido, telefone: '3'.repeat(16) })
    expect(r.ok).toBe(false)
  })

  it('rejeita telefone não string', () => {
    const r = validarClientePayload({ ...payloadValido, telefone: 34999999999 })
    expect(r.ok).toBe(false)
  })

  it('aceita telefone mínimo de 8 dígitos', () => {
    const r = validarClientePayload({ ...payloadValido, telefone: '34999999' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.telefoneNormalizado).toBe('34999999')
    }
  })

  it('rejeita data de nascimento inválida', () => {
    expect(validarClientePayload({ ...payloadValido, dataNascimento: '2023-13-01' }).ok).toBe(false)
    expect(validarClientePayload({ ...payloadValido, dataNascimento: '2023-02-30' }).ok).toBe(false)
    expect(validarClientePayload({ ...payloadValido, dataNascimento: '15/05/1990' }).ok).toBe(false)
    expect(validarClientePayload({ ...payloadValido, dataNascimento: '1990' }).ok).toBe(false)
  })

  it('aceita data de nascimento ausente como null', () => {
    const r = validarClientePayload({ ...payloadValido, dataNascimento: null })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.dataNascimento).toBeNull()
    }
  })

  it('ignora campos desconhecidos (não propaga para o payload)', () => {
    const r = validarClientePayload({
      ...payloadValido,
      id: 999,
      role: 'admin',
      uid: 'uuid-qualquer',
      created_at: '2020-01-01T00:00:00Z'
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload).not.toHaveProperty('id')
      expect(r.payload).not.toHaveProperty('role')
      expect(r.payload).not.toHaveProperty('uid')
      expect(r.payload).not.toHaveProperty('created_at')
    }
  })

  it('rejeita payload incompleto (sem nome)', () => {
    const r = validarClientePayload({ telefone: '(34) 99999-9999' })
    expect(r.ok).toBe(false)
  })
})
