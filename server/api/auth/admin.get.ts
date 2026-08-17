import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { isAdmin: false as const }
  }

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.rpc('is_admin')

  if (error) {
    console.error('[auth/admin] erro ao verificar administrador:', error.message)
    setResponseStatus(event, 500)
    return { isAdmin: false as const }
  }

  return { isAdmin: data === true }
})