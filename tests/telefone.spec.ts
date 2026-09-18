import { describe, expect, it } from 'vitest'
import { formatarTelefoneBrasil, numeroWhatsAppDigitos } from '../app/utils/telefone'

describe('numeroWhatsAppDigitos', () => {
  it('mantém apenas os dígitos', () => {
    expect(numeroWhatsAppDigitos('5534996600338')).toBe('5534996600338')
    expect(numeroWhatsAppDigitos('+55 (34) 99660-0338')).toBe('5534996600338')
  })

  it('aceita número e retorna vazio para inválidos', () => {
    expect(numeroWhatsAppDigitos(5534996600338)).toBe('5534996600338')
    expect(numeroWhatsAppDigitos(null)).toBe('')
    expect(numeroWhatsAppDigitos(undefined)).toBe('')
  })
})

describe('formatarTelefoneBrasil', () => {
  it('formata celular com código do país', () => {
    expect(formatarTelefoneBrasil('5534996600338')).toBe('(34) 99660-0338')
  })

  it('formata celular sem código do país', () => {
    expect(formatarTelefoneBrasil('34996600338')).toBe('(34) 99660-0338')
  })

  it('formata telefone fixo de 10 dígitos', () => {
    expect(formatarTelefoneBrasil('3496600338')).toBe('(34) 9660-0338')
  })

  it('retorna dígitos quando o formato não é reconhecido', () => {
    expect(formatarTelefoneBrasil('')).toBe('')
    expect(formatarTelefoneBrasil('123')).toBe('123')
  })
})
