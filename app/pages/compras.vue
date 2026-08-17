<template>
  <main class="flex flex-1 flex-col px-6 py-10">
    <header
      id="compras-header"
      class="mb-6 flex items-center justify-between gap-4 border-b border-wine-100 pb-4"
    >
      <h1 class="font-display text-3xl font-semibold text-brand">Compras</h1>
    </header>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

defineOptions({ name: 'ComprasPage' })
</script>