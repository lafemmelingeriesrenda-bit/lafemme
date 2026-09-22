export type CodigoErroRpcRascunhoProduto =
  | 'NAO_ENCONTRADO'
  | 'ITEM_NAO_ENCONTRADO'
  | 'ITEM_JA_VINCULADO'
  | 'COMPRA_CANCELADA'
  | 'COMPRA_JA_RECEBIDA'
  | 'TIPO_INVALIDO'
  | 'VARIANTE_INEXISTENTE'
  | 'PUBLICACAO_INVALIDA'
  | 'DADOS_INVALIDOS'
  | 'PAYLOAD_INVALIDO'
  | 'VARIANTE_ID_AUSENTE'
  | 'VARIANTE_ID_DUPLICADO'
  | 'COMBINACAO_VARIANTE_DUPLICADA'
  | 'TAMANHO_UNICO_INCOMPATIVEL'
  | 'VARIANTE_ATIVO_AUSENTE'
  | 'VARIANTE_ATIVO_INVALIDO'
  | 'SEM_ITENS'
  | 'ITENS_NAO_VINCULADOS'
  | 'ENTRADA_DUPLICADA'
  | 'VARIANTE_NAO_ENCONTRADA'
  | 'ITEM_INVALIDO'
  | 'TRANSICAO_INVALIDA'
  | 'RECEBIMENTO_INVALIDO'

const CODIGOS_ERRO: CodigoErroRpcRascunhoProduto[] = [
  'NAO_ENCONTRADO',
  'ITEM_NAO_ENCONTRADO',
  'ITEM_JA_VINCULADO',
  'COMPRA_CANCELADA',
  'COMPRA_JA_RECEBIDA',
  'TIPO_INVALIDO',
  'VARIANTE_INEXISTENTE',
  'PUBLICACAO_INVALIDA',
  'DADOS_INVALIDOS',
  'PAYLOAD_INVALIDO',
  'VARIANTE_ID_AUSENTE',
  'VARIANTE_ID_DUPLICADO',
  'COMBINACAO_VARIANTE_DUPLICADA',
  'TAMANHO_UNICO_INCOMPATIVEL',
  'VARIANTE_ATIVO_AUSENTE',
  'VARIANTE_ATIVO_INVALIDO',
  'SEM_ITENS',
  'ITENS_NAO_VINCULADOS',
  'ENTRADA_DUPLICADA',
  'VARIANTE_NAO_ENCONTRADA',
  'ITEM_INVALIDO',
  'TRANSICAO_INVALIDA',
  'RECEBIMENTO_INVALIDO'
]

export type RespostaRpcRascunhoProduto =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; codigo: CodigoErroRpcRascunhoProduto; erro: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

export function mapearRespostaRpcRascunhoProduto(bruto: unknown): RespostaRpcRascunhoProduto | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: bruto.codigo as CodigoErroRpcRascunhoProduto,
      erro: typeof bruto.erro === 'string' ? bruto.erro : 'Erro interno do servidor.'
    }
  }

  return { ok: true, dados: bruto }
}
