import type { RespostaRpcFornecedor } from '~/utils/mapearRpcFornecedor'
import { MENSAGEM_CNPJ_DUPLICADO } from '~/utils/fornecedorAdmin'

export function lancarErroRpcFornecedor(resposta: Extract<RespostaRpcFornecedor, { ok: false }>): never {
  switch (resposta.codigo) {
    case 'NAO_ENCONTRADO':
      throw createError({ statusCode: 404, statusMessage: 'Fornecedor não encontrado.' })
    case 'CNPJ_DUPLICADO':
      throw createError({ statusCode: 409, statusMessage: MENSAGEM_CNPJ_DUPLICADO })
    case 'NOME_OBRIGATORIO':
    case 'CNPJ_INVALIDO':
    case 'EMAIL_INVALIDO':
    case 'LIMITE_EXCEDIDO':
    case 'DADOS_INVALIDOS':
    default:
      throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }
}
