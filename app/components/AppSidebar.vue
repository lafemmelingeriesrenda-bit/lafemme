<template>
  <aside
    id="app-sidebar"
    data-testid="app-sidebar"
    class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-wine-100 bg-white transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0"
    :class="[
      aberto ? 'translate-x-0' : '-translate-x-full',
      collapsed ? 'lg:w-20' : 'lg:w-64'
    ]"
  >
    <div
      id="app-sidebar-header"
      class="flex items-center justify-between gap-2 border-b border-wine-100 px-3 py-3"
      :class="collapsed ? 'lg:justify-center' : 'lg:justify-between'"
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
        class="hidden rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50 lg:inline-flex"
        :title="collapsed ? 'Abrir' : 'Fechar'"
        @click="collapsed = !collapsed"
      >
        <component
          :is="collapsed ? ChevronRightIcon : ChevronLeftIcon"
          class="h-6 w-6"
        />
      </button>

      <button
        id="app-sidebar-fechar"
        type="button"
        class="rounded-luxe p-2 text-wine-700 transition hover:bg-wine-50 lg:hidden"
        title="Fechar menu"
        aria-label="Fechar menu"
        @click="fechar"
      >
        <XMarkIcon class="h-6 w-6" />
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
          collapsed ? 'lg:justify-center lg:px-2' : 'lg:justify-start',
          isActive(item)
            ? 'bg-brand text-cream'
            : 'text-wine-700 hover:bg-wine-50'
        ]"
        :aria-current="isActive(item) ? 'page' : undefined"
        @click="handleNavegar(item)"
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
  BanknotesIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useMenuAdmin } from '~/composables/useMenuAdmin'

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
const { aberto, fechar } = useMenuAdmin()

const userInfo = computed(() => {
  const name = user.value?.user_metadata?.name as string | undefined
  const email = user.value?.email
  const fallback = email ?? 'Visitante'

  return name ? `Olá, ${name}` : `Olá, ${fallback}`
})

function isActive(item: NavItem): boolean {
  return route.path === item.to
}

function handleNavegar(item: NavItem) {
  navigateTo(item.to)
  fechar()
}

const items: NavItem[] = [
  { id: 'app-sidebar-catalogo', label: 'Catálogo', icon: ShoppingBagIcon, to: '/catalogo' },
  { id: 'app-sidebar-produtos', label: 'Produtos', icon: CubeIcon, to: '/produtos' },
  { id: 'app-sidebar-pedidos', label: 'Pedidos', icon: ShoppingCartIcon, to: '/pedidos' },
  { id: 'app-sidebar-clientes', label: 'Clientes', icon: UsersIcon, to: '/clientes' },
  { id: 'app-sidebar-fornecedores', label: 'Fornecedores', icon: TruckIcon, to: '/fornecedores' },
  { id: 'app-sidebar-compras', label: 'Compras', icon: BanknotesIcon, to: '/compras' },
  { id: 'app-sidebar-relatorios', label: 'Relatórios', icon: ChartBarIcon, to: '/relatorios' }
]
</script>