export interface VarianteRpcResultado {
  id: number
  fotos: Array<{ id: number; url: string }>
}

type CodigoErroProduto =
  | 'PAYLOAD_INVALIDO'
  | 'NAO_ENCONTRADO'
  | 'PRODUTO_EM_PEDIDO'
  | 'VARIANTE_ID_AUSENTE'
  | 'VARIANTE_ID_DUPLICADO'
  | 'VARIANTE_NAO_ENCONTRADA'
  | 'VARIANTE_FORA_DO_PRODUTO'
  | 'VARIANTE_HISTORICA_IMUTAVEL'
  | 'COMBINACAO_VARIANTE_DUPLICADA'
  | 'TAMANHO_UNICO_INCOMPATIVEL'

export type RespostaRpcProduto =
  | { ok: true; tipo: 'criado_ou_atualizado'; id: number; variantes: VarianteRpcResultado[] }
  | { ok: true; tipo: 'excluido'; fotos: string[] }
  | { ok: false; codigo: CodigoErroProduto; erro: string }

export function mapearRespostaRpcProduto(bruto: unknown): RespostaRpcProduto | null {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return null
  }

  const registro = bruto as Record<string, unknown>

  if (typeof registro.ok !== 'boolean') {
    return null
  }

  if (registro.ok === false) {
    const codigo = registro.codigo

    const codigosConhecidos = [
      'PAYLOAD_INVALIDO',
      'NAO_ENCONTRADO',
      'PRODUTO_EM_PEDIDO',
      'VARIANTE_ID_AUSENTE',
      'VARIANTE_ID_DUPLICADO',
      'VARIANTE_NAO_ENCONTRADA',
      'VARIANTE_FORA_DO_PRODUTO',
      'VARIANTE_HISTORICA_IMUTAVEL',
      'COMBINACAO_VARIANTE_DUPLICADA',
      'TAMANHO_UNICO_INCOMPATIVEL'
    ]

    if (typeof codigo !== 'string' || !codigosConhecidos.includes(codigo)) {
      return null
    }

    return {
      ok: false,
      codigo: codigo as CodigoErroProduto,
      erro: typeof registro.erro === 'string' ? registro.erro : 'Erro interno do servidor.'
    }
  }

  if (typeof registro.id === 'number' && Array.isArray(registro.variantes)) {
    return {
      ok: true,
      tipo: 'criado_ou_atualizado',
      id: registro.id,
      variantes: registro.variantes as VarianteRpcResultado[]
    }
  }

  if (Array.isArray(registro.fotos)) {
    return {
      ok: true,
      tipo: 'excluido',
      fotos: (registro.fotos as unknown[]).filter((url): url is string => typeof url === 'string')
    }
  }

  return null
}
