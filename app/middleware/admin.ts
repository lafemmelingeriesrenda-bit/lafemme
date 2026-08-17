import { rotaPublica } from '~/utils/rotaPublica'

interface RespostaAdmin {
  isAdmin: boolean
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (rotaPublica(to.path)) {
    return
  }

  const { user } = useAuth()

  if (!user) {
    return navigateTo('/login')
  }

  let isAdmin = false

  try {
    const resposta = await $fetch<RespostaAdmin>('/api/auth/admin')
    isAdmin = resposta.isAdmin
  } catch {
    isAdmin = false
  }

  if (!isAdmin) {
    return navigateTo('/catalogo')
  }
})