import { describe, expect, it } from 'vitest'
import {
  filtrarFornecedores,
  formatarCnpj,
  formatarTelefoneFornecedor,
  mascaraCnpj,
  mensagemParaCodigoFornecedor,
  normalizarCnpj,
  normalizarTelefone,
  validarFornecedorPayload
} from '../app/utils/fornecedorAdmin'
import type { AdminFornecedor } from '../app/types/fornecedor-admin'

function fornecedor(over: Partial<AdminFornecedor>): AdminFornecedor {
  return {
    id: 1,
    nome: 'Fornecedor',
    cnpj: null,
    telefone: null,
    email: null,
    contato: null,
    observacao: null,
    ativo: true,
    created_at: '2026-09-21T10:00:00Z',
    updated_at: '2026-09-21T10:00:00Z',
    ...over
  }
}

const payloadValido = {
  nome: '  Moda   Íntima  Ltda ',
  cnpj: '12.345.678/0001-99',
  telefone: '(34) 99999-9999',
  email: 'contato@fornecedor.com',
  contato: '  Maria  Silva ',
  observacao: '  Observação  '
}

describe('fornecedorAdmin — normalizarCnpj', () => {
  it('remove máscara', () => {
    expect(normalizarCnpj('12.345.678/0001-99')).toBe('12345678000199')
  })

  it('retorna null para vazio/ausente', () => {
    expect(normalizarCnpj('')).toBeNull()
    expect(normalizarCnpj('   ')).toBeNull()
    expect(normalizarCnpj(null)).toBeNull()
    expect(normalizarCnpj(undefined)).toBeNull()
  })

  it('aceita número e retorna string de dígitos', () => {
    expect(normalizarCnpj(12345678000199)).toBe('12345678000199')
  })
})

describe('fornecedorAdmin — formatarCnpj', () => {
  it('formata 14 dígitos', () => {
    expect(formatarCnpj('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('formata a partir de valor com máscara', () => {
    expect(formatarCnpj('12.345.678/0001-99')).toBe('12.345.678/0001-99')
  })

  it('retorna string vazia para nulo e dígitos incompletos para valor parcial', () => {
    expect(formatarCnpj(null)).toBe('')
    expect(formatarCnpj('123')).toBe('123')
  })
})

describe('fornecedorAdmin — mascaraCnpj', () => {
  it('aplica máscara progressiva', () => {
    expect(mascaraCnpj('12')).toBe('12')
    expect(mascaraCnpj('123')).toBe('12.3')
    expect(mascaraCnpj('12345678')).toBe('12.345.678')
    expect(mascaraCnpj('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('limita a 14 dígitos e ignora não numéricos', () => {
    expect(mascaraCnpj('12a34b56c78d000199999')).toBe('12.345.678/0001-99')
  })
})

describe('fornecedorAdmin — normalizarTelefone', () => {
  it('remove máscara e mantém dígitos', () => {
    expect(normalizarTelefone('(34) 99999-9999')).toBe('34999999999')
    expect(normalizarTelefone('')).toBeNull()
    expect(normalizarTelefone(null)).toBeNull()
  })
})

describe('fornecedorAdmin — formatarTelefoneFornecedor', () => {
  it('formata celular e fixo e trata nulo', () => {
    expect(formatarTelefoneFornecedor('34999999999')).toBe('(34) 99999-9999')
    expect(formatarTelefoneFornecedor('3433334444')).toBe('(34) 3333-4444')
    expect(formatarTelefoneFornecedor(null)).toBe('—')
  })
})

describe('fornecedorAdmin — validarFornecedorPayload', () => {
  it('aceita payload válido e normaliza campos', () => {
    const r = validarFornecedorPayload(payloadValido)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.nome).toBe('Moda Íntima Ltda')
      expect(r.payload.cnpj).toBe('12345678000199')
      expect(r.payload.telefone).toBe('34999999999')
      expect(r.payload.email).toBe('contato@fornecedor.com')
      expect(r.payload.contato).toBe('Maria Silva')
      expect(r.payload.observacao).toBe('Observação')
    }
  })

  it('rejeita payload não objeto', () => {
    expect(validarFornecedorPayload(null).ok).toBe(false)
    expect(validarFornecedorPayload('texto').ok).toBe(false)
    expect(validarFornecedorPayload([1]).ok).toBe(false)
  })

  it('rejeita nome ausente, curto ou longo', () => {
    expect(validarFornecedorPayload({ ...payloadValido, nome: '' }).ok).toBe(false)
    expect(validarFornecedorPayload({ ...payloadValido, nome: 'A' }).ok).toBe(false)
    expect(validarFornecedorPayload({ ...payloadValido, nome: 'a'.repeat(121) }).ok).toBe(false)
  })

  it('rejeita CNPJ com quantidade de dígitos diferente de 14', () => {
    expect(validarFornecedorPayload({ ...payloadValido, cnpj: '123' }).ok).toBe(false)
    expect(validarFornecedorPayload({ ...payloadValido, cnpj: '1'.repeat(15) }).ok).toBe(false)
  })

  it('aceita CNPJ vazio como null', () => {
    const r = validarFornecedorPayload({ ...payloadValido, cnpj: '   ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.cnpj).toBeNull()
    }
  })

  it('rejeita telefone fora dos limites', () => {
    expect(validarFornecedorPayload({ ...payloadValido, telefone: '1234' }).ok).toBe(false)
    expect(validarFornecedorPayload({ ...payloadValido, telefone: '1'.repeat(21) }).ok).toBe(false)
  })

  it('rejeita e-mail inválido', () => {
    expect(validarFornecedorPayload({ ...payloadValido, email: 'sem-arroba' }).ok).toBe(false)
    expect(validarFornecedorPayload({ ...payloadValido, email: 'a@b' }).ok).toBe(false)
  })

  it('rejeita contato e observação acima do limite', () => {
    expect(validarFornecedorPayload({ ...payloadValido, contato: 'a'.repeat(121) }).ok).toBe(false)
    expect(validarFornecedorPayload({ ...payloadValido, observacao: 'a'.repeat(1001) }).ok).toBe(false)
  })

  it('converte campos opcionais vazios em null', () => {
    const r = validarFornecedorPayload({ nome: 'Fornecedor X' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.cnpj).toBeNull()
      expect(r.payload.telefone).toBeNull()
      expect(r.payload.email).toBeNull()
      expect(r.payload.contato).toBeNull()
      expect(r.payload.observacao).toBeNull()
    }
  })

  it('ignora campos desconhecidos', () => {
    const r = validarFornecedorPayload({ ...payloadValido, id: 9, ativo: false, created_at: 'x' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload).not.toHaveProperty('id')
      expect(r.payload).not.toHaveProperty('ativo')
      expect(r.payload).not.toHaveProperty('created_at')
    }
  })
})

describe('fornecedorAdmin — filtrarFornecedores', () => {
  const lista: AdminFornecedor[] = [
    fornecedor({ id: 1, nome: 'Alfa Tecidos', cnpj: '12345678000199', telefone: '34999999999', contato: 'Ana', ativo: true }),
    fornecedor({ id: 2, nome: 'Beta Embalagens', cnpj: '98765432000188', telefone: '3433334444', contato: 'Bruno', ativo: false }),
    fornecedor({ id: 3, nome: 'Gama Logística', ativo: true })
  ]

  it('retorna tudo sem filtros', () => {
    expect(filtrarFornecedores(lista, {})).toHaveLength(3)
  })

  it('filtra por nome (case-insensitive)', () => {
    expect(filtrarFornecedores(lista, { busca: 'alfa' }).map((f) => f.id)).toEqual([1])
  })

  it('filtra por CNPJ com ou sem máscara', () => {
    expect(filtrarFornecedores(lista, { busca: '12.345.678/0001-99' }).map((f) => f.id)).toEqual([1])
    expect(filtrarFornecedores(lista, { busca: '98765432' }).map((f) => f.id)).toEqual([2])
  })

  it('filtra por contato e telefone', () => {
    expect(filtrarFornecedores(lista, { busca: 'bruno' }).map((f) => f.id)).toEqual([2])
    expect(filtrarFornecedores(lista, { busca: '3499999' }).map((f) => f.id)).toEqual([1])
  })

  it('filtra por status ativo', () => {
    expect(filtrarFornecedores(lista, { ativo: true }).map((f) => f.id)).toEqual([1, 3])
    expect(filtrarFornecedores(lista, { ativo: false }).map((f) => f.id)).toEqual([2])
  })

  it('combina busca e status', () => {
    expect(filtrarFornecedores(lista, { busca: 'a', ativo: false }).map((f) => f.id)).toEqual([2])
  })
})

describe('fornecedorAdmin — mensagens de erro', () => {
  it('mapeia códigos conhecidos', () => {
    expect(mensagemParaCodigoFornecedor('NAO_ENCONTRADO')).toContain('não encontrado')
    expect(mensagemParaCodigoFornecedor('CNPJ_DUPLICADO')).toContain('CNPJ')
    expect(mensagemParaCodigoFornecedor('CNPJ_INVALIDO')).toContain('CNPJ')
    expect(mensagemParaCodigoFornecedor('EMAIL_INVALIDO')).toContain('E-mail')
  })

  it('usa mensagem genérica para código desconhecido', () => {
    expect(mensagemParaCodigoFornecedor('X')).toContain('Erro interno')
  })
})
