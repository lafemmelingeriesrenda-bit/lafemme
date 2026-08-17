import { requireAdmin } from '../../utils/requireAdmin'
import { validarClientePayload } from '~/utils/clienteApi'
import { inserirCliente } from '../../utils/clientes'
import type { ClienteCriadoResposta, ClienteMensagemErro } from '~/types/cliente-api'

export default defineEventHandler(
  async (event): Promise<ClienteCriadoResposta | ClienteMensagemErro> => {
    const { admin } = await requireAdmin(event)

    const body = await readBody(event)
    const validado = validarClientePayload(body)

    if (!validado.ok) {
      setResponseStatus(event, 400)
      return { mensagem: validado.erro }
    }

    const resultado = await inserirCliente(admin, validado.payload)

    if (resultado.tipo === 'conflito') {
      setResponseStatus(event, 409)
      return {
        mensagem:
          'Já existe um cliente cadastrado com esse telefone. Verifique os dados e tente novamente.'
      }
    }

    if (resultado.tipo === 'erro') {
      setResponseStatus(event, 500)
      return { mensagem: 'Erro interno do servidor.' }
    }

    setResponseStatus(event, 201)
    return { id: resultado.id }
  }
)
