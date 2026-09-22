import type { AdminFornecedor, FiltrosFornecedoresAdmin } from '~/types/fornecedor-admin'
import { formatarTelefoneBrasil } from '~/utils/telefone'

export interface FornecedorPayloadNormalizado {
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  observacao: string | null
}

export type ResultadoValidacaoFornecedor =
  | { ok: true; payload: FornecedorPayloadNormalizado }
  | { ok: false; erro: string }

const MAX_NOME = 120
const MIN_NOME = 2
const MAX_EMAIL = 160
const MIN_EMAIL = 5
const MAX_CONTATO = 120
const MAX_OBSERVACAO = 1000
const MIN_TELEFONE_DIGITOS = 8
const MAX_TELEFONE_DIGITOS = 20
const CNPJ_DIGITOS = 14

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const MENSAGEM_CNPJ_DUPLICADO =
  'Já existe um fornecedor cadastrado com este CNPJ.'

export function normalizarCnpj(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    return null
  }

  const digitos = String(valor).replace(/\D/g, '')

  return digitos.length === 0 ? null : digitos
}

export function formatarCnpj(valor: unknown): string {
  const digitos = normalizarCnpj(valor)

  if (!digitos || digitos.length !== CNPJ_DIGITOS) {
    return digitos ?? ''
  }

  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function mascaraCnpj(valor: unknown): string {
  if (typeof valor !== 'string') {
    return ''
  }

  const digitos = valor.replace(/\D/g, '').slice(0, CNPJ_DIGITOS)

  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function normalizarTelefone(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') {
    return null
  }

  const digitos = String(valor).replace(/\D/g, '')

  return digitos.length === 0 ? null : digitos
}

export function formatarTelefoneFornecedor(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  return formatarTelefoneBrasil(valor)
}

function colapsarEspacos(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null
  }

  const texto = valor.replace(/\s+/g, ' ').trim()

  return texto.length === 0 ? null : texto
}

export function validarFornecedorPayload(bruto: unknown): ResultadoValidacaoFornecedor {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return { ok: false, erro: 'Payload de fornecedor inválido.' }
  }

  const registro = bruto as Record<string, unknown>

  const nome = colapsarEspacos(registro.nome)
  if (!nome) {
    return { ok: false, erro: 'Nome é obrigatório.' }
  }
  if (nome.length < MIN_NOME || nome.length > MAX_NOME) {
    return { ok: false, erro: 'Nome deve ter entre 2 e 120 caracteres.' }
  }

  const cnpj = normalizarCnpj(registro.cnpj)
  if (cnpj !== null && cnpj.length !== CNPJ_DIGITOS) {
    return { ok: false, erro: 'CNPJ inválido.' }
  }

  const telefone = normalizarTelefone(registro.telefone)
  if (
    telefone !== null &&
    (telefone.length < MIN_TELEFONE_DIGITOS || telefone.length > MAX_TELEFONE_DIGITOS)
  ) {
    return { ok: false, erro: 'Telefone inválido.' }
  }

  const email = colapsarEspacos(registro.email)
  if (email !== null && (email.length < MIN_EMAIL || email.length > MAX_EMAIL || !EMAIL_REGEX.test(email))) {
    return { ok: false, erro: 'E-mail inválido.' }
  }

  const contato = colapsarEspacos(registro.contato)
  if (contato !== null && contato.length > MAX_CONTATO) {
    return { ok: false, erro: 'Contato deve ter no máximo 120 caracteres.' }
  }

  const observacao = typeof registro.observacao === 'string' ? registro.observacao.trim() : null
  const observacaoNormalizada = observacao && observacao.length > 0 ? observacao : null
  if (observacaoNormalizada !== null && observacaoNormalizada.length > MAX_OBSERVACAO) {
    return { ok: false, erro: 'Observação deve ter no máximo 1000 caracteres.' }
  }

  return {
    ok: true,
    payload: {
      nome,
      cnpj,
      telefone,
      email,
      contato,
      observacao: observacaoNormalizada
    }
  }
}

export function filtrarFornecedores(
  lista: AdminFornecedor[],
  filtros: FiltrosFornecedoresAdmin
): AdminFornecedor[] {
  const termo = (filtros.busca ?? '').trim().toLowerCase()
  const digitos = termo.replace(/\D/g, '')

  return lista.filter((fornecedor) => {
    if (typeof filtros.ativo === 'boolean' && fornecedor.ativo !== filtros.ativo) {
      return false
    }

    if (!termo) {
      return true
    }

    const nome = fornecedor.nome.toLowerCase()
    const contato = (fornecedor.contato ?? '').toLowerCase()
    const cnpj = fornecedor.cnpj ?? ''
    const telefone = fornecedor.telefone ?? ''

    if (nome.includes(termo) || contato.includes(termo)) {
      return true
    }

    if (digitos && (cnpj.includes(digitos) || telefone.includes(digitos))) {
      return true
    }

    return false
  })
}

export function mensagemParaCodigoFornecedor(codigo: string): string {
  const mensagens: Record<string, string> = {
    NAO_ENCONTRADO: 'Fornecedor não encontrado.',
    NOME_OBRIGATORIO: 'Nome é obrigatório.',
    CNPJ_DUPLICADO: MENSAGEM_CNPJ_DUPLICADO,
    CNPJ_INVALIDO: 'CNPJ inválido.',
    EMAIL_INVALIDO: 'E-mail inválido.',
    LIMITE_EXCEDIDO: 'Alguns campos excedem o limite permitido.',
    DADOS_INVALIDOS: 'Dados do fornecedor inválidos.'
  }

  return mensagens[codigo] ?? 'Erro interno do servidor.'
}
