import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Json } from '~/types/database.types'
import type { ItemPedidoCriado, RespostaRpcCriarPedido } from '~/types/pedido'
import type { VarianteValidacao } from '~/types/validacao-carrinho'

interface LinhaPedido {
  id: number
  nome_cliente: string
  telefone_cliente: string
  observacoes: string | null
  status: string
  subtotal: number
  frete: number
  total: number
}

interface LinhaItemPedido {
  produto_variante_id: number
  nome_produto: string
  cor: string | null
  tamanho: string
  sku: string | null
  quantidade: number
  valor_unitario: number
  subtotal: number
}

interface ProcessedPedidoPayload {
  itens: VarianteValidacao[]
  nome: string
  telefone: string
  observacoes: string | null
}

function isInteiroPositivo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0
}

function normalizarNome(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null
  }

  const nome = valor.replace(/\s+/g, ' ').trim()

  if (nome.length === 0 || nome.length > 120) {
    return null
  }

  return nome
}

function normalizarTelefone(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null
  }

  const digitos = valor.replace(/\D/g, '')

  if (digitos.length < 8 || digitos.length > 15) {
    return null
  }

  return digitos
}

function normalizarObservacoes(valor: unknown): string | null {
  if (valor === null || valor === undefined) {
    return null
  }

  if (typeof valor !== 'string') {
    return null
  }

  const observacoes = valor.trim()

  if (observacoes.length > 1000) {
    return null
  }

  return observacoes.length === 0 ? null : observacoes
}

function processarPayload(body: unknown): ProcessedPedidoPayload | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const bruto = body as { itens?: unknown; nome?: unknown; telefone?: unknown; observacoes?: unknown }

  if (!Array.isArray(bruto.itens) || bruto.itens.length === 0) {
    return null
  }

  const itens: VarianteValidacao[] = []
  const vistos = new Set<number>()

  for (const item of bruto.itens) {
    if (typeof item !== 'object' || item === null) {
      return null
    }

    const registro = item as Record<string, unknown>
    const { varianteId, quantidade } = registro

    if (!isInteiroPositivo(varianteId) || !isInteiroPositivo(quantidade)) {
      return null
    }

    if (vistos.has(varianteId)) {
      return null
    }

    vistos.add(varianteId)
    itens.push({ varianteId, quantidade })
  }

  const nome = normalizarNome(bruto.nome)
  if (!nome) {
    return null
  }

  const telefone = normalizarTelefone(bruto.telefone)
  if (!telefone) {
    return null
  }

  const observacoes = normalizarObservacoes(bruto.observacoes)

  return { itens, nome, telefone, observacoes }
}

function isRespostaRpc(valor: unknown): valor is RespostaRpcCriarPedido {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false
  }

  const obj = valor as Record<string, Json | undefined>

  if (typeof obj.ok !== 'boolean') {
    return false
  }

  if (obj.ok && (typeof obj.pedido !== 'object' || obj.pedido === null)) {
    return false
  }

  if (!obj.ok && !Array.isArray(obj.erros)) {
    return false
  }

  return true
}

export default defineEventHandler(async (event) => {
  const body: unknown = await readBody(event)
  const pedido = processarPayload(body)

  if (!pedido) {
    setResponseStatus(event, 400)
    return {
      sucesso: false as const,
      mensagem: 'Payload de pedido inválido. Envie itens válidos, nome e telefone.'
    }
  }

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.rpc('criar_pedido', {
    p_itens: pedido.itens.map((item) => ({
      varianteId: item.varianteId,
      quantidade: item.quantidade
    })) as unknown as Json,
    p_nome: pedido.nome,
    p_telefone: pedido.telefone,
    p_observacoes: pedido.observacoes
  })

  if (error) {
    console.error('[pedidos] erro ao chamar criar_pedido:', error.message)
    setResponseStatus(event, 500)
    return { sucesso: false as const, mensagem: 'Erro interno do servidor.' }
  }

  const resultado = isRespostaRpc(data) ? data : null

  if (!resultado) {
    setResponseStatus(event, 500)
    return { sucesso: false as const, mensagem: 'Resposta inesperada do servidor.' }
  }

  if (!resultado.ok) {
    setResponseStatus(event, 409)
    return { sucesso: false as const, erros: resultado.erros ?? [] }
  }

  const pedidoCriado = resultado.pedido

  if (!pedidoCriado) {
    setResponseStatus(event, 500)
    return { sucesso: false as const, mensagem: 'Pedido não retornado pelo servidor.' }
  }

  let linhaPedido: LinhaPedido
  let linhaItens: LinhaItemPedido[]

  try {
    const admin = await serverSupabaseServiceRole(event)

    const [consultaPedido, consultaItens] = await Promise.all([
      admin
        .from('pedidos')
        .select('id, nome_cliente, telefone_cliente, observacoes, status, subtotal, frete, total')
        .eq('id', pedidoCriado.id)
        .single(),
      admin
        .from('itens_pedido')
        .select('produto_variante_id, nome_produto, cor, tamanho, sku, quantidade, valor_unitario, subtotal')
        .eq('pedido_id', pedidoCriado.id)
        .order('id', { ascending: true })
    ])

    if (consultaPedido.error || consultaItens.error) {
      console.error(
        '[pedidos] erro ao ler pedido criado (pedido=' + pedidoCriado.id + '):',
        JSON.stringify({
          pedido: consultaPedido.error?.message ?? null,
          itens: consultaItens.error?.message ?? null
        })
      )
      setResponseStatus(event, 500)
      return { sucesso: false as const, mensagem: 'Pedido criado, mas não foi possível carregar seus dados.' }
    }

    linhaPedido = consultaPedido.data as unknown as LinhaPedido
    linhaItens = (consultaItens.data ?? []) as unknown as LinhaItemPedido[]
  } catch (erro) {
    console.error('[pedidos] falha ao ler pedido criado (pedido=' + pedidoCriado.id + '):', erro)
    setResponseStatus(event, 500)
    return { sucesso: false as const, mensagem: 'Pedido criado, mas não foi possível carregar seus dados.' }
  }

  const pedidoFinal = {
    id: linhaPedido.id,
    nome_cliente: linhaPedido.nome_cliente,
    telefone_cliente: linhaPedido.telefone_cliente,
    observacoes: linhaPedido.observacoes,
    status: linhaPedido.status,
    subtotal: Number(linhaPedido.subtotal),
    frete: Number(linhaPedido.frete),
    total: Number(linhaPedido.total),
    itens: linhaItens.map((item): ItemPedidoCriado => ({
      produto_variante_id: item.produto_variante_id,
      nome_produto: item.nome_produto,
      cor: item.cor,
      tamanho: item.tamanho,
      sku: item.sku,
      quantidade: item.quantidade,
      valor_unitario: Number(item.valor_unitario),
      subtotal: Number(item.subtotal)
    }))
  }

  setResponseStatus(event, 201)
  return { sucesso: true as const, pedido: pedidoFinal }
})