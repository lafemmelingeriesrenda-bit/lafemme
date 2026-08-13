// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  css: ['vue-sonner/style.css'],
  runtimeConfig: {
    public: {
      whatsappNumero: '5534996600338'
    }
  },
  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/api/carrinho/validar', '/api/pedidos', '/catalogo', '/produto/**', '/login']
    }
  },
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css'
  }
})