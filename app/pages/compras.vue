<template>
  <main class="flex min-w-0 flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
    <AdminHeader titulo="Compras" class="mb-6" />
  </main>
</template>

<script setup lang="ts">
import AdminHeader from '~/components/AdminHeader.vue'

definePageMeta({ layout: 'layout-principal', middleware: 'admin' })

defineOptions({ name: 'ComprasPage' })
</script>