<template>
  <main class="flex flex-1 flex-col items-center justify-center px-6 py-20">
    <img
      src="/Logo%20La%20Femme.png"
      alt="La Femme Lingerie"
      class="h-40 w-auto object-contain"
    />

    <h1 class="mt-8 font-display text-4xl font-semibold text-brand">
      La Femme
    </h1>

    <p class="mt-3 text-center font-sans text-lg font-light text-wine-700">
      Lingerie exclusiva, moderna e acessível.
    </p>

    <BaseButton
      id="index-cta"
      label="Ver Catálogo"
      variant="primary"
      size="lg"
      class="mt-10"
      @click="handleVerCatalogo"
    />
  </main>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

defineOptions({ name: 'IndexPage' })

function handleVerCatalogo() {
  navigateTo('/catalogo')
}
</script>