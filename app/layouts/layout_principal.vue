<template>
  <div id="layout-principal" class="flex min-h-screen bg-cream">
    <AppSidebar />
    <main id="layout-principal-main" class="flex flex-1 flex-col">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from '~/components/AppSidebar.vue'

defineOptions({ name: 'LayoutPrincipal' })
</script>