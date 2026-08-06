<template>
  <main class="h-screen overflow-hidden bg-cream">
    <div class="grid h-full lg:grid-cols-2">
      <section class="flex items-center justify-center overflow-y-auto p-8">
        <LoginForm />
      </section>

      <section class="hidden overflow-hidden lg:block" aria-label="Imagem promocional">
        <img
          src="/form_login.png"
          alt="Imagem promocional La Femme"
          class="h-full w-full object-cover"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import LoginForm from '~/components/LoginForm.vue'

definePageMeta({ layout: false })

defineOptions({ name: 'LoginPage' })
</script>
