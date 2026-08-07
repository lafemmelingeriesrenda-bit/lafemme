<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster
      position="top-center"
      :theme="'light'"
      rich-colors
      :duration="4000"
      :close-button="true"
      :toast-options="{
        classNames: {
          toast: 'font-sans font-medium',
          description: 'text-sm'
        },
        style: {
          padding: '14px 16px',
          fontWeight: 500,
          borderRadius: '16px',
          border: '1px solid rgba(120, 41, 66, 0.25)',
          boxShadow: '0 10px 30px rgba(120, 41, 66, 0.25)'
        }
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>
