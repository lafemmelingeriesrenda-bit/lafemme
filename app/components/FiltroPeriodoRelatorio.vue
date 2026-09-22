<template>
  <section id="relatorios-filtro-periodo" class="rounded-luxe border border-wine-100 bg-white p-4 shadow-soft">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="preset in PERIODO_PRESETS"
        :id="`relatorios-periodo-${preset.valor}`"
        :key="preset.valor"
        type="button"
        class="rounded-full px-3 py-1.5 font-sans text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          presetLocal === preset.valor
            ? 'bg-brand text-cream'
            : 'border border-wine-200 text-wine-700 hover:border-brand hover:text-brand'
        "
        :disabled="carregando"
        @click="selecionar(preset.valor)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div v-if="presetLocal === 'personalizado'" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-lg">
      <BaseInput id="relatorios-data-inicio" v-model="inicioLocal" label="De" type="date" />
      <BaseInput id="relatorios-data-fim" v-model="fimLocal" label="Até" type="date" />

      <div class="sm:col-span-2">
        <BaseButton
          id="relatorios-aplicar"
          label="Aplicar"
          variant="primary"
          size="md"
          :loading="carregando"
          @click="aplicarPersonalizado"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import BaseButton from '~/components/BaseButton.vue'
import BaseInput from '~/components/BaseInput.vue'
import { PERIODO_PRESETS, resolverPeriodo } from '~/utils/relatorioFinanceiro'
import type { PresetPeriodo } from '~/types/relatorio-financeiro'

interface Props {
  preset: PresetPeriodo
  dataInicio: string
  dataFim: string
  carregando?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  carregando: false
})

const emit = defineEmits<{
  aplicar: [payload: { preset: PresetPeriodo; dataInicio: string; dataFim: string }]
}>()

const presetLocal = ref<PresetPeriodo>(props.preset)
const inicioLocal = ref(props.dataInicio)
const fimLocal = ref(props.dataFim)

watch(
  () => [props.preset, props.dataInicio, props.dataFim] as const,
  ([preset, inicio, fim]) => {
    presetLocal.value = preset
    inicioLocal.value = inicio
    fimLocal.value = fim
  }
)

function selecionar(preset: PresetPeriodo) {
  presetLocal.value = preset

  if (preset === 'personalizado') {
    return
  }

  const periodo = resolverPeriodo(preset)

  if (!periodo) {
    return
  }

  inicioLocal.value = periodo.dataInicio
  fimLocal.value = periodo.dataFim

  emit('aplicar', { preset, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim })
}

function aplicarPersonalizado() {
  emit('aplicar', { preset: 'personalizado', dataInicio: inicioLocal.value, dataFim: fimLocal.value })
}

defineOptions({ name: 'FiltroPeriodoRelatorio' })
</script>
