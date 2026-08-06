import { useSupabaseClient, useSupabaseUser } from '#imports'
import { navigateTo } from '#app'

export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(error.message)
    }
    await navigateTo('/')
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  return { user, login, logout }
}
