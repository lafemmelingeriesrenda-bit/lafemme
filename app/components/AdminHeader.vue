<template>
  <header
    id="admin-header"
    class="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-wine-100 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-4 lg:pt-0"
  >
    <div id="admin-header-titulo-box" class="flex min-w-0 items-center gap-3">
      <button
        id="admin-header-menu"
        type="button"
        class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light lg:hidden"
        :aria-label="aberto ? 'Fechar menu' : 'Abrir menu'"
        :aria-expanded="aberto"
        @click="toggle"
      >
        <component :is="aberto ? XMarkIcon : Bars3Icon" class="h-6 w-6" />
      </button>

      <h1
        id="admin-header-titulo"
        class="font-display text-2xl font-semibold text-brand sm:text-3xl"
      >
        {{ titulo }}
      </h1>
    </div>

    <div id="admin-header-acoes" class="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
      <slot name="acoes" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useMenuAdmin } from '~/composables/useMenuAdmin'

interface Props {
  titulo: string
}

defineProps<Props>()

defineOptions({ name: 'AdminHeader' })

const { aberto, toggle } = useMenuAdmin()
</script>
