<template>
  <div id="layout-principal" class="flex min-h-screen bg-cream">
    <AppSidebar />

    <div
      v-if="aberto"
      id="layout-principal-overlay"
      class="fixed inset-0 z-30 bg-ink/50 lg:hidden"
      aria-hidden="true"
      @click="fechar"
    />

    <main id="layout-principal-main" class="flex min-w-0 flex-1 flex-col">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from '~/components/AppSidebar.vue'
import { useMenuAdmin } from '~/composables/useMenuAdmin'

defineOptions({ name: 'LayoutPrincipal' })

const { aberto, fechar } = useMenuAdmin()

const route = useRoute()

watch(aberto, (estaAberto) => {
  document.body.style.overflow = estaAberto ? 'hidden' : ''
})

watch(
  () => route.fullPath,
  () => fechar()
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>