import type { AjusteEstoqueResultado } from '~/types/estoque-admin'

export type CodigoErroRpcAjusteEstoque =
  | 'NAO_ENCONTRADO'
  | 'QUANTIDADE_INVALIDA'
  | 'SEM_ALTERACAO'
  | 'MOTIVO_INVALIDO'
  | 'OBSERVACAO_OBRIGATORIA'
  | 'ESTOQUE_ALTERADO'

const CODIGOS_ERRO: CodigoErroRpcAjusteEstoque[] = [
  'NAO_ENCONTRADO',
  'QUANTIDADE_INVALIDA',
  'SEM_ALTERACAO',
  'MOTIVO_INVALIDO',
  'OBSERVACAO_OBRIGATORIA',
  'ESTOQUE_ALTERADO'
]

export type RespostaRpcAjusteEstoque =
  | { ok: true; resultado: AjusteEstoqueResultado }
  | { ok: false; codigo: CodigoErroRpcAjusteEstoque; erro: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

export function mapearRespostaRpcAjusteEstoque(bruto: unknown): RespostaRpcAjusteEstoque | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: bruto.codigo as CodigoErroRpcAjusteEstoque,
      erro: typeof bruto.erro === 'string' ? bruto.erro : 'Erro interno do servidor.'
    }
  }

  if (bruto.tipo !== 'ajuste_positivo' && bruto.tipo !== 'ajuste_negativo') {
    return null
  }

  return {
    ok: true,
    resultado: {
      quantidade_anterior: numero(bruto.quantidade_anterior),
      quantidade_nova: numero(bruto.quantidade_nova),
      diferenca: numero(bruto.diferenca),
      tipo: bruto.tipo,
      motivo: (typeof bruto.motivo === 'string' ? bruto.motivo : 'outro') as AjusteEstoqueResultado['motivo']
    }
  }
}
