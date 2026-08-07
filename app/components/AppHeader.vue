<template>
  <header id="app-header" class="border-b border-wine-100 bg-white">
    <div class="grid w-full grid-cols-[auto_1fr_auto] items-center px-4 py-1 md:px-6">
      <img
        id="app-header-logo"
        src="/logo%202.png"
        alt="La Femme Lingerie"
        class="h-20 w-auto justify-self-start object-contain"
      />

      <h1
        id="app-header-title"
        class="justify-self-center text-center font-display text-3xl font-semibold text-brand"
      >
        Catálogo
      </h1>

      <div id="app-header-actions" class="flex items-center gap-3 justify-self-end">
        <button
          id="app-header-cart"
          type="button"
          class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
          :title="'Carrinho'"
        >
          <ShoppingBagIcon class="h-6 w-6" />
        </button>
        <BaseButton
          id="app-header-cadastrar"
          label="Cadastrar"
          variant="outline"
          size="md"
          @click="emit('abrir-cadastro')"
        />
        <BaseButton
          id="app-header-login"
          label="Entrar"
          variant="primary"
          size="md"
          @click="handleLoginClick"
        />
        <BaseButton
          id="app-header-logout"
          label="Sair"
          variant="outline"
          size="md"
          @click="handleLogoutClick"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import { useAuth } from '~/composables/useAuth'

const emit = defineEmits<{
  'abrir-cadastro': []
}>()

defineOptions({ name: 'AppHeader' })

const { logout } = useAuth()

function handleLoginClick() {
  navigateTo('/login')
}

async function handleLogoutClick() {
  try {
    await logout()
    toast.success('Sessão encerrada.')
    navigateTo('/login')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erro ao sair.')
  }
}
</script>
