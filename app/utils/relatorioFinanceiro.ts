import { dataHojeLocal } from '~/utils/compraAdmin'
import type {
  ClassificacaoVencimento,
  EvolucaoMensalFinanceira,
  PresetPeriodo
} from '~/types/relatorio-financeiro'

export const PERIODO_PRESETS: Array<{ valor: PresetPeriodo; label: string }> = [
  { valor: 'mes-atual', label: 'Este mês' },
  { valor: 'mes-anterior', label: 'Mês anterior' },
  { valor: 'ultimos-3', label: 'Últimos 3 meses' },
  { valor: 'ano-atual', label: 'Este ano' },
  { valor: 'personalizado', label: 'Personalizado' }
]

const MESES_ABREVIADOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
]

export const CLASSIFICACAO_VENCIMENTO_LABEL: Record<ClassificacaoVencimento, string> = {
  vencida: 'Vencida',
  hoje: 'Vence hoje',
  a_vencer: 'A vencer',
  sem_vencimento: 'Sem vencimento'
}

function pad2(valor: number): string {
  return String(valor).padStart(2, '0')
}

function primeiroDia(ano: number, mes: number): string {
  return `${ano}-${pad2(mes)}-01`
}

function ultimoDia(ano: number, mes: number): string {
  const data = new Date(ano, mes, 0)

  return `${data.getFullYear()}-${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`
}

export function resolverPeriodo(
  preset: PresetPeriodo,
  hoje: Date = new Date()
): { dataInicio: string; dataFim: string } | null {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const fim = dataHojeLocal(hoje)

  switch (preset) {
    case 'mes-atual':
      return { dataInicio: primeiroDia(ano, mes), dataFim: fim }

    case 'mes-anterior': {
      const anterior = new Date(ano, mes - 2, 1)
      const anoAnterior = anterior.getFullYear()
      const mesAnterior = anterior.getMonth() + 1
      return { dataInicio: primeiroDia(anoAnterior, mesAnterior), dataFim: ultimoDia(anoAnterior, mesAnterior) }
    }

    case 'ultimos-3': {
      const inicio = new Date(ano, mes - 3, 1)
      return { dataInicio: primeiroDia(inicio.getFullYear(), inicio.getMonth() + 1), dataFim: fim }
    }

    case 'ano-atual':
      return { dataInicio: `${ano}-01-01`, dataFim: fim }

    default:
      return null
  }
}

export function classificarVencimento(
  vencimento: string | null,
  hoje: string = dataHojeLocal()
): ClassificacaoVencimento {
  if (!vencimento) {
    return 'sem_vencimento'
  }

  if (vencimento < hoje) {
    return 'vencida'
  }

  if (vencimento === hoje) {
    return 'hoje'
  }

  return 'a_vencer'
}

export function completarMeses(
  evolucao: EvolucaoMensalFinanceira[],
  dataInicio: string,
  dataFim: string
): EvolucaoMensalFinanceira[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
    return evolucao
  }

  const porMes = new Map(evolucao.map((item) => [item.mes, item]))
  const resultado: EvolucaoMensalFinanceira[] = []

  let ano = Number(dataInicio.slice(0, 4))
  let mes = Number(dataInicio.slice(5, 7))
  const anoFim = Number(dataFim.slice(0, 4))
  const mesFim = Number(dataFim.slice(5, 7))

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    const chave = `${ano}-${pad2(mes)}`

    resultado.push(
      porMes.get(chave) ?? {
        mes: chave,
        total: 0,
        mercadorias: 0,
        despesas: 0,
        pago: 0,
        pendente: 0
      }
    )

    mes += 1

    if (mes > 12) {
      mes = 1
      ano += 1
    }
  }

  return resultado
}

export function formatarMesLabel(mes: string): string {
  const [ano, mesNumero] = mes.split('-')
  const indice = Number(mesNumero) - 1

  if (!ano || !Number.isInteger(indice) || indice < 0 || indice > 11) {
    return mes
  }

  return `${MESES_ABREVIADOS[indice]}/${ano}`
}

export function nomeFornecedor(nome: string | null): string {
  return nome && nome.trim().length > 0 ? nome : 'Sem fornecedor'
}

export function formatarMoedaCompacta(valor: number): string {
  if (!Number.isFinite(valor)) {
    return 'R$ 0'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(valor)
}
