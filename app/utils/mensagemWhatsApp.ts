import type { ItemPedidoCriado, PedidoCriado } from '~/types/pedido'

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarTelefone(digitos: string): string {
  const apenasDigitos = digitos.replace(/\D/g, '')

  if (apenasDigitos.length === 11) {
    return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 7)}-${apenasDigitos.slice(7)}`
  }

  if (apenasDigitos.length === 10) {
    return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 6)}-${apenasDigitos.slice(6)}`
  }

  return apenasDigitos
}

function montarLinhasItem(item: ItemPedidoCriado): string[] {
  const linhas: string[] = [item.nome_produto]

  if (item.produto_url && item.produto_url.trim().length > 0) {
    linhas.push(`   Produto: ${item.produto_url}`)
  }

  if (item.cor && item.cor.length > 0) {
    linhas.push(`   Cor: ${item.cor}`)
  }

  linhas.push(`   Tamanho: ${item.tamanho}`)
  linhas.push(`   Quantidade: ${item.quantidade}`)
  linhas.push(`   Valor unitário: ${formatarMoeda(item.valor_unitario)}`)
  linhas.push(`   Subtotal: ${formatarMoeda(item.subtotal)}`)

  return linhas
}

export function montarMensagemPedidoWhatsApp(pedido: PedidoCriado): string {
  const linhas: string[] = [
    'Olá! Gostaria de finalizar meu pedido na La Femme.',
    '',
    `*Pedido #${pedido.id}*`,
    '',
    '*Itens:*',
    ''
  ]

  pedido.itens.forEach((item, indice) => {
    linhas.push(`${indice + 1}. ${montarLinhasItem(item).join('\n')}`)
    linhas.push('')
  })

  linhas.push('*Resumo do pedido*')
  linhas.push(`Subtotal: ${formatarMoeda(pedido.subtotal)}`)
  linhas.push(`Frete: ${formatarMoeda(pedido.frete)}`)
  linhas.push(`Total: ${formatarMoeda(pedido.total)}`)
  linhas.push('')
  linhas.push('*Cliente*')
  linhas.push(`Nome: ${pedido.nome_cliente}`)
  linhas.push(`WhatsApp: ${formatarTelefone(pedido.telefone_cliente)}`)

  if (pedido.observacoes && pedido.observacoes.trim().length > 0) {
    linhas.push('')
    linhas.push('Observações:')
    linhas.push(pedido.observacoes.trim())
  }

  return linhas.join('\n')
}
