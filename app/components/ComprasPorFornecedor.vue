<template>
  <section id="relatorios-fornecedores" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <div class="mb-4 flex items-center justify-between gap-2">
      <div>
        <h2 class="font-display text-lg font-semibold text-brand">Compras por fornecedor</h2>
        <p class="font-sans text-xs text-wine-500">Volume financeiro no período.</p>
      </div>

      <BaseButton
        v-if="itens.length > LIMITE"
        id="relatorios-fornecedores-toggle"
        :label="mostrarTodos ? 'Ver menos' : 'Ver todos'"
        variant="ghost"
        size="sm"
        @click="mostrarTodos = !mostrarTodos"
      />
    </div>

    <p v-if="itens.length === 0" class="font-sans text-sm text-wine-600">
      Nenhuma compra no período.
    </p>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="item in visiveis" :key="`${item.fornecedor_id ?? 'sem'}`" class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-3 font-sans text-sm">
          <span class="truncate text-ink">{{ nomeFornecedor(item.fornecedor_nome) }}</span>
          <span class="whitespace-nowrap text-wine-600">
            {{ formatarMoeda(item.total) }} · {{ item.quantidade_compras }}
            {{ item.quantidade_compras === 1 ? 'compra' : 'compras' }}
          </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-wine-100">
          <div
            class="h-2 rounded-full bg-brand-light"
            :style="{ width: `${Math.min(100, Math.max(0, item.percentual))}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'
import { formatarMoeda } from '~/utils/pedidoAdmin'
import { nomeFornecedor } from '~/utils/relatorioFinanceiro'
import type { FornecedorFinanceiroResumo } from '~/types/relatorio-financeiro'

const LIMITE = 5

interface Props {
  itens: FornecedorFinanceiroResumo[]
}

const props = defineProps<Props>()

const mostrarTodos = ref(false)

const visiveis = computed(() => (mostrarTodos.value ? props.itens : props.itens.slice(0, LIMITE)))

defineOptions({ name: 'ComprasPorFornecedor' })
</script>
