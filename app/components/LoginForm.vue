<template>
  <div class="flex w-full max-w-md flex-col rounded-luxe border border-wine-100 bg-white p-8 shadow-luxe sm:p-10">
    <div class="text-center">
      <h1 class="font-display text-3xl font-semibold text-brand">
        {{ activeTab === 'login' ? 'Acesse sua conta' : 'Crie sua conta' }}
      </h1>
    </div>

    <div class="mt-8 grid grid-cols-2 gap-1 rounded-full bg-wine-50 p-1">
      <button
        type="button"
        class="rounded-full py-2.5 font-sans text-sm font-medium transition"
        :class="activeTab === 'login' ? 'bg-brand text-cream shadow-soft' : 'text-wine-700 hover:text-brand'"
        @click="activeTab = 'login'"
      >
        Entrar
      </button>
      <button
        type="button"
        class="rounded-full py-2.5 font-sans text-sm font-medium transition"
        :class="activeTab === 'register' ? 'bg-brand text-cream shadow-soft' : 'text-wine-700 hover:text-brand'"
        @click="activeTab = 'register'"
      >
        Criar conta
      </button>
    </div>

    <form v-if="activeTab === 'login'" class="mt-8 space-y-5">
      <BaseInput
        v-model="loginForm.email"
        label="E-mail"
        type="email"
        placeholder="voce@exemplo.com"
      />
      <BaseInput
        v-model="loginForm.password"
        label="Senha"
        type="password"
        placeholder="Sua senha"
      />

      <BaseButton
        label="Entrar"
        variant="primary"
        class="w-full"
        :loading="loginLoading"
        @click="handleLogin"
      />
    </form>

    <form v-else class="mt-8 space-y-5">
      <BaseInput v-model="registerForm.name" label="Nome" placeholder="Seu nome" />
      <BaseInput
        v-model="registerForm.lastName"
        label="Sobrenome"
        placeholder="Seu sobrenome"
      />
      <BaseInput
        v-model="registerForm.phone"
        label="Telefone"
        type="tel"
        placeholder="(00) 00000-0000"
      />
      <BaseInput
        v-model="registerForm.email"
        label="E-mail"
        type="email"
        placeholder="voce@exemplo.com"
      />
      <BaseInput
        v-model="registerForm.password"
        label="Senha"
        type="password"
        placeholder="Crie uma senha"
      />
      <BaseInput
        v-model="registerForm.confirmPassword"
        label="Confirmar senha"
        type="password"
        placeholder="Repita sua senha"
      />

      <BaseButton
        label="Criar conta"
        variant="primary"
        class="w-full"
        :loading="registerLoading"
        @click="handleRegister"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import { useAuth } from '~/composables/useAuth'
import { useRegister } from '~/composables/useRegister'

type Tab = 'login' | 'register'

const activeTab = ref<Tab>('login')

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  name: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loginLoading = ref(false)
const registerLoading = ref(false)

const { login } = useAuth()
const { register } = useRegister()

function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const fallback = 'Algo deu errado. Tente novamente.'
  const errors: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar',
    'User already registered': 'Este e-mail já está cadastrado',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
    'Password should contain at least one letter and one number': 'A senha deve conter letras e números',
    'Signups not allowed for this instance': 'Cadastro indisponível no momento'
  }
  return errors[message] ?? fallback
}

async function handleLogin() {
  loginLoading.value = true
  try {
    await login(loginForm.email, loginForm.password)
    toast.success('Login realizado com sucesso!')
  } catch (error) {
    toast.error(authErrorMessage(error))
  } finally {
    loginLoading.value = false
  }
}

async function handleRegister() {
  if (registerForm.password !== registerForm.confirmPassword) {
    toast.error('As senhas não coincidem')
    return
  }
  registerLoading.value = true
  try {
    await register({
      name: registerForm.name,
      lastName: registerForm.lastName,
      phone: registerForm.phone,
      email: registerForm.email,
      password: registerForm.password
    })
    toast.success('Conta criada com sucesso!')
  } catch (error) {
    toast.error(authErrorMessage(error))
  } finally {
    registerLoading.value = false
  }
}

defineOptions({ name: 'LoginForm' })
</script>
