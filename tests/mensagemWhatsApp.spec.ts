import { describe, expect, it } from 'vitest'
import type { PedidoCriado } from '../app/types/pedido'
import { montarMensagemPedidoWhatsApp } from '../app/utils/mensagemWhatsApp'

const pedidoBase: PedidoCriado = {
  id: 7,
  cliente_id: null,
  nome_cliente: 'Ana Silva',
  telefone_cliente: '34999999999',
  observacoes: null,
  status: 'aguardando_atendimento',
  subtotal: 149.9,
  frete: 0,
  total: 149.9,
  itens: [
    {
      produto_variante_id: 1,
      nome_produto: 'Camisola Insaciável',
      cor: 'Preto',
      tamanho: 'P',
      sku: null,
      foto: null,
      produto_url: null,
      quantidade: 1,
      valor_unitario: 149.9,
      subtotal: 149.9
    }
  ]
}

describe('montarMensagemPedidoWhatsApp', () => {
  it('não inclui a linha Imagem mesmo quando o item possui foto', () => {
    const pedido: PedidoCriado = {
      ...pedidoBase,
      itens: [
        {
          ...pedidoBase.itens[0],
          foto: 'https://exemplo.supabase.co/storage/v1/object/public/La%20Femme/produtos/imagem.jpg'
        }
      ]
    }

    const mensagem = montarMensagemPedidoWhatsApp(pedido)

    expect(mensagem).not.toContain('Imagem:')
  })

  it('inclui a linha Produto com a URL quando produto_url existe', () => {
    const pedido: PedidoCriado = {
      ...pedidoBase,
      itens: [
        {
          ...pedidoBase.itens[0],
          produto_url: 'https://lafemme-sepia.vercel.app/produto/1-camisola-insaciavel'
        }
      ]
    }

    const mensagem = montarMensagemPedidoWhatsApp(pedido)

    expect(mensagem).toContain('Produto: https://lafemme-sepia.vercel.app/produto/1-camisola-insaciavel')
  })

  it('não inclui a linha Produto quando produto_url é null', () => {
    const mensagem = montarMensagemPedidoWhatsApp(pedidoBase)

    expect(mensagem).not.toContain('Produto:')
  })

  it('não inclui a linha Produto quando produto_url é vazia', () => {
    const pedido: PedidoCriado = {
      ...pedidoBase,
      itens: [{ ...pedidoBase.itens[0], produto_url: '' }]
    }

    const mensagem = montarMensagemPedidoWhatsApp(pedido)

    expect(mensagem).not.toContain('Produto:')
  })

  it('mantém nome, cor, tamanho, quantidade, valor unitário e subtotal do item', () => {
    const mensagem = montarMensagemPedidoWhatsApp(pedidoBase)

    expect(mensagem).toContain('1. Camisola Insaciável')
    expect(mensagem).toContain('Cor: Preto')
    expect(mensagem).toContain('Tamanho: P')
    expect(mensagem).toContain('Quantidade: 1')
    expect(mensagem).toContain('Valor unitário: R$')
    expect(mensagem).toContain('149,90')
    expect(mensagem).toContain('Subtotal: R$')
  })

  it('mantém o resumo do pedido com subtotal, frete e total', () => {
    const mensagem = montarMensagemPedidoWhatsApp(pedidoBase)

    expect(mensagem).toContain('*Resumo do pedido*')
    expect(mensagem).toContain('Subtotal: R$')
    expect(mensagem).toContain('Frete: R$')
    expect(mensagem).toContain('Total: R$')
  })

  it('mantém os dados do cliente', () => {
    const mensagem = montarMensagemPedidoWhatsApp(pedidoBase)

    expect(mensagem).toContain('*Cliente*')
    expect(mensagem).toContain('Nome: Ana Silva')
    expect(mensagem).toContain('WhatsApp: (34) 99999-9999')
  })

  it('mantém as observações quando preenchidas', () => {
    const pedido: PedidoCriado = {
      ...pedidoBase,
      observacoes: 'Entregar somente após as 18h.'
    }

    const mensagem = montarMensagemPedidoWhatsApp(pedido)

    expect(mensagem).toContain('Observações:')
    expect(mensagem).toContain('Entregar somente após as 18h.')
  })
})