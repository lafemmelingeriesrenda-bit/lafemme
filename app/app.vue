<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster
      position="top-center"
      theme="light"
      :duration="2500"
      :offset="24"
      :mobile-offset="16"
      :close-button="true"
      close-button-position="top-right"
      :visible-toasts="1"
    />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>
