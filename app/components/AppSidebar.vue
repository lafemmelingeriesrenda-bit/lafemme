<template>
  <aside
    id="app-sidebar"
    data-testid="app-sidebar"
    class="sticky top-0 flex h-screen shrink-0 flex-col border-r border-wine-100 bg-white transition-all duration-300"
    :class="collapsed ? 'w-20' : 'w-64'"
  >
    <div
      id="app-sidebar-header"
      class="flex items-center gap-2 border-b border-wine-100 px-3 py-3"
      :class="collapsed ? 'justify-center' : 'justify-between'"
    >
      <img
        v-if="!collapsed"
        id="app-sidebar-logo"
        src="/logo%202.png"
        alt="La Femme Lingerie"
        class="h-10 w-auto object-contain"
      />

      <button
        id="app-sidebar-toggle"
        type="button"
        class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50"
        :title="collapsed ? 'Abrir' : 'Fechar'"
        @click="collapsed = !collapsed"
      >
        <component
          :is="collapsed ? ChevronRightIcon : ChevronLeftIcon"
          class="h-6 w-6"
        />
      </button>
    </div>

    <nav id="app-sidebar-nav" class="flex flex-col gap-2 px-3 py-6">
      <button
        v-for="item in items"
        :key="item.id"
        :id="item.id"
        type="button"
        class="flex items-center gap-3 rounded-luxe px-3 py-3 font-sans text-sm font-medium transition"
        :class="[
          collapsed ? 'justify-center px-2' : 'justify-start',
          isActive(item)
            ? 'bg-brand text-cream'
            : 'text-wine-700 hover:bg-wine-50'
        ]"
        :aria-current="isActive(item) ? 'page' : undefined"
        @click="navigateTo(item.to)"
      >
        <component :is="item.icon" class="h-6 w-6 shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
      </button>
    </nav>

    <footer id="app-sidebar-footer" class="mt-auto border-t border-wine-100 px-4 py-4">
      <p
        v-if="!collapsed"
        class="truncate font-sans text-sm font-medium text-brand"
      >
        {{ userInfo }}
      </p>
    </footer>
  </aside>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UsersIcon
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'

interface NavItem {
  id: string
  label: string
  icon: object
  to: string
}

defineOptions({ name: 'AppSidebar' })

const collapsed = ref(false)
const route = useRoute()

const { user } = useAuth()

const userInfo = computed(() => {
  const name = user.value?.user_metadata?.name as string | undefined
  const email = user.value?.email
  const fallback = email ?? 'Visitante'

  return name ? `Olá, ${name}` : `Olá, ${fallback}`
})

function isActive(item: NavItem): boolean {
  return route.path === item.to
}

const items: NavItem[] = [
  { id: 'app-sidebar-catalogo', label: 'Catálogo', icon: ShoppingBagIcon, to: '/catalogo' },
  { id: 'app-sidebar-produtos', label: 'Produtos', icon: CubeIcon, to: '/produtos' },
  { id: 'app-sidebar-compras', label: 'Compras', icon: ShoppingCartIcon, to: '/compras' },
  { id: 'app-sidebar-clientes', label: 'Clientes', icon: UsersIcon, to: '/clientes' },
  { id: 'app-sidebar-relatorios', label: 'Relatórios', icon: ChartBarIcon, to: '/relatorios' }
]
</script>