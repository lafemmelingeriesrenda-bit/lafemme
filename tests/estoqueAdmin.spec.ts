import { describe, expect, it } from 'vitest'
import {
  calcularDiferenca,
  inferirTipoAjuste,
  MOTIVO_AJUSTE_LABEL,
  motivoValidoParaTipo,
  motivosParaTipo,
  validarAjusteEstoque
} from '../app/utils/estoqueAdmin'

describe('estoqueAdmin — diferença e tipo', () => {
  it('calcula a diferença', () => {
    expect(calcularDiferenca(10, 8)).toBe(-2)
    expect(calcularDiferenca(10, 13)).toBe(3)
    expect(calcularDiferenca(10, 10)).toBe(0)
  })

  it('infere o tipo de ajuste', () => {
    expect(inferirTipoAjuste(3)).toBe('ajuste_positivo')
    expect(inferirTipoAjuste(-2)).toBe('ajuste_negativo')
    expect(inferirTipoAjuste(0)).toBeNull()
  })

  it('lista motivos por tipo', () => {
    expect(motivosParaTipo('ajuste_positivo')).toContain('inventario')
    expect(motivosParaTipo('ajuste_negativo')).toContain('avaria')
    expect(motivosParaTipo('ajuste_positivo')).not.toContain('avaria')
  })

  it('valida motivo compatível com o tipo', () => {
    expect(motivoValidoParaTipo('inventario', 'ajuste_positivo')).toBe(true)
    expect(motivoValidoParaTipo('avaria', 'ajuste_negativo')).toBe(true)
    expect(motivoValidoParaTipo('avaria', 'ajuste_positivo')).toBe(false)
    expect(motivoValidoParaTipo('inventario', 'ajuste_negativo')).toBe(false)
    expect(motivoValidoParaTipo(null, 'ajuste_positivo')).toBe(false)
  })

  it('tem labels para todos os motivos', () => {
    expect(MOTIVO_AJUSTE_LABEL.avaria).toBe('Avaria')
    expect(MOTIVO_AJUSTE_LABEL.inventario).toBe('Inventário')
    expect(MOTIVO_AJUSTE_LABEL.outro).toBe('Outro')
  })
})

describe('estoqueAdmin — validarAjusteEstoque', () => {
  it('aceita ajuste negativo válido', () => {
    expect(
      validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: 8, motivo: 'avaria' })
    ).toEqual({ ok: true, tipo: 'ajuste_negativo' })
  })

  it('aceita ajuste positivo válido', () => {
    expect(
      validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: 13, motivo: 'inventario' })
    ).toEqual({ ok: true, tipo: 'ajuste_positivo' })
  })

  it('rejeita sem alteração', () => {
    const r = validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: 10, motivo: 'inventario' })
    expect(r.ok).toBe(false)
  })

  it('rejeita quantidade negativa ou não inteira', () => {
    expect(validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: -1, motivo: 'avaria' }).ok).toBe(false)
    expect(validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: 1.5, motivo: 'avaria' }).ok).toBe(false)
  })

  it('rejeita motivo incompatível', () => {
    const r = validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: 13, motivo: 'avaria' })
    expect(r.ok).toBe(false)
  })

  it('exige observação quando motivo = outro', () => {
    expect(
      validarAjusteEstoque({ quantidadeAtual: 10, novaQuantidade: 8, motivo: 'outro' }).ok
    ).toBe(false)
    expect(
      validarAjusteEstoque({
        quantidadeAtual: 10,
        novaQuantidade: 8,
        motivo: 'outro',
        observacao: 'Peças danificadas'
      }).ok
    ).toBe(true)
  })
})
