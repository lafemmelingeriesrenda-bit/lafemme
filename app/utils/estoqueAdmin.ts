import type {
  MotivoAjusteEstoque,
  MotivoAjusteNegativo,
  MotivoAjustePositivo,
  TipoAjusteEstoque
} from '~/types/estoque-admin'

export const MOTIVOS_AJUSTE_POSITIVO: MotivoAjustePositivo[] = [
  'inventario',
  'correcao_cadastro',
  'devolucao_cliente',
  'retorno_promocao',
  'outro'
]

export const MOTIVOS_AJUSTE_NEGATIVO: MotivoAjusteNegativo[] = [
  'avaria',
  'brinde',
  'promocao',
  'perda',
  'uso_interno',
  'erro_inventario',
  'devolucao_fornecedor',
  'outro'
]

export const MOTIVO_AJUSTE_LABEL: Record<MotivoAjusteEstoque, string> = {
  inventario: 'Inventário',
  correcao_cadastro: 'Correção de cadastro',
  devolucao_cliente: 'Devolução de cliente',
  retorno_promocao: 'Retorno de promoção',
  avaria: 'Avaria',
  brinde: 'Brinde',
  promocao: 'Promoção',
  perda: 'Perda',
  uso_interno: 'Uso interno',
  erro_inventario: 'Erro de inventário',
  devolucao_fornecedor: 'Devolução ao fornecedor',
  outro: 'Outro'
}

export function calcularDiferenca(quantidadeAtual: number, novaQuantidade: number): number {
  if (!Number.isFinite(quantidadeAtual) || !Number.isFinite(novaQuantidade)) {
    return 0
  }

  return novaQuantidade - quantidadeAtual
}

export function inferirTipoAjuste(diferenca: number): TipoAjusteEstoque | null {
  if (diferenca > 0) {
    return 'ajuste_positivo'
  }

  if (diferenca < 0) {
    return 'ajuste_negativo'
  }

  return null
}

export function motivosParaTipo(tipo: TipoAjusteEstoque): MotivoAjusteEstoque[] {
  return tipo === 'ajuste_positivo' ? [...MOTIVOS_AJUSTE_POSITIVO] : [...MOTIVOS_AJUSTE_NEGATIVO]
}

export function motivoValidoParaTipo(motivo: unknown, tipo: TipoAjusteEstoque): motivo is MotivoAjusteEstoque {
  if (typeof motivo !== 'string') {
    return false
  }

  return motivosParaTipo(tipo).includes(motivo as MotivoAjusteEstoque)
}

export interface AjusteEstoqueValidacao {
  quantidadeAtual: number
  novaQuantidade: number
  motivo: unknown
  observacao?: unknown
}

export function validarAjusteEstoque(
  entrada: AjusteEstoqueValidacao
): { ok: true; tipo: TipoAjusteEstoque } | { ok: false; erro: string } {
  const { quantidadeAtual, novaQuantidade } = entrada

  if (!Number.isInteger(novaQuantidade) || novaQuantidade < 0) {
    return { ok: false, erro: 'A nova quantidade deve ser um inteiro maior ou igual a zero.' }
  }

  const diferenca = calcularDiferenca(quantidadeAtual, novaQuantidade)
  const tipo = inferirTipoAjuste(diferenca)

  if (!tipo) {
    return { ok: false, erro: 'A nova quantidade é igual à atual.' }
  }

  if (!motivoValidoParaTipo(entrada.motivo, tipo)) {
    return { ok: false, erro: 'Selecione um motivo válido para o ajuste.' }
  }

  const observacao = typeof entrada.observacao === 'string' ? entrada.observacao.trim() : ''

  if (entrada.motivo === 'outro' && observacao.length === 0) {
    return { ok: false, erro: 'Para o motivo "Outro", informe uma observação.' }
  }

  return { ok: true, tipo }
}
