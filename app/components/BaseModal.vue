<template>
  <Teleport to="body">
    <div
      v-if="aberto"
      id="base-modal-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      @click.self="emit('fechar')"
    >
      <div
        id="base-modal"
        class="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-luxe bg-white shadow-luxe"
        role="dialog"
        aria-modal="true"
        :aria-label="titulo"
      >
        <header
          id="base-modal-header"
          class="flex items-center justify-between border-b border-wine-100 px-6 py-4"
        >
          <h2 id="base-modal-title" class="font-display text-xl font-semibold text-brand">
            {{ titulo }}
          </h2>
          <button
            id="base-modal-close"
            type="button"
            class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
            aria-label="Fechar"
            @click="emit('fechar')"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </header>

        <div id="base-modal-body" class="flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>

        <footer
          id="base-modal-footer"
          class="flex flex-col gap-3 border-t border-wine-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6"
        >
          <slot name="footer">
            <BaseButton
              id="base-modal-cancel"
              :label="textoCancelar"
              variant="outline"
              size="md"
              full-width
              @click="emit('fechar')"
            />
            <BaseButton
              id="base-modal-confirm"
              :label="textoConfirmar"
              variant="primary"
              size="md"
              full-width
              @click="emit('confirmar')"
            />
          </slot>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/BaseButton.vue'

interface Props {
  aberto: boolean
  titulo: string
  textoConfirmar?: string
  textoCancelar?: string
}

const props = withDefaults(defineProps<Props>(), {
  textoConfirmar: 'Salvar',
  textoCancelar: 'Cancelar'
})

const emit = defineEmits<{
  fechar: []
  confirmar: []
}>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('fechar')
  }
}

watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

defineOptions({ name: 'BaseModal' })
</script>