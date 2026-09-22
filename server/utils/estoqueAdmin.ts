import type { RespostaRpcAjusteEstoque } from '~/utils/mapearRpcAjusteEstoque'

export function lancarErroRpcAjusteEstoque(
  resposta: Extract<RespostaRpcAjusteEstoque, { ok: false }>
): never {
  switch (resposta.codigo) {
    case 'NAO_ENCONTRADO':
      throw createError({ statusCode: 404, statusMessage: 'Variante não encontrada.' })
    case 'ESTOQUE_ALTERADO':
      throw createError({
        statusCode: 409,
        statusMessage:
          'O estoque desta variante foi alterado desde que você abriu a tela. Atualize os dados e tente novamente.'
      })
    case 'SEM_ALTERACAO':
    case 'QUANTIDADE_INVALIDA':
    case 'MOTIVO_INVALIDO':
    case 'OBSERVACAO_OBRIGATORIA':
    default:
      throw createError({ statusCode: 400, statusMessage: resposta.erro })
  }
}
