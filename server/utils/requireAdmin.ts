import { serverSupabaseUser, serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export interface AdminSessao {
  user: NonNullable<Awaited<ReturnType<typeof serverSupabaseUser>>>
  admin: SupabaseClient<Database>
}

export async function requireAdmin(event: H3Event): Promise<AdminSessao> {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado.' })
  }

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.rpc('is_admin')

  if (error) {
    console.error('[requireAdmin] erro ao verificar administrador:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Erro interno do servidor.' })
  }

  if (data !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso negado.' })
  }

  const admin = await serverSupabaseServiceRole(event)

  return { user, admin }
}