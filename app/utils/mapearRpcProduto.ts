export interface VarianteRpcResultado {
  id: number
  fotos: Array<{ id: number; url: string }>
}

export type RespostaRpcProduto =
  | { ok: true; tipo: 'criado_ou_atualizado'; id: number; variantes: VarianteRpcResultado[] }
  | { ok: true; tipo: 'excluido'; fotos: string[] }
  | { ok: false; codigo: 'PAYLOAD_INVALIDO' | 'NAO_ENCONTRADO'; erro: string }

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

    if (codigo !== 'PAYLOAD_INVALIDO' && codigo !== 'NAO_ENCONTRADO') {
      return null
    }

    return {
      ok: false,
      codigo,
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
