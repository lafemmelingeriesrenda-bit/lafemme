import type { FiltrosPedidosAdmin, StatusPedido, StatusPedidoOperacional } from '~/types/pedido-admin'

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  aguardando_atendimento: 'Aguardando atendimento',
  em_atendimento: 'Em atendimento',
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado'
}

const STATUS_OPERACIONAIS: StatusPedidoOperacional[] = [
  'aguardando_atendimento',
  'em_atendimento',
  'finalizado',
  'cancelado'
]

const TRANSICOES_VALIDAS: Record<StatusPedidoOperacional, StatusPedidoOperacional[]> = {
  aguardando_atendimento: ['em_atendimento', 'cancelado'],
  em_atendimento: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: []
}

export function ehStatusPedidoOperacional(valor: unknown): valor is StatusPedidoOperacional {
  return typeof valor === 'string' && (STATUS_OPERACIONAIS as string[]).includes(valor)
}

export function transicaoValida(atual: StatusPedido, destino: StatusPedido): boolean {
  if (!ehStatusPedidoOperacional(atual)) {
    return false
  }

  return (TRANSICOES_VALIDAS[atual] as StatusPedido[]).includes(destino)
}

export function mensagemParaCodigo(codigo: string): string {
  const mensagens: Record<string, string> = {
    NAO_ENCONTRADO: 'Pedido não encontrado.',
    PEDIDO_JA_FINALIZADO: 'Este pedido já foi finalizado.',
    PEDIDO_CANCELADO: 'Este pedido já foi cancelado.',
    TRANSICAO_INVALIDA: 'Esta ação não é permitida para o status atual do pedido.',
    ESTOQUE_INSUFICIENTE: 'Não há estoque suficiente para finalizar a venda.'
  }

  return mensagens[codigo] ?? 'Erro interno do servidor.'
}

export function validarFiltrosPedidos(filtros: FiltrosPedidosAdmin): { ok: true } | { ok: false; erro: string } {
  if (filtros.status && !ehStatusPedidoOperacional(filtros.status)) {
    return { ok: false, erro: 'Status de filtro inválido.' }
  }

  if (filtros.dataInicio && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.dataInicio)) {
    return { ok: false, erro: 'Data inicial inválida.' }
  }

  if (filtros.dataFim && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.dataFim)) {
    return { ok: false, erro: 'Data final inválida.' }
  }

  if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
    return { ok: false, erro: 'A data inicial não pode ser posterior à data final.' }
  }

  return { ok: true }
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatarData(valor: string): string {
  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return valor
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data)
}

export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '')

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }

  return valor
}