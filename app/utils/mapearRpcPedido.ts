import type { AdminPedidoDetalhe, AdminPedidoItem, AdminPedidoLista, StatusPedido } from '~/types/pedido-admin'

export type CodigoErroRpcPedido =
  | 'NAO_ENCONTRADO'
  | 'PEDIDO_JA_FINALIZADO'
  | 'PEDIDO_CANCELADO'
  | 'TRANSICAO_INVALIDA'
  | 'ESTOQUE_INSUFICIENTE'

export interface ErroEstoqueRpcPedido {
  varianteId: number
  nomeProduto: string
  disponivel: number
  solicitado: number
}

export type RespostaRpcListaPedidos = {
  ok: true
  pedidos: AdminPedidoLista[]
}

export type RespostaRpcObterPedido =
  | { ok: true; pedido: AdminPedidoDetalhe }
  | { ok: false; codigo: CodigoErroRpcPedido; erro: string }

export type RespostaRpcAcaoPedido =
  | { ok: true; pedido: { id: number; status: StatusPedido } }
  | {
      ok: false
      codigo: CodigoErroRpcPedido
      erro: string
      erros?: ErroEstoqueRpcPedido[]
    }

const CODIGOS_ERRO: CodigoErroRpcPedido[] = [
  'NAO_ENCONTRADO',
  'PEDIDO_JA_FINALIZADO',
  'PEDIDO_CANCELADO',
  'TRANSICAO_INVALIDA',
  'ESTOQUE_INSUFICIENTE'
]

const STATUS_PEDIDO: StatusPedido[] = [
  'aguardando_atendimento',
  'aguardando_pagamento',
  'pago',
  'enviado',
  'entregue',
  'cancelado',
  'finalizado'
]

function ehStatusPedido(valor: unknown): valor is StatusPedido {
  return typeof valor === 'string' && (STATUS_PEDIDO as string[]).includes(valor)
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

function stringOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

function dataOuVazio(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function mapearPedidoLista(bruto: Record<string, unknown>): AdminPedidoLista | null {
  if (typeof bruto.id !== 'number' || !ehStatusPedido(bruto.status)) {
    return null
  }

  return {
    id: bruto.id,
    cliente_id: typeof bruto.cliente_id === 'number' ? bruto.cliente_id : null,
    status: bruto.status,
    subtotal: numero(bruto.subtotal),
    frete: numero(bruto.frete),
    total: numero(bruto.total),
    nome_cliente: stringOuNulo(bruto.nome_cliente) ?? '',
    telefone_cliente: stringOuNulo(bruto.telefone_cliente) ?? '',
    observacoes: stringOuNulo(bruto.observacoes),
    created_at: dataOuVazio(bruto.created_at),
    updated_at: dataOuVazio(bruto.updated_at),
    quantidade_itens: numero(bruto.quantidade_itens)
  }
}

function mapearItemPedido(bruto: Record<string, unknown>): AdminPedidoItem | null {
  if (typeof bruto.id !== 'number' || typeof bruto.produto_variante_id !== 'number') {
    return null
  }

  return {
    id: bruto.id,
    pedido_id: typeof bruto.pedido_id === 'number' ? bruto.pedido_id : 0,
    produto_variante_id: bruto.produto_variante_id,
    nome_produto: stringOuNulo(bruto.nome_produto) ?? '',
    cor: stringOuNulo(bruto.cor),
    tamanho: stringOuNulo(bruto.tamanho) ?? '',
    sku: stringOuNulo(bruto.sku),
    foto: stringOuNulo(bruto.foto),
    quantidade: numero(bruto.quantidade),
    valor_unitario: numero(bruto.valor_unitario),
    subtotal: numero(bruto.subtotal)
  }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

export function mapearRespostaRpcListaPedidos(bruto: unknown): RespostaRpcListaPedidos | null {
  if (!ehObjeto(bruto) || bruto.ok !== true || !Array.isArray(bruto.pedidos)) {
    return null
  }

  const pedidos: AdminPedidoLista[] = []

  for (const item of bruto.pedidos) {
    if (!ehObjeto(item)) {
      return null
    }

    const pedido = mapearPedidoLista(item)

    if (!pedido) {
      return null
    }

    pedidos.push(pedido)
  }

  return { ok: true, pedidos }
}

export function mapearRespostaRpcObterPedido(bruto: unknown): RespostaRpcObterPedido | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    if (!ehObjeto(bruto) || typeof bruto.codigo !== 'string') {
      return null
    }

    if (!(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: bruto.codigo as CodigoErroRpcPedido,
      erro: stringOuNulo(bruto.erro) ?? 'Erro interno do servidor.'
    }
  }

  const pedidoBruto = bruto.pedido

  if (!ehObjeto(pedidoBruto) || typeof pedidoBruto.id !== 'number' || !ehStatusPedido(pedidoBruto.status)) {
    return null
  }

  const itens: AdminPedidoItem[] = []

  if (Array.isArray(bruto.itens)) {
    for (const item of bruto.itens) {
      if (!ehObjeto(item)) {
        return null
      }

      const mapeado = mapearItemPedido(item)

      if (!mapeado) {
        return null
      }

      itens.push(mapeado)
    }
  }

  return {
    ok: true,
    pedido: {
      id: pedidoBruto.id,
      cliente_id: typeof pedidoBruto.cliente_id === 'number' ? pedidoBruto.cliente_id : null,
      status: pedidoBruto.status,
      subtotal: numero(pedidoBruto.subtotal),
      frete: numero(pedidoBruto.frete),
      total: numero(pedidoBruto.total),
      nome_cliente: stringOuNulo(pedidoBruto.nome_cliente) ?? '',
      telefone_cliente: stringOuNulo(pedidoBruto.telefone_cliente) ?? '',
      observacoes: stringOuNulo(pedidoBruto.observacoes),
      created_at: dataOuVazio(pedidoBruto.created_at),
      updated_at: dataOuVazio(pedidoBruto.updated_at),
      itens
    }
  }
}

export function mapearRespostaRpcAcaoPedido(bruto: unknown): RespostaRpcAcaoPedido | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === true) {
    const pedido = bruto.pedido

    if (!ehObjeto(pedido) || typeof pedido.id !== 'number' || !ehStatusPedido(pedido.status)) {
      return null
    }

    return { ok: true, pedido: { id: pedido.id, status: pedido.status } }
  }

  if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
    return null
  }

  const resposta: RespostaRpcAcaoPedido = {
    ok: false,
    codigo: bruto.codigo as CodigoErroRpcPedido,
    erro: stringOuNulo(bruto.erro) ?? 'Erro interno do servidor.'
  }

  if (Array.isArray(bruto.erros)) {
    const erros: ErroEstoqueRpcPedido[] = []

    for (const item of bruto.erros) {
      if (!ehObjeto(item)) {
        return null
      }

      erros.push({
        varianteId: numero(item.varianteId),
        nomeProduto: stringOuNulo(item.nomeProduto) ?? '',
        disponivel: numero(item.disponivel),
        solicitado: numero(item.solicitado)
      })
    }

    resposta.erros = erros
  }

  return resposta
}