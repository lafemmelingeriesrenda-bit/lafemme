import { useRuntimeConfig } from '#app'
import type { PedidoCriado } from '~/types/pedido'
import { montarMensagemPedidoWhatsApp } from '~/utils/mensagemWhatsApp'

export function useWhatsApp() {
  const config = useRuntimeConfig()
  const configPublic = config.public as { whatsappNumero?: string }

  function numeroWhatsApp(): string {
    return configPublic.whatsappNumero ?? ''
  }

  function linkWhatsApp(mensagem: string): string {
    return `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(mensagem)}`
  }

  function abrirWhatsAppPedido(pedido: PedidoCriado): void {
    if (!import.meta.client) {
      return
    }

    const url = linkWhatsApp(montarMensagemPedidoWhatsApp(pedido))

    const janela = window.open(url, '_blank', 'noopener,noreferrer')

    if (!janela) {
      window.location.href = url
    }
  }

  return { linkWhatsApp, abrirWhatsAppPedido }
}
