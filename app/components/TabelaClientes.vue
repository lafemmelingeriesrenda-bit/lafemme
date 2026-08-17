<template>
  <div class="w-full">
    <div id="tabela-clientes-search" class="relative mb-6 max-w-md">
      <MagnifyingGlassIcon
        class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-wine-400"
      />
      <input
        id="tabela-clientes-search-input"
        type="search"
        v-model="busca"
        placeholder="Buscar cliente..."
        class="w-full rounded-luxe border border-wine-200 bg-white py-2.5 pl-10 pr-4 font-sans text-sm text-ink outline-none transition placeholder:font-light placeholder:text-wine-300 focus:border-brand focus:ring-2 focus:ring-wine-200"
      />
    </div>

    <p v-if="loading" class="font-sans text-lg text-wine-700">
      Carregando clientes...
    </p>

    <p v-else-if="error" class="font-sans text-lg text-wine-700">
      {{ error }}
    </p>

    <div
      v-else
      class="overflow-x-auto rounded-luxe border border-wine-100 bg-white shadow-soft"
    >
      <table id="tabela-clientes" class="w-full text-left font-sans text-sm">
        <thead class="border-b border-wine-100 bg-wine-50 text-xs uppercase tracking-wider text-wine-600">
          <tr>
            <th id="tabela-clientes-th-nome" class="px-6 py-3 font-semibold">Nome</th>
            <th id="tabela-clientes-th-telefone" class="px-6 py-3 font-semibold">Telefone</th>
            <th id="tabela-clientes-th-nascimento" class="px-6 py-3 font-semibold">Nascimento</th>
            <th id="tabela-clientes-th-criado" class="px-6 py-3 font-semibold">Cadastrado em</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cliente in filtrados"
            :key="cliente.id"
            class="border-b border-wine-100 last:border-0"
          >
            <td class="px-6 py-3 font-medium text-brand">
              {{ nomeCompleto(cliente.nome, cliente.sobrenome) }}
            </td>
            <td class="px-6 py-3 text-wine-700">{{ telefoneTexto(cliente.telefone) }}</td>
            <td class="px-6 py-3 text-wine-700">{{ dataTexto(cliente.data_nascimento) }}</td>
            <td class="px-6 py-3 text-wine-500">{{ dataTexto(cliente.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import type { AdminCliente } from '~/types/cliente-api'

const busca = ref('')

const { data: clientes, pending, error: queryError, refresh } = await useAsyncData(
  'clientes_admin',
  async () => {
    return await $fetch<AdminCliente[]>('/api/admin/clientes')
  }
)

defineExpose({ refresh })

const loading = pending
const error = computed(() => queryError.value?.message ?? null)

const filtrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const rows: AdminCliente[] = Array.isArray(clientes.value) ? clientes.value : []

  if (!termo) {
    return rows
  }

  return rows.filter((cliente) => {
    const nome = nomeCompleto(cliente.nome, cliente.sobrenome).toLowerCase()
    const telefone = telefoneTexto(cliente.telefone)
    return nome.includes(termo) || telefone.includes(termo)
  })
})

function nomeCompleto(nome: string | null, sobrenome: string | null): string {
  return [nome, sobrenome].filter(Boolean).join(' ')
}

function telefoneTexto(telefone: string | null): string {
  if (!telefone) {
    return '—'
  }
  const digitos = telefone.replace(/\D/g, '')
  return digitos.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
}

function dataTexto(data: string | null): string {
  if (!data) {
    return '—'
  }
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

defineOptions({ name: 'TabelaClientes' })
</script>