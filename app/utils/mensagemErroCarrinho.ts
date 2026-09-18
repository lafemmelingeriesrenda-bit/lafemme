import type { ErroValidacaoCarrinho } from '~/types/validacao-carrinho'

export function mensagemParaMotivo(erro: ErroValidacaoCarrinho): string {
  switch (erro.motivo) {
    case 'ESTOQUE_INSUFICIENTE': {
      const disponivel = erro.disponivel ?? 0
      const solicitado = erro.solicitado ?? 0
      return `Estoque insuficiente: restam ${disponivel} unidade(s) e você pediu ${solicitado}.`
    }
    case 'VARIANTE_NAO_ENCONTRADA':
      return 'Um dos itens da sacola não está mais disponível.'
    case 'VARIANTE_INATIVA':
      return 'Um dos itens da sacola foi desativado.'
    case 'QUANTIDADE_INVALIDA':
      return 'A quantidade de um dos itens da sacola é inválida.'
    default:
      return 'Não foi possível finalizar o pedido. Tente novamente em instantes.'
  }
}
