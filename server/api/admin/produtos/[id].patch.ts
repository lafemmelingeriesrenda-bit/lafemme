import { requireAdmin } from '../../../utils/requireAdmin'
import { produtoEmPedido } from '../../../utils/produtoEmPedido'
import {
  filtrarFotosSemOutraReferencia,
  obterUrlsFotosDoProduto,
  removerArquivosStorage
} from '../../../utils/adminProdutos'
import { calcularFotosRemover, validarProdutoPayload } from '~/utils/produtoAdmin'
import { mapearRespostaRpcProduto } from '~/utils/mapearRpcProduto'
import type { Json } from '~/types/database.types'
import type { AdminProdutoCriado } from '~/types/produto-admin'

export default defineEventHandler(async (event): Promise<AdminProdutoCriado> => {
  const { admin } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador inválido.' })
  }

  const body: unknown = await readBody(event)
  const supabaseUrl = useRuntimeConfig().public.supabase.url as string

  const validado = validarProdutoPayload(body, supabaseUrl)

  if (!validado.ok) {
    throw createError({ statusCode: 400, statusMessage: validado.erro })
  }

  // Produtos com histórico em itens_pedido não podem ter suas variantes
  // recriadas (a RPC também protege, mas isto evita a tentativa e
  // devolve 409 imediatamente).
  let emPedido = false

  try {
    emPedido = await produtoEmPedido(admin, id)
  } catch (erro) {
    console.error('[admin/produtos] erro ao verificar produto em pedido:', (erro as Error).message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (emPedido) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este produto não pode ser alterado porque já está vinculado a um pedido.'
    })
  }

  // Fotos antigas são coletadas ANTES do update (a RPC substitui as
  // referências no banco) para calcular o que pode sair do Storage.
  const fotosAntigas = await obterUrlsFotosDoProduto(admin, id)

  const fotosNovas: Array<string | null | undefined> = [validado.payload.capa]
  for (const variante of validado.payload.variantes) {
    fotosNovas.push(...variante.imagens)
  }

  const fotosParaRemover = calcularFotosRemover(fotosAntigas, fotosNovas, supabaseUrl)

  const { data, error } = await admin.rpc('admin_atualizar_produto', {
    p_id: id,
    p_dados: validado.payload as unknown as Json
  })

  if (error) {
    console.error('[admin/produtos] erro ao atualizar produto via RPC:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  const resposta = mapearRespostaRpcProduto(data)

  if (!resposta) {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (!resposta.ok) {
    if (resposta.codigo === 'NAO_ENCONTRADO') {
      throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado.' })
    }
    const statusCode =
      resposta.codigo === 'VARIANTE_HISTORICA_IMUTAVEL' || resposta.codigo === 'VARIANTE_FORA_DO_PRODUTO'
        ? 409
        : 400
    throw createError({ statusCode, statusMessage: resposta.erro })
  }

  if (resposta.tipo !== 'criado_ou_atualizado') {
    console.error('[admin/produtos] resposta inesperada da RPC:', JSON.stringify(data))
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  // Após a confirmação do update, remove apenas as fotos que saíram do
  // payload E não pertencem (nem são compartilhadas) com outro produto.
  const fotosSeguras = await filtrarFotosSemOutraReferencia(admin, id, fotosParaRemover, supabaseUrl)
  await removerArquivosStorage(admin, fotosSeguras, supabaseUrl)

  return { id: resposta.id, variantes: resposta.variantes }
})
