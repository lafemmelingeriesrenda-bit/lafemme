import { describe, expect, it } from 'vitest'
import {
  ehStatusPedidoOperacional,
  formatarMoeda,
  mensagemParaCodigo,
  STATUS_PEDIDO_LABEL,
  transicaoValida,
  validarFiltrosPedidos
} from '../app/utils/pedidoAdmin'

describe('pedidoAdmin — transições de status', () => {
  it('aceita aguardando_atendimento -> finalizado e cancelado', () => {
    expect(transicaoValida('aguardando_atendimento', 'finalizado')).toBe(true)
    expect(transicaoValida('aguardando_atendimento', 'cancelado')).toBe(true)
  })

  it('rejeita qualquer transição a partir de finalizado e cancelado', () => {
    expect(transicaoValida('finalizado', 'cancelado')).toBe(false)
    expect(transicaoValida('finalizado', 'finalizado')).toBe(false)
    expect(transicaoValida('cancelado', 'finalizado')).toBe(false)
    expect(transicaoValida('cancelado', 'aguardando_atendimento')).toBe(false)
  })

  it('rejeita transições inválidas entre operacionais', () => {
    expect(transicaoValida('aguardando_atendimento', 'aguardando_atendimento')).toBe(false)
  })

  it('rejeita status fora do fluxo operacional (ex.: pago) como origem', () => {
    expect(transicaoValida('pago', 'finalizado')).toBe(false)
    expect(transicaoValida('aguardando_pagamento', 'cancelado')).toBe(false)
  })
})

describe('pedidoAdmin — ehStatusPedidoOperacional', () => {
  it('reconhece apenas os três status operacionais', () => {
    expect(ehStatusPedidoOperacional('aguardando_atendimento')).toBe(true)
    expect(ehStatusPedidoOperacional('finalizado')).toBe(true)
    expect(ehStatusPedidoOperacional('cancelado')).toBe(true)

    expect(ehStatusPedidoOperacional('pago')).toBe(false)
    expect(ehStatusPedidoOperacional('enviado')).toBe(false)
    expect(ehStatusPedidoOperacional('entregue')).toBe(false)
    expect(ehStatusPedidoOperacional('aguardando_pagamento')).toBe(false)
    expect(ehStatusPedidoOperacional('')).toBe(false)
    expect(ehStatusPedidoOperacional(null)).toBe(false)
  })

  it('não reconhece mais em_atendimento', () => {
    expect(ehStatusPedidoOperacional('em_atendimento')).toBe(false)
  })
})

describe('pedidoAdmin — rótulos', () => {
  it('possui rótulo legível para todos os status', () => {
    expect(STATUS_PEDIDO_LABEL.aguardando_atendimento).toBe('Aguardando atendimento')
    expect(STATUS_PEDIDO_LABEL.finalizado).toBe('Finalizado')
    expect(STATUS_PEDIDO_LABEL.cancelado).toBe('Cancelado')
  })

  it('não possui rótulo para em_atendimento', () => {
    expect('em_atendimento' in STATUS_PEDIDO_LABEL).toBe(false)
  })

  it('formata moeda em pt-BR', () => {
    expect(formatarMoeda(129.9)).toBe('R$ 129,90')
  })
})

describe('pedidoAdmin — mensagens de erro', () => {
  it('mapeia códigos conhecidos para mensagens amigáveis', () => {
    expect(mensagemParaCodigo('NAO_ENCONTRADO')).toContain('não encontrado')
    expect(mensagemParaCodigo('PEDIDO_JA_FINALIZADO')).toContain('finalizado')
    expect(mensagemParaCodigo('PEDIDO_CANCELADO')).toContain('cancelado')
    expect(mensagemParaCodigo('TRANSICAO_INVALIDA')).toContain('não é permitida')
    expect(mensagemParaCodigo('ESTOQUE_INSUFICIENTE')).toContain('estoque')
  })

  it('usa mensagem genérica para código desconhecido', () => {
    expect(mensagemParaCodigo('DESCONHECIDO')).toContain('Erro interno')
  })
})

describe('pedidoAdmin — validação de filtros', () => {
  it('aceita filtros vazios', () => {
    expect(validarFiltrosPedidos({})).toEqual({ ok: true })
  })

  it('aceita combinação válida de status e datas', () => {
    expect(
      validarFiltrosPedidos({
        status: 'finalizado',
        busca: 'ana',
        dataInicio: '2026-08-01',
        dataFim: '2026-08-18'
      })
    ).toEqual({ ok: true })
  })

  it('rejeita status fora do fluxo operacional', () => {
    expect(validarFiltrosPedidos({ status: 'pago' as never })).toEqual({
      ok: false,
      erro: 'Status de filtro inválido.'
    })
  })

  it('rejeita data inválida', () => {
    expect(validarFiltrosPedidos({ dataInicio: '18/08/2026' })).toEqual({
      ok: false,
      erro: 'Data inicial inválida.'
    })
  })

  it('rejeita data inicial posterior à final', () => {
    expect(validarFiltrosPedidos({ dataInicio: '2026-08-18', dataFim: '2026-08-01' })).toEqual({
      ok: false,
      erro: 'A data inicial não pode ser posterior à data final.'
    })
  })
})