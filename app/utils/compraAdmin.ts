import type {
  CategoriaDespesa,
  CompraAdmin,
  KpisCompras,
  StatusCompra,
  StatusPagamentoCompra,
  TipoCompra
} from '~/types/compra-admin'

export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  'embalagem',
  'marketing',
  'logistica',
  'taxas',
  'materiais',
  'combustivel',
  'outros'
]

export const CATEGORIA_DESPESA_LABEL: Record<CategoriaDespesa, string> = {
  embalagem: 'Embalagem',
  marketing: 'Marketing',
  logistica: 'Logística',
  taxas: 'Taxas',
  materiais: 'Materiais',
  combustivel: 'Combustível',
  outros: 'Outros'
}

export const TIPO_COMPRA_LABEL: Record<TipoCompra, string> = {
  mercadoria: 'Mercadoria',
  despesa: 'Despesa'
}

export const STATUS_COMPRA_LABEL: Record<StatusCompra, string> = {
  pendente: 'Pendente',
  recebida: 'Recebida',
  cancelada: 'Cancelada'
}

export const STATUS_PAGAMENTO_COMPRA_LABEL: Record<StatusPagamentoCompra, string> = {
  pendente: 'Pendente',
  pago: 'Pago'
}

const TIPOS: TipoCompra[] = ['mercadoria', 'despesa']
const STATUS: StatusCompra[] = ['pendente', 'recebida', 'cancelada']
const STATUS_PAGAMENTO: StatusPagamentoCompra[] = ['pendente', 'pago']

export function ehTipoCompra(valor: unknown): valor is TipoCompra {
  return typeof valor === 'string' && (TIPOS as string[]).includes(valor)
}

export function ehStatusCompra(valor: unknown): valor is StatusCompra {
  return typeof valor === 'string' && (STATUS as string[]).includes(valor)
}

export function ehStatusPagamentoCompra(valor: unknown): valor is StatusPagamentoCompra {
  return typeof valor === 'string' && (STATUS_PAGAMENTO as string[]).includes(valor)
}

export function ehCategoriaDespesa(valor: unknown): valor is CategoriaDespesa {
  return typeof valor === 'string' && (CATEGORIAS_DESPESA as string[]).includes(valor)
}

export function arredondarMoeda(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 0
  }

  return Number(valor.toFixed(2))
}

export function calcularSubtotalItem(quantidade: number, valorUnitario: number): number {
  if (!Number.isFinite(quantidade) || !Number.isFinite(valorUnitario)) {
    return 0
  }

  return arredondarMoeda(quantidade * valorUnitario)
}

export function calcularSubtotalItens(
  itens: Array<{ quantidade: number; valor_unitario: number }>
): number {
  return arredondarMoeda(
    itens.reduce((soma, item) => soma + calcularSubtotalItem(item.quantidade, item.valor_unitario), 0)
  )
}

export function calcularTotalCompra(subtotal: number, frete: number, desconto: number): number {
  return arredondarMoeda(subtotal + frete - desconto)
}

export function calcularKpis(compras: CompraAdmin[]): KpisCompras {
  const kpis: KpisCompras = {
    total: 0,
    mercadorias: 0,
    despesas: 0,
    pago: 0,
    pendente: 0
  }

  for (const compra of compras) {
    // Compras canceladas deixaram de representar custo efetivo e não
    // entram nos KPIs financeiros (continuam visíveis na listagem).
    if (compra.status === 'cancelada') {
      continue
    }

    kpis.total += compra.total

    if (compra.tipo === 'mercadoria') {
      kpis.mercadorias += compra.total
    } else {
      kpis.despesas += compra.total
    }

    if (compra.status_pagamento === 'pago') {
      kpis.pago += compra.total
    } else {
      kpis.pendente += compra.total
    }
  }

  return {
    total: arredondarMoeda(kpis.total),
    mercadorias: arredondarMoeda(kpis.mercadorias),
    despesas: arredondarMoeda(kpis.despesas),
    pago: arredondarMoeda(kpis.pago),
    pendente: arredondarMoeda(kpis.pendente)
  }
}

export function resumoCompra(compra: CompraAdmin): string {
  if (compra.tipo === 'despesa') {
    const categoria = ehCategoriaDespesa(compra.categoria)
      ? CATEGORIA_DESPESA_LABEL[compra.categoria]
      : null

    if (categoria && compra.descricao) {
      return `${categoria} · ${compra.descricao}`
    }

    if (compra.descricao) {
      return compra.descricao
    }

    if (categoria) {
      return categoria
    }

    return '—'
  }

  const itens = compra.quantidade_itens

  if (itens <= 0) {
    return 'Sem itens'
  }

  return itens === 1 ? '1 item' : `${itens} itens`
}

export function podeEditarItens(status: StatusCompra): boolean {
  return status === 'pendente'
}

export function transicaoStatusCompraValida(atual: StatusCompra, destino: StatusCompra): boolean {
  if (atual !== 'pendente') {
    return false
  }

  return destino === 'recebida' || destino === 'cancelada'
}

export interface CompraValidacaoEntrada {
  tipo: TipoCompra
  subtotal?: number | null
  frete?: number | null
  desconto?: number | null
  itens?: Array<{ descricao?: string | null; quantidade?: number | null; valor_unitario?: number | null }>
}

export function validarCompraPayload(
  entrada: CompraValidacaoEntrada
): { ok: true } | { ok: false; erro: string } {
  const frete = entrada.frete ?? 0
  const desconto = entrada.desconto ?? 0

  if (frete < 0) {
    return { ok: false, erro: 'Frete não pode ser negativo.' }
  }

  if (desconto < 0) {
    return { ok: false, erro: 'Desconto não pode ser negativo.' }
  }

  let subtotal = 0

  if (entrada.tipo === 'despesa') {
    subtotal = entrada.subtotal ?? 0

    if (subtotal < 0) {
      return { ok: false, erro: 'Valor da despesa não pode ser negativo.' }
    }
  } else {
    const itens = entrada.itens ?? []

    if (itens.length < 1) {
      return { ok: false, erro: 'Informe ao menos um item de mercadoria.' }
    }

    for (const item of itens) {
      const descricao = (item.descricao ?? '').trim()
      const quantidade = item.quantidade ?? 0
      const valor = item.valor_unitario ?? 0

      if (!descricao) {
        return { ok: false, erro: 'Descrição do item é obrigatória.' }
      }

      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return { ok: false, erro: 'Quantidade do item deve ser um inteiro maior que zero.' }
      }

      if (valor < 0) {
        return { ok: false, erro: 'Valor unitário não pode ser negativo.' }
      }
    }

    subtotal = calcularSubtotalItens(
      itens.map((item) => ({
        quantidade: item.quantidade ?? 0,
        valor_unitario: item.valor_unitario ?? 0
      }))
    )
  }

  const total = calcularTotalCompra(subtotal, frete, desconto)

  if (total < 0) {
    return { ok: false, erro: 'O desconto não pode deixar o total negativo.' }
  }

  return { ok: true }
}

/**
 * Data de hoje no fuso local, no formato YYYY-MM-DD.
 * Evita o deslocamento de um dia causado por `toISOString()` (UTC).
 */
export function dataHojeLocal(agora: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`
}

export function formatarDataCompra(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  const [ano, mes, dia] = valor.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarDataHoraCompra(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return valor
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data)
}

export function mensagemParaCodigoCompra(codigo: string): string {
  const mensagens: Record<string, string> = {
    NAO_ENCONTRADO: 'Compra não encontrada.',
    TIPO_INVALIDO: 'Tipo de compra inválido.',
    CATEGORIA_INVALIDA: 'Categoria de despesa inválida.',
    FORNECEDOR_INEXISTENTE: 'Fornecedor informado não encontrado.',
    FORNECEDOR_INVALIDO: 'Selecione um fornecedor ativo.',
    MERCADORIA_SEM_ITENS: 'Informe ao menos um item de mercadoria.',
    ITEM_INVALIDO: 'Há um item inválido na compra.',
    VARIANTE_INEXISTENTE: 'Variante informada não encontrada.',
    TOTAL_INVALIDO: 'O desconto não pode deixar o total negativo.',
    PAGAMENTO_INVALIDO: 'Status de pagamento inválido.',
    TRANSICAO_INVALIDA: 'Transição de status inválida.',
    COMPRA_JA_RECEBIDA: 'Esta compra já foi recebida.',
    COMPRA_CANCELADA: 'Esta compra está cancelada.',
    DADOS_INVALIDOS: 'Dados da compra inválidos.'
  }

  return mensagens[codigo] ?? 'Erro interno do servidor.'
}
