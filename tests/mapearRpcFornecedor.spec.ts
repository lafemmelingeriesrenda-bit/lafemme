import { describe, expect, it } from 'vitest'
import {
  mapearRespostaRpcFornecedor,
  mapearRespostaRpcListaFornecedores
} from '../app/utils/mapearRpcFornecedor'

const fornecedorBruto = {
  id: 5,
  nome: 'Moda Íntima Ltda',
  cnpj: '12345678000199',
  telefone: '34999999999',
  email: 'contato@fornecedor.com',
  contato: 'Maria',
  observacao: null,
  ativo: true,
  created_at: '2026-09-21T10:00:00Z',
  updated_at: '2026-09-21T10:00:00Z'
}

describe('mapearRespostaRpcListaFornecedores', () => {
  it('mapeia lista válida', () => {
    const r = mapearRespostaRpcListaFornecedores({ ok: true, fornecedores: [fornecedorBruto] })
    expect(r?.fornecedores).toHaveLength(1)
    expect(r?.fornecedores[0].id).toBe(5)
    expect(r?.fornecedores[0].ativo).toBe(true)
  })

  it('mapeia lista vazia', () => {
    expect(mapearRespostaRpcListaFornecedores({ ok: true, fornecedores: [] })).toEqual({
      ok: true,
      fornecedores: []
    })
  })

  it('retorna null para resposta inválida', () => {
    expect(mapearRespostaRpcListaFornecedores({ ok: true })).toBeNull()
    expect(mapearRespostaRpcListaFornecedores({ ok: false })).toBeNull()
    expect(mapearRespostaRpcListaFornecedores(null)).toBeNull()
  })

  it('retorna null se algum item for inválido', () => {
    expect(
      mapearRespostaRpcListaFornecedores({ ok: true, fornecedores: [{ ...fornecedorBruto, id: 'x' }] })
    ).toBeNull()
  })
})

describe('mapearRespostaRpcFornecedor', () => {
  it('mapeia sucesso', () => {
    const r = mapearRespostaRpcFornecedor({ ok: true, fornecedor: fornecedorBruto })
    expect(r?.ok).toBe(true)
    if (r?.ok) {
      expect(r.fornecedor.nome).toBe('Moda Íntima Ltda')
      expect(r.fornecedor.observacao).toBeNull()
    }
  })

  it('mapeia erro NAO_ENCONTRADO', () => {
    const r = mapearRespostaRpcFornecedor({
      ok: false,
      codigo: 'NAO_ENCONTRADO',
      erro: 'Fornecedor não encontrado.'
    })
    expect(r).toEqual({ ok: false, codigo: 'NAO_ENCONTRADO', erro: 'Fornecedor não encontrado.' })
  })

  it('mapeia erro CNPJ_DUPLICADO', () => {
    const r = mapearRespostaRpcFornecedor({
      ok: false,
      codigo: 'CNPJ_DUPLICADO',
      erro: 'Já existe um fornecedor cadastrado com este CNPJ.'
    })
    expect(r?.ok).toBe(false)
    if (r && !r.ok) {
      expect(r.codigo).toBe('CNPJ_DUPLICADO')
    }
  })

  it('retorna null para código desconhecido', () => {
    expect(mapearRespostaRpcFornecedor({ ok: false, codigo: 'X', erro: 'x' })).toBeNull()
  })

  it('retorna null para sucesso sem fornecedor válido', () => {
    expect(mapearRespostaRpcFornecedor({ ok: true, fornecedor: { id: 'x' } })).toBeNull()
    expect(mapearRespostaRpcFornecedor({ ok: true })).toBeNull()
  })

  it('retorna null para payload inválido', () => {
    expect(mapearRespostaRpcFornecedor(null)).toBeNull()
    expect(mapearRespostaRpcFornecedor('texto')).toBeNull()
  })
})
