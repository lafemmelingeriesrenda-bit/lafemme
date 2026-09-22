import { ehStatusCompra, ehStatusPagamentoCompra, ehTipoCompra } from '~/utils/compraAdmin'
import type {
  CompraAdmin,
  CompraDetalhadaAdmin,
  FornecedorResumoCompra,
  ItemCompraAdmin
} from '~/types/compra-admin'

export type CodigoErroRpcCompra =
  | 'NAO_ENCONTRADO'
  | 'TIPO_INVALIDO'
  | 'CATEGORIA_INVALIDA'
  | 'FORNECEDOR_INEXISTENTE'
  | 'FORNECEDOR_INVALIDO'
  | 'MERCADORIA_SEM_ITENS'
  | 'ITEM_INVALIDO'
  | 'VARIANTE_INEXISTENTE'
  | 'TOTAL_INVALIDO'
  | 'PAGAMENTO_INVALIDO'
  | 'TRANSICAO_INVALIDA'
  | 'COMPRA_JA_RECEBIDA'
  | 'COMPRA_CANCELADA'
  | 'DADOS_INVALIDOS'

const CODIGOS_ERRO: CodigoErroRpcCompra[] = [
  'NAO_ENCONTRADO',
  'TIPO_INVALIDO',
  'CATEGORIA_INVALIDA',
  'FORNECEDOR_INEXISTENTE',
  'FORNECEDOR_INVALIDO',
  'MERCADORIA_SEM_ITENS',
  'ITEM_INVALIDO',
  'VARIANTE_INEXISTENTE',
  'TOTAL_INVALIDO',
  'PAGAMENTO_INVALIDO',
  'TRANSICAO_INVALIDA',
  'COMPRA_JA_RECEBIDA',
  'COMPRA_CANCELADA',
  'DADOS_INVALIDOS'
]

export type RespostaRpcListaCompras = {
  ok: true
  compras: CompraAdmin[]
}

export type RespostaRpcCompra =
  | { ok: true; compra: CompraDetalhadaAdmin }
  | { ok: false; codigo: CodigoErroRpcCompra; erro: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
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

export function mapearCompraLista(bruto: Record<string, unknown>): CompraAdmin | null {
  if (
    typeof bruto.id !== 'number' ||
    !ehTipoCompra(bruto.tipo) ||
    !ehStatusCompra(bruto.status) ||
    !ehStatusPagamentoCompra(bruto.status_pagamento)
  ) {
    return null
  }

  return {
    id: bruto.id,
    data_compra: dataOuVazio(bruto.data_compra),
    tipo: bruto.tipo,
    categoria: stringOuNulo(bruto.categoria),
    descricao: stringOuNulo(bruto.descricao),
    fornecedor_id: typeof bruto.fornecedor_id === 'number' ? bruto.fornecedor_id : null,
    fornecedor_nome: stringOuNulo(bruto.fornecedor_nome),
    subtotal: numero(bruto.subtotal),
    frete: numero(bruto.frete),
    desconto: numero(bruto.desconto),
    total: numero(bruto.total),
    status_pagamento: bruto.status_pagamento,
    status: bruto.status,
    vencimento: stringOuNulo(bruto.vencimento),
    pago_em: stringOuNulo(bruto.pago_em),
    recebida_em: stringOuNulo(bruto.recebida_em),
    cancelada_em: stringOuNulo(bruto.cancelada_em),
    updated_at: dataOuVazio(bruto.updated_at),
    quantidade_itens: numero(bruto.quantidade_itens)
  }
}

export function mapearItemCompra(bruto: Record<string, unknown>): ItemCompraAdmin | null {
  if (typeof bruto.id !== 'number' || typeof bruto.descricao !== 'string') {
    return null
  }

  return {
    id: bruto.id,
    produto_variante_id: typeof bruto.produto_variante_id === 'number' ? bruto.produto_variante_id : null,
    descricao: bruto.descricao,
    cor: stringOuNulo(bruto.cor),
    tamanho: stringOuNulo(bruto.tamanho),
    quantidade: numero(bruto.quantidade),
    valor_unitario: numero(bruto.valor_unitario),
    subtotal: numero(bruto.subtotal)
  }
}

function mapearFornecedorResumo(bruto: unknown): FornecedorResumoCompra | null {
  if (!ehObjeto(bruto) || typeof bruto.id !== 'number' || typeof bruto.nome !== 'string') {
    return null
  }

  return { id: bruto.id, nome: bruto.nome }
}

export function mapearCompraDetalhada(bruto: Record<string, unknown>): CompraDetalhadaAdmin | null {
  if (
    typeof bruto.id !== 'number' ||
    !ehTipoCompra(bruto.tipo) ||
    !ehStatusCompra(bruto.status) ||
    !ehStatusPagamentoCompra(bruto.status_pagamento)
  ) {
    return null
  }

  const itens: ItemCompraAdmin[] = []

  if (Array.isArray(bruto.itens)) {
    for (const item of bruto.itens) {
      if (!ehObjeto(item)) {
        return null
      }

      const mapeado = mapearItemCompra(item)

      if (!mapeado) {
        return null
      }

      itens.push(mapeado)
    }
  }

  let fornecedor: FornecedorResumoCompra | null = null
  if (bruto.fornecedor !== null && bruto.fornecedor !== undefined) {
    fornecedor = mapearFornecedorResumo(bruto.fornecedor)

    if (!fornecedor) {
      return null
    }
  }

  return {
    id: bruto.id,
    fornecedor_id: typeof bruto.fornecedor_id === 'number' ? bruto.fornecedor_id : null,
    tipo: bruto.tipo,
    categoria: stringOuNulo(bruto.categoria),
    descricao: stringOuNulo(bruto.descricao),
    data_compra: dataOuVazio(bruto.data_compra),
    subtotal: numero(bruto.subtotal),
    frete: numero(bruto.frete),
    desconto: numero(bruto.desconto),
    total: numero(bruto.total),
    forma_pagamento: stringOuNulo(bruto.forma_pagamento),
    status_pagamento: bruto.status_pagamento,
    vencimento: stringOuNulo(bruto.vencimento),
    pago_em: stringOuNulo(bruto.pago_em),
    status: bruto.status,
    recebida_em: stringOuNulo(bruto.recebida_em),
    cancelada_em: stringOuNulo(bruto.cancelada_em),
    observacao: stringOuNulo(bruto.observacao),
    comprovante_url: stringOuNulo(bruto.comprovante_url),
    created_at: dataOuVazio(bruto.created_at),
    updated_at: dataOuVazio(bruto.updated_at),
    fornecedor,
    itens
  }
}

export function mapearRespostaRpcListaCompras(bruto: unknown): RespostaRpcListaCompras | null {
  if (!ehObjeto(bruto) || bruto.ok !== true || !Array.isArray(bruto.compras)) {
    return null
  }

  const compras: CompraAdmin[] = []

  for (const item of bruto.compras) {
    if (!ehObjeto(item)) {
      return null
    }

    const compra = mapearCompraLista(item)

    if (!compra) {
      return null
    }

    compras.push(compra)
  }

  return { ok: true, compras }
}

export function mapearRespostaRpcCompra(bruto: unknown): RespostaRpcCompra | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: bruto.codigo as CodigoErroRpcCompra,
      erro: stringOuNulo(bruto.erro) ?? 'Erro interno do servidor.'
    }
  }

  if (!ehObjeto(bruto.compra)) {
    return null
  }

  const compra = mapearCompraDetalhada(bruto.compra)

  if (!compra) {
    return null
  }

  return { ok: true, compra }
}
