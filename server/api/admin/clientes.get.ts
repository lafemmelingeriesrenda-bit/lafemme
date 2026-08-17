import { requireAdmin } from '../../utils/requireAdmin'
import type { AdminCliente } from '~/types/cliente-api'

export default defineEventHandler(async (event): Promise<AdminCliente[]> => {
  const { admin } = await requireAdmin(event)

  const { data, error } = await admin
    .from('clientes')
    .select('id, nome, sobrenome, telefone, data_nascimento, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/clientes] erro ao listar clientes:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  return (data ?? []) as unknown as AdminCliente[]
})
