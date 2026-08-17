export interface ClientePayloadNormalizado {
  nome: string
  sobrenome: string | null
  telefone: string | null
  telefoneNormalizado: string | null
  dataNascimento: string | null
}

export type ResultadoValidacaoCliente =
  | { ok: true; payload: ClientePayloadNormalizado }
  | { ok: false; erro: string }

const MAX_NOME = 120
const MAX_SOBRENOME = 120
const MIN_TELEFONE_DIGITOS = 8
const MAX_TELEFONE_DIGITOS = 15

function colapsarEspacos(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null
  }

  const texto = valor.replace(/\s+/g, ' ').trim()

  return texto.length === 0 ? null : texto
}

function validarDataNascimento(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return null
  }

  if (typeof valor !== 'string') {
    return null
  }

  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)

  if (!partes) {
    return null
  }

  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null
  }

  return valor
}

export function validarClientePayload(bruto: unknown): ResultadoValidacaoCliente {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return { ok: false, erro: 'Payload de cliente inválido.' }
  }

  const registro = bruto as Record<string, unknown>

  const nome = colapsarEspacos(registro.nome)
  if (!nome) {
    return { ok: false, erro: 'Nome é obrigatório.' }
  }
  if (nome.length > MAX_NOME) {
    return { ok: false, erro: 'Nome deve ter no máximo 120 caracteres.' }
  }

  const sobrenome = colapsarEspacos(registro.sobrenome)
  if (sobrenome !== null && sobrenome.length > MAX_SOBRENOME) {
    return { ok: false, erro: 'Sobrenome deve ter no máximo 120 caracteres.' }
  }

  let telefone: string | null = null
  let telefoneNormalizado: string | null = null

  const telefoneBruto = registro.telefone

  if (telefoneBruto !== null && telefoneBruto !== undefined) {
    if (typeof telefoneBruto !== 'string') {
      return { ok: false, erro: 'Telefone inválido.' }
    }

    const texto = telefoneBruto.trim()

    if (texto !== '') {
      const digitos = texto.replace(/\D/g, '')

      if (digitos.length < MIN_TELEFONE_DIGITOS || digitos.length > MAX_TELEFONE_DIGITOS) {
        return { ok: false, erro: 'Telefone inválido.' }
      }

      telefone = texto
      telefoneNormalizado = digitos
    }
  }

  const dataNascimento = validarDataNascimento(registro.dataNascimento)
  if (registro.dataNascimento !== null && registro.dataNascimento !== undefined && registro.dataNascimento !== '' && dataNascimento === null) {
    return { ok: false, erro: 'Data de nascimento inválida.' }
  }

  return {
    ok: true,
    payload: {
      nome,
      sobrenome,
      telefone,
      telefoneNormalizado,
      dataNascimento
    }
  }
}
