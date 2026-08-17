import type { ClienteCriadoResposta, ClienteMensagemErro } from '~/types/cliente-api'

export interface ClienteNovo {
  nome: string
  sobrenome?: string | null
  telefone: string | null
  dataNascimento?: string | null
}

export interface ClienteSalvo {
  id: number
}

const MENSAGEM_CONFLITO =
  'Já existe um cliente cadastrado com esse telefone. Verifique os dados e tente novamente.'
const MENSAGEM_FALHA = 'Não foi possível cadastrar o cliente. Tente novamente em instantes.'

async function enviar(endpoint: string, payload: ClienteNovo): Promise<ClienteSalvo> {
  const resposta = await $fetch.raw<ClienteCriadoResposta | ClienteMensagemErro>(endpoint, {
    method: 'POST',
    body: payload,
    ignoreResponseError: true
  })

  if (resposta.status >= 200 && resposta.status < 300) {
    const dados = resposta._data as ClienteCriadoResposta | null

    if (dados && typeof dados.id === 'number') {
      return { id: dados.id }
    }

    throw new Error(MENSAGEM_FALHA)
  }

  if (resposta.status === 409) {
    throw new Error(MENSAGEM_CONFLITO)
  }

  const dados = resposta._data as unknown as Record<string, unknown> | null
  const mensagem =
    typeof dados?.mensagem === 'string'
      ? dados.mensagem
      : typeof dados?.statusMessage === 'string'
        ? dados.statusMessage
        : typeof dados?.message === 'string'
          ? dados.message
          : null

  throw new Error(mensagem ?? MENSAGEM_FALHA)
}

export function useSalvarCliente() {
  async function salvarClienteAdmin(payload: ClienteNovo): Promise<ClienteSalvo> {
    return enviar('/api/admin/clientes', payload)
  }

  async function salvarClientePublico(payload: ClienteNovo): Promise<ClienteSalvo> {
    return enviar('/api/clientes', payload)
  }

  return { salvarClienteAdmin, salvarClientePublico }
}
