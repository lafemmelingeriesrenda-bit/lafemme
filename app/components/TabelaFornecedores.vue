<template>
  <div class="w-full">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative max-w-md flex-1">
        <MagnifyingGlassIcon
          class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-wine-400"
        />
        <input
          id="tabela-fornecedores-search-input"
          type="search"
          v-model="busca"
          placeholder="Buscar por nome, CNPJ, contato ou telefone..."
          class="w-full rounded-luxe border border-wine-200 bg-white py-2.5 pl-10 pr-4 font-sans text-sm text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
        />
      </div>

      <select
        id="tabela-fornecedores-filtro"
        v-model="filtro"
        class="w-full rounded-luxe border border-wine-200 bg-white px-4 py-2.5 font-sans text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-wine-200 sm:w-44"
      >
        <option value="todos">Todos</option>
        <option value="ativos">Ativos</option>
        <option value="inativos">Inativos</option>
      </select>
    </div>

    <p v-if="loading" class="font-sans text-lg text-wine-700">Carregando fornecedores...</p>

    <p v-else-if="erro" class="font-sans text-lg text-wine-700">{{ erro }}</p>

    <div
      v-else-if="!temFornecedores"
      class="flex flex-col items-center gap-4 rounded-luxe border border-wine-100 bg-white px-6 py-10 text-center shadow-soft"
    >
      <p class="font-sans text-lg text-wine-700">Nenhum fornecedor cadastrado.</p>
      <BaseButton
        id="tabela-fornecedores-vazio-novo"
        label="Cadastrar fornecedor"
        variant="primary"
        size="md"
        @click="emit('novo')"
      />
    </div>

    <p v-else-if="filtrados.length === 0" class="font-sans text-lg text-wine-700">
      Nenhum fornecedor encontrado com esses filtros.
    </p>

    <template v-else>
      <div id="tabela-fornecedores-cards" class="grid gap-4 md:hidden">
        <article
          v-for="fornecedor in filtrados"
          :key="fornecedor.id"
          class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="font-display text-base font-semibold text-brand">
              {{ fornecedor.nome }}
            </span>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="fornecedor.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-ink/10 text-ink'"
            >
              {{ fornecedor.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </div>

          <dl class="mt-3 flex flex-col gap-1 font-sans text-sm text-wine-700">
            <div class="flex justify-between gap-3">
              <dt class="text-wine-500">CNPJ</dt>
              <dd>{{ formatarCnpj(fornecedor.cnpj) || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-wine-500">Telefone</dt>
              <dd>{{ formatarTelefoneFornecedor(fornecedor.telefone) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-wine-500">Contato</dt>
              <dd>{{ fornecedor.contato || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-wine-500">Atualizado em</dt>
              <dd>{{ dataTexto(fornecedor.updated_at) }}</dd>
            </div>
          </dl>

          <div class="mt-3 flex gap-2">
            <BaseButton
              :id="`tabela-fornecedores-card-${fornecedor.id}-editar`"
              label="Editar"
              variant="outline"
              size="sm"
              @click="emit('editar', fornecedor)"
            />
            <BaseButton
              :id="`tabela-fornecedores-card-${fornecedor.id}-status`"
              :label="fornecedor.ativo ? 'Desativar' : 'Ativar'"
              variant="ghost"
              size="sm"
              @click="emit('alterarStatus', fornecedor)"
            />
          </div>
        </article>
      </div>

      <div class="hidden overflow-x-auto rounded-luxe border border-wine-100 bg-white shadow-soft md:block">
        <table id="tabela-fornecedores" class="w-full text-left font-sans text-sm">
          <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wider text-wine-600">
            <tr>
              <th class="px-6 py-3 font-semibold">Nome</th>
              <th class="px-6 py-3 font-semibold">CNPJ</th>
              <th class="px-6 py-3 font-semibold">Telefone</th>
              <th class="hidden px-6 py-3 font-semibold lg:table-cell">Contato</th>
              <th class="px-6 py-3 font-semibold">Status</th>
              <th class="hidden px-6 py-3 font-semibold lg:table-cell">Atualizado em</th>
              <th class="px-6 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="fornecedor in filtrados"
              :key="fornecedor.id"
              class="border-b border-wine-100 last:border-0 hover:bg-wine-50/50"
            >
              <td class="px-6 py-3 font-medium text-brand">{{ fornecedor.nome }}</td>
              <td class="px-6 py-3 text-wine-700">{{ formatarCnpj(fornecedor.cnpj) || '—' }}</td>
              <td class="px-6 py-3 text-wine-700">{{ formatarTelefoneFornecedor(fornecedor.telefone) }}</td>
              <td class="hidden px-6 py-3 text-wine-700 lg:table-cell">{{ fornecedor.contato || '—' }}</td>
              <td class="px-6 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="fornecedor.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-ink/10 text-ink'"
                >
                  {{ fornecedor.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="hidden px-6 py-3 text-wine-500 lg:table-cell">{{ dataTexto(fornecedor.updated_at) }}</td>
              <td class="px-6 py-3">
                <div class="flex flex-wrap gap-2">
                  <BaseButton
                    :id="`tabela-fornecedores-${fornecedor.id}-editar`"
                    label="Editar"
                    variant="outline"
                    size="sm"
                    @click="emit('editar', fornecedor)"
                  />
                  <BaseButton
                    :id="`tabela-fornecedores-${fornecedor.id}-status`"
                    :label="fornecedor.ativo ? 'Desativar' : 'Ativar'"
                    variant="ghost"
                    size="sm"
                    @click="emit('alterarStatus', fornecedor)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/BaseButton.vue'
import { filtrarFornecedores, formatarCnpj, formatarTelefoneFornecedor } from '~/utils/fornecedorAdmin'
import type { AdminFornecedor, FiltroStatusFornecedor } from '~/types/fornecedor-admin'

const emit = defineEmits<{
  novo: []
  editar: [fornecedor: AdminFornecedor]
  alterarStatus: [fornecedor: AdminFornecedor]
}>()

const busca = ref('')
const filtro = ref<FiltroStatusFornecedor>('todos')

const { data: lista, pending, error: queryError, refresh } = await useAsyncData(
  'fornecedores_admin',
  async () => {
    return await $fetch<AdminFornecedor[]>('/api/admin/fornecedores')
  }
)

defineExpose({ refresh })

const loading = pending
const erro = computed(() => queryError.value?.message ?? null)
const temFornecedores = computed(() => Array.isArray(lista.value) && lista.value.length > 0)

const filtrados = computed(() => {
  const rows = Array.isArray(lista.value) ? lista.value : []
  const ativo = filtro.value === 'ativos' ? true : filtro.value === 'inativos' ? false : null

  return filtrarFornecedores(rows, { busca: busca.value, ativo })
})

function dataTexto(data: string): string {
  if (!data) {
    return '—'
  }

  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

defineOptions({ name: 'TabelaFornecedores' })
</script>
