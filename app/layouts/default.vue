<template>
  <div id="app-layout" class="flex min-h-screen flex-col bg-cream">
    <AppHeader />
    <main id="app-layout-main" class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppFooter from '~/components/AppFooter.vue'
import AppHeader from '~/components/AppHeader.vue'

defineOptions({ name: 'DefaultLayout' })
</script>
