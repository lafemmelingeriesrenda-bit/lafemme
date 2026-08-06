import { useSupabaseClient } from '#imports'
import { navigateTo } from '#app'

export function useRegister() {
  const supabase = useSupabaseClient()

  interface RegisterData {
    name: string
    lastName: string
    phone: string
    email: string
    password: string
  }

  async function register({ name, lastName, phone, email, password }: RegisterData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, lastName, phone }
      }
    })
    if (error) {
      throw new Error(error.message)
    }

    if (data.user) {
      const phoneNumber = Number(phone.replace(/\D/g, '')) || null
      const { error: insertError } = await supabase.from('usuario').insert({
        uid: data.user.id,
        nome: name,
        sobrenome: lastName,
        telefone: phoneNumber,
        email
      })
      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    await navigateTo('/')
  }

  return { register }
}
