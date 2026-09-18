export function numeroWhatsAppDigitos(valor: unknown): string {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    return ''
  }

  return String(valor).replace(/\D/g, '')
}

/**
 * Formata um número brasileiro para exibição.
 * Aceita com ou sem o código do país (55) e devolve `(DD) XXXXX-XXXX`
 * (celular, 11 dígitos) ou `(DD) XXXX-XXXX` (fixo, 10 dígitos).
 */
export function formatarTelefoneBrasil(numero: string): string {
  let digitos = numeroWhatsAppDigitos(numero)

  if (digitos.startsWith('55') && digitos.length > 11) {
    digitos = digitos.slice(2)
  }

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }

  return digitos
}
