import type { AdminFornecedor } from '~/types/fornecedor-admin'

export type CodigoErroRpcFornecedor =
  | 'NAO_ENCONTRADO'
  | 'NOME_OBRIGATORIO'
  | 'CNPJ_DUPLICADO'
  | 'CNPJ_INVALIDO'
  | 'EMAIL_INVALIDO'
  | 'LIMITE_EXCEDIDO'
  | 'DADOS_INVALIDOS'

const CODIGOS_ERRO: CodigoErroRpcFornecedor[] = [
  'NAO_ENCONTRADO',
  'NOME_OBRIGATORIO',
  'CNPJ_DUPLICADO',
  'CNPJ_INVALIDO',
  'EMAIL_INVALIDO',
  'LIMITE_EXCEDIDO',
  'DADOS_INVALIDOS'
]

export type RespostaRpcListaFornecedores = {
  ok: true
  fornecedores: AdminFornecedor[]
}

export type RespostaRpcFornecedor =
  | { ok: true; fornecedor: AdminFornecedor }
  | { ok: false; codigo: CodigoErroRpcFornecedor; erro: string }

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function stringOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null
}

function dataOuVazio(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

export function mapearFornecedor(bruto: Record<string, unknown>): AdminFornecedor | null {
  if (typeof bruto.id !== 'number' || typeof bruto.nome !== 'string' || typeof bruto.ativo !== 'boolean') {
    return null
  }

  return {
    id: bruto.id,
    nome: bruto.nome,
    cnpj: stringOuNulo(bruto.cnpj),
    telefone: stringOuNulo(bruto.telefone),
    email: stringOuNulo(bruto.email),
    contato: stringOuNulo(bruto.contato),
    observacao: stringOuNulo(bruto.observacao),
    ativo: bruto.ativo,
    created_at: dataOuVazio(bruto.created_at),
    updated_at: dataOuVazio(bruto.updated_at)
  }
}

function mapearErro(bruto: Record<string, unknown>): RespostaRpcFornecedor | null {
  if (typeof bruto.codigo !== 'string' || !(CODIGOS_ERRO as string[]).includes(bruto.codigo)) {
    return null
  }

  return {
    ok: false,
    codigo: bruto.codigo as CodigoErroRpcFornecedor,
    erro: stringOuNulo(bruto.erro) ?? 'Erro interno do servidor.'
  }
}

export function mapearRespostaRpcListaFornecedores(bruto: unknown): RespostaRpcListaFornecedores | null {
  if (!ehObjeto(bruto) || bruto.ok !== true || !Array.isArray(bruto.fornecedores)) {
    return null
  }

  const fornecedores: AdminFornecedor[] = []

  for (const item of bruto.fornecedores) {
    if (!ehObjeto(item)) {
      return null
    }

    const fornecedor = mapearFornecedor(item)

    if (!fornecedor) {
      return null
    }

    fornecedores.push(fornecedor)
  }

  return { ok: true, fornecedores }
}

export function mapearRespostaRpcFornecedor(bruto: unknown): RespostaRpcFornecedor | null {
  if (!ehObjeto(bruto) || typeof bruto.ok !== 'boolean') {
    return null
  }

  if (bruto.ok === false) {
    return mapearErro(bruto)
  }

  if (!ehObjeto(bruto.fornecedor)) {
    return null
  }

  const fornecedor = mapearFornecedor(bruto.fornecedor)

  if (!fornecedor) {
    return null
  }

  return { ok: true, fornecedor }
}
