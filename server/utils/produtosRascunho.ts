import type { RespostaRpcRascunhoProduto } from '~/utils/mapearRpcRascunhoProduto'

export function lancarErroRpcRascunhoProduto(
  resposta: Extract<RespostaRpcRascunhoProduto, { ok: false }>
): never {
  switch (resposta.codigo) {
    case 'NAO_ENCONTRADO':
      throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado.' })
    case 'ITEM_NAO_ENCONTRADO':
      throw createError({ statusCode: 404, statusMessage: 'Item de compra não encontrado.' })
    case 'ITEM_JA_VINCULADO':
      throw createError({ statusCode: 409, statusMessage: 'Este item já está vinculado a uma variante.' })
    case 'COMPRA_CANCELADA':
      throw createError({ statusCode: 409, statusMessage: 'Compra cancelada não pode ser alterada.' })
    case 'COMPRA_JA_RECEBIDA':
      throw createError({ statusCode: 409, statusMessage: resposta.erro })
    case 'ITENS_NAO_VINCULADOS':
      throw createError({ statusCode: 409, statusMessage: resposta.erro })
    case 'ENTRADA_DUPLICADA':
      throw createError({ statusCode: 409, statusMessage: 'Esta compra já teve entrada no estoque.' })
    case 'RECEBIMENTO_INVALIDO':
    case 'TRANSICAO_INVALIDA':
      throw createError({ statusCode: 409, statusMessage: resposta.erro })
    case 'VARIANTE_INEXISTENTE':
    case 'VARIANTE_NAO_ENCONTRADA':
      throw createError({ statusCode: 400, statusMessage: 'Variante informada não encontrada.' })
    case 'SEM_ITENS':
    case 'ITEM_INVALIDO':
    case 'TIPO_INVALIDO':
    case 'PUBLICACAO_INVALIDA':
    case 'DADOS_INVALIDOS':
    case 'PAYLOAD_INVALIDO':
    case 'VARIANTE_ID_AUSENTE':
    case 'VARIANTE_ID_DUPLICADO':
    case 'COMBINACAO_VARIANTE_DUPLICADA':
    case 'TAMANHO_UNICO_INCOMPATIVEL':
    case 'VARIANTE_ATIVO_AUSENTE':
    case 'VARIANTE_ATIVO_INVALIDO':
    default:
      throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }
}
