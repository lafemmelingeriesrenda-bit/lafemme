import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type {
  ErroValidacaoCarrinho,
  ItemCarrinhoValidado,
  VarianteValidacao
} from '~/types/validacao-carrinho'

interface VarianteNoBanco {
  id: number
  produto_id: number
  cor: string | null
  tamanho: string
  valor: number
  quantidade: number
  sku: string | null
  foto: string | null
  ativo: boolean
}

function isInteiroPositivo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0
}

function validarPayload(body: unknown): VarianteValidacao[] | null {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const itens = (body as { itens?: unknown }).itens

  if (!Array.isArray(itens) || itens.length === 0) {
    return null
  }

  const variantes: VarianteValidacao[] = []
  const vistos = new Set<number>()

  for (const item of itens) {
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
    variantes.push({ varianteId, quantidade })
  }

  return variantes
}

function responderErroServidor(event: H3Event) {
  console.error('[carrinho/validar] erro inesperado ao consultar o Supabase')
  setResponseStatus(event, 500)
  return { valido: false as const, mensagem: 'Erro interno do servidor.' }
}

export default defineEventHandler(async (event) => {
  const body: unknown = await readBody(event)
  const variantes = validarPayload(body)

  if (!variantes) {
    setResponseStatus(event, 400)
    return {
      valido: false as const,
      mensagem: 'Payload de carrinho inválido. Envie itens com varianteId e quantidade inteiros positivos.'
    }
  }

  const supabase = await serverSupabaseServiceRole(event)

  const ids = variantes.map((variante) => variante.varianteId)

  const { data: variantesDb, error: erroVariantes } = await supabase
    .from('produto_variante')
    .select('id, produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo')
    .in('id', ids)

  if (erroVariantes) {
    return responderErroServidor(event)
  }

  const registros = (variantesDb ?? []) as unknown as VarianteNoBanco[]
  const erros: ErroValidacaoCarrinho[] = []

  const encontradas = new Set(registros.map((registro) => registro.id))

  for (const variante of variantes) {
    if (!encontradas.has(variante.varianteId)) {
      erros.push({ varianteId: variante.varianteId, motivo: 'VARIANTE_NAO_ENCONTRADA' })
    }
  }

  for (const registro of registros) {
    if (!registro.ativo) {
      const solicitado = variantes.find((v) => v.varianteId === registro.id)?.quantidade
      erros.push({
        varianteId: registro.id,
        motivo: 'VARIANTE_INATIVA',
        ...(solicitado !== undefined ? { solicitado } : {})
      })
    }
  }

  const registrosAtivos = registros.filter((registro) => registro.ativo)
  const produtoIds = [...new Set(registrosAtivos.map((registro) => registro.produto_id))]

  let produtos: { id: number; nome: string }[] = []

  if (produtoIds.length > 0) {
    const { data: produtosData, error: erroProdutos } = await supabase
      .from('produtos')
      .select('id, nome')
      .in('id', produtoIds)

    if (erroProdutos) {
      return responderErroServidor(event)
    }

    produtos = produtosData ?? []
  }

  const nomePorProduto = new Map(produtos.map((produto) => [produto.id, produto.nome]))
  const itens: ItemCarrinhoValidado[] = []
  let subtotal = 0

  for (const variante of variantes) {
    const registro = registros.find((db) => db.id === variante.varianteId)

    if (!registro || !registro.ativo) {
      continue
    }

    const nome = nomePorProduto.get(registro.produto_id)

    if (nome === undefined) {
      erros.push({ varianteId: variante.varianteId, motivo: 'VARIANTE_NAO_ENCONTRADA' })
      continue
    }

    if (variante.quantidade > registro.quantidade) {
      erros.push({
        varianteId: variante.varianteId,
        motivo: 'ESTOQUE_INSUFICIENTE',
        disponivel: registro.quantidade,
        solicitado: variante.quantidade
      })
      continue
    }

    const item: ItemCarrinhoValidado = {
      varianteId: registro.id,
      produtoId: registro.produto_id,
      nome,
      cor: registro.cor,
      tamanho: registro.tamanho,
      valor: registro.valor,
      quantidade: variante.quantidade,
      foto: registro.foto,
      sku: registro.sku,
      disponivel: registro.quantidade,
      subtotal: registro.valor * variante.quantidade
    }

    itens.push(item)
    subtotal += item.subtotal
  }

  if (erros.length > 0) {
    return { valido: false as const, erros }
  }

  return { valido: true as const, itens, subtotal }
})