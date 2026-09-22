import type { RespostaRpcCompra } from '~/utils/mapearRpcCompra'

export function lancarErroRpcCompra(resposta: Extract<RespostaRpcCompra, { ok: false }>): never {
  switch (resposta.codigo) {
    case 'NAO_ENCONTRADO':
      throw createError({ statusCode: 404, statusMessage: 'Compra não encontrada.' })
    case 'COMPRA_JA_RECEBIDA':
    case 'COMPRA_CANCELADA':
    case 'TRANSICAO_INVALIDA':
      throw createError({ statusCode: 409, statusMessage: resposta.erro })
    case 'TIPO_INVALIDO':
    case 'CATEGORIA_INVALIDA':
    case 'FORNECEDOR_INEXISTENTE':
    case 'FORNECEDOR_INVALIDO':
    case 'MERCADORIA_SEM_ITENS':
    case 'ITEM_INVALIDO':
    case 'VARIANTE_INEXISTENTE':
    case 'TOTAL_INVALIDO':
    case 'PAGAMENTO_INVALIDO':
    case 'DADOS_INVALIDOS':
    default:
      throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }
}
