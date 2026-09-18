<template>
  <Teleport to="body">
    <Transition name="carrinho-drawer" appear>
      <div
        v-if="aberto"
        id="carrinho-drawer"
        class="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Sua sacola"
      >
        <div
          id="carrinho-drawer-overlay"
          class="absolute inset-0 bg-ink/50"
          aria-hidden="true"
          @click="emit('fechar')"
        />

        <aside
          id="carrinho-drawer-panel"
          class="carrinho-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-luxe"
        >
          <header
            id="carrinho-drawer-header"
            class="flex items-center justify-between border-b border-wine-100 px-5 py-4"
          >
            <div class="flex items-baseline gap-2">
              <h2 id="carrinho-drawer-title" class="font-display text-xl font-semibold text-brand">
                {{ passo === 'dados' ? 'Seus dados' : 'Sua sacola' }}
              </h2>
              <span id="carrinho-drawer-count" class="font-sans text-sm font-medium text-wine-700">
                {{ quantidadeTotal }}
              </span>
            </div>
            <button
              id="carrinho-drawer-close"
              type="button"
              class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
              aria-label="Fechar sacola"
              @click="emit('fechar')"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </header>

          <div id="carrinho-drawer-body" class="flex-1 overflow-y-auto px-5 py-2">
            <div
              v-if="concluido"
              id="carrinho-drawer-concluido"
              class="flex h-full flex-col items-center justify-center gap-3 text-center"
            >
              <CheckCircleIcon class="h-14 w-14 text-emerald-500" aria-hidden="true" />
              <p class="font-display text-xl font-medium text-brand">
                Pedido #{{ pedidoConcluido?.id }} criado com sucesso!
              </p>
              <p class="max-w-xs font-sans text-sm text-wine-700">
                Agora vamos abrir o WhatsApp para você continuar seu atendimento.
              </p>
              <BaseButton
                id="carrinho-drawer-concluido-whatsapp"
                label="Abrir WhatsApp"
                variant="primary"
                size="md"
                class="mt-2"
                @click="abrirWhatsAppNovamente"
              />
              <BaseButton
                id="carrinho-drawer-concluido-fechar"
                label="Continuar comprando"
                variant="outline"
                size="md"
                @click="emit('fechar')"
              />
            </div>

            <FormularioPedido
              v-else-if="passo === 'dados'"
              class="pt-2"
              @voltar="passo = 'sacola'"
              @concluido="handleConcluido"
            />

            <div
              v-else-if="itens.length === 0"
              id="carrinho-drawer-vazio"
              class="flex h-full flex-col items-center justify-center gap-3 text-center"
            >
              <ShoppingBagIcon class="h-14 w-14 text-wine-200" aria-hidden="true" />
              <p class="font-display text-xl font-medium text-brand">Sua sacola está vazia.</p>
              <p class="max-w-xs font-sans text-sm text-wine-700">
                Explore nosso catálogo e escolha suas favoritas.
              </p>
              <BaseButton
                id="carrinho-drawer-continuar-vazio"
                label="Continuar comprando"
                variant="primary"
                size="md"
                class="mt-2"
                @click="emit('fechar')"
              />
            </div>

            <div v-else id="carrinho-drawer-itens">
              <article
                v-for="item in itens"
                :id="`carrinho-drawer-item-${item.varianteId}`"
                :key="item.varianteId"
                class="flex gap-4 border-b border-wine-100 py-4"
              >
                <div
                  class="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-luxe border border-wine-100 bg-wine-50"
                >
                  <img
                    v-if="item.foto"
                    :src="item.foto"
                    :alt="item.nome"
                    class="h-full w-full object-cover"
                  />
                  <span v-else class="px-1 text-center font-sans text-xs text-wine-300">
                    Sem imagem
                  </span>
                </div>

                <div class="flex flex-1 flex-col gap-1">
                  <p class="font-sans text-sm font-medium text-brand">{{ item.nome }}</p>
                  <p v-if="item.cor" class="font-sans text-xs text-wine-700">
                    Cor: {{ item.cor }}
                  </p>
                  <p class="font-sans text-xs text-wine-700">Tamanho: {{ item.tamanho }}</p>
                  <p class="font-sans text-sm font-semibold text-brand">
                    {{ formatPrice(item.valor) }}
                  </p>

                  <div class="mt-2 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded-full border border-wine-200 p-1.5 text-wine-700 transition hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
                        :aria-label="`Diminuir quantidade de ${item.nome}`"
                        @click="diminuir(item.varianteId)"
                      >
                        <MinusIcon class="h-4 w-4" />
                      </button>
                      <span
                        class="w-6 text-center font-sans text-sm font-medium text-brand"
                      >
                        {{ item.quantidade }}
                      </span>
                      <button
                        type="button"
                        class="rounded-full border border-wine-200 p-1.5 text-wine-700 transition hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light disabled:cursor-not-allowed disabled:opacity-40"
                        :aria-label="`Aumentar quantidade de ${item.nome}`"
                        :disabled="!podeAumentar(item.varianteId)"
                        @click="aumentar(item.varianteId)"
                      >
                        <PlusIcon class="h-4 w-4" />
                      </button>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="font-sans text-sm font-semibold text-brand">
                        {{ formatPrice(item.valor * item.quantidade) }}
                      </span>
                      <button
                        type="button"
                        class="rounded-luxe p-1.5 text-wine-700 transition hover:bg-wine-50 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
                        :aria-label="`Remover ${item.nome} da sacola`"
                        @click="remover(item.varianteId)"
                      >
                        <TrashIcon class="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <p
                    v-if="atingiuEstoqueMaximo(item)"
                    class="mt-1 font-sans text-xs text-wine-500"
                  >
                    Quantidade máxima disponível em estoque.
                  </p>
                </div>
              </article>
            </div>
          </div>

          <footer
            v-if="itens.length > 0 && !concluido"
            id="carrinho-drawer-footer"
            class="border-t border-wine-100 px-5 py-4"
          >
            <div class="flex items-center justify-between">
              <span class="font-sans text-sm font-medium text-wine-700">Subtotal</span>
              <span class="font-display text-xl font-semibold text-brand">
                {{ formatPrice(subtotal) }}
              </span>
            </div>

            <div v-if="passo === 'sacola'" class="mt-4 flex flex-col gap-3">
              <BaseButton
                id="carrinho-drawer-continuar"
                label="Continuar comprando"
                variant="outline"
                size="md"
                @click="emit('fechar')"
              />
              <BaseButton
                id="carrinho-drawer-finalizar"
                label="Finalizar pedido"
                variant="primary"
                size="md"
                @click="passo = 'dados'"
              />
            </div>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircleIcon, MinusIcon, PlusIcon, ShoppingBagIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/BaseButton.vue'
import FormularioPedido from '~/components/FormularioPedido.vue'
import { useCarrinho } from '~/composables/useCarrinho'
import { useWhatsApp } from '~/composables/useWhatsApp'
import type { ItemCarrinho } from '~/types/carrinho'
import type { PedidoCriado } from '~/types/pedido'

interface Props {
  aberto: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  fechar: []
}>()

defineOptions({ name: 'CarrinhoDrawer' })

const { itens, quantidadeTotal, subtotal, aumentar, diminuir, remover, podeAumentar, estoqueMaximo } =
  useCarrinho()
const { abrirWhatsAppPedido } = useWhatsApp()

function atingiuEstoqueMaximo(item: ItemCarrinho): boolean {
  const maximo = estoqueMaximo(item.varianteId)
  return maximo !== null && item.quantidade >= maximo
}

type Passo = 'sacola' | 'dados'

const passo = ref<Passo>('sacola')
const concluido = ref(false)
const pedidoConcluido = ref<PedidoCriado | null>(null)

function handleConcluido(pedido: PedidoCriado) {
  pedidoConcluido.value = pedido
  concluido.value = true
}

function abrirWhatsAppNovamente() {
  if (pedidoConcluido.value) {
    abrirWhatsAppPedido(pedidoConcluido.value)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('fechar')
  }
}

watch(
  () => { return props.aberto },
  (aberto) => {
    if (!aberto) {
      passo.value = 'sacola'
      concluido.value = false
      pedidoConcluido.value = null
    }

    if (!import.meta.client) {
      return
    }

    if (aberto) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }
  window.removeEventListener('keydown', onKeydown)
})

function formatPrice(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}
</script>

<style>
.carrinho-drawer-enter-active,
.carrinho-drawer-leave-active {
  transition: opacity 0.25s ease;
}

.carrinho-drawer-enter-active .carrinho-drawer-panel,
.carrinho-drawer-leave-active .carrinho-drawer-panel {
  transition: transform 0.25s ease;
}

.carrinho-drawer-enter-from,
.carrinho-drawer-leave-to {
  opacity: 0;
}

.carrinho-drawer-enter-from .carrinho-drawer-panel,
.carrinho-drawer-leave-to .carrinho-drawer-panel {
  transform: translateX(100%);
}
</style>