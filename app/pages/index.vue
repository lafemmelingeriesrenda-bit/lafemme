<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Dashboard" />

    <div class="flex flex-1 flex-col items-center justify-center px-2 py-10">
      <img
        src="/Logo%20La%20Femme.png"
        alt="La Femme Lingerie"
        class="h-32 w-auto object-contain sm:h-40"
      />

      <h1 class="mt-8 font-display text-3xl font-semibold text-brand sm:text-4xl">
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
    </div>
  </main>
</template>

<script setup lang="ts">
import AdminHeader from '~/components/AdminHeader.vue'
import BaseButton from '~/components/BaseButton.vue'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

defineOptions({ name: 'IndexPage' })

function handleVerCatalogo() {
  navigateTo('/catalogo')
}
</script>