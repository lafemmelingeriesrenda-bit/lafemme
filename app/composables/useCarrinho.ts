import type { Carrinho, ItemCarrinho, NovoItemCarrinho } from '~/types/carrinho'

const CHAVE_LOCAL_STORAGE = 'la-femme:carrinho'

let inicializado = false

/**
 * Normaliza o estoque conhecido de uma variante.
 * Retorna `null` quando o valor é ausente/inválido (estoque desconhecido,
 * sem limite local) — preservando a compatibilidade com itens antigos do
 * localStorage, que não possuem esse campo.
 */
export function estoqueConhecido(valor: number | null | undefined): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return null
  }

  return Math.max(0, Math.floor(valor))
}

export function normalizarQuantidade(quantidade: number): number {
  if (!Number.isFinite(quantidade)) {
    return 1
  }

  return Math.max(1, Math.floor(quantidade))
}

/**
 * Normaliza um item carregado do localStorage, tolerando o formato antigo
 * (sem `estoqueDisponivel`) e quantidades inválidas.
 */
export function normalizarItemCarrinho(item: ItemCarrinho): ItemCarrinho {
  return {
    ...item,
    quantidade: normalizarQuantidade(item.quantidade),
    estoqueDisponivel: estoqueConhecido(item.estoqueDisponivel)
  }
}

export function carregarDoLocalStorage(): Carrinho | null {
  const salvo = window.localStorage.getItem(CHAVE_LOCAL_STORAGE)

  if (!salvo) {
    return null
  }

  try {
    const dado = JSON.parse(salvo) as Carrinho
    if (Array.isArray(dado.itens)) {
      return { itens: dado.itens.map(normalizarItemCarrinho) }
    }
  } catch {
    window.localStorage.removeItem(CHAVE_LOCAL_STORAGE)
  }

  return null
}

export function useCarrinho() {
  const carrinho = useState<Carrinho>('carrinho', () => ({ itens: [] }))

  if (import.meta.client && !inicializado) {
    inicializado = true
    const salvo = carregarDoLocalStorage()
    if (salvo) {
      carrinho.value = salvo
    }
  }

  function persistir(): void {
    if (!import.meta.client) {
      return
    }
    window.localStorage.setItem(CHAVE_LOCAL_STORAGE, JSON.stringify(carrinho.value))
  }

  function encontrar(varianteId: number): ItemCarrinho | undefined {
    return carrinho.value.itens.find((item) => item.varianteId === varianteId)
  }

  function adicionar(novo: NovoItemCarrinho, quantidade = 1): void {
    const qtd = normalizarQuantidade(quantidade)
    const item = encontrar(novo.varianteId)

    if (item) {
      if (novo.estoqueDisponivel !== undefined) {
        item.estoqueDisponivel = estoqueConhecido(novo.estoqueDisponivel)
      }

      const limite = estoqueConhecido(item.estoqueDisponivel)

      if (limite === null) {
        item.quantidade += qtd
      } else if (limite >= 1) {
        item.quantidade = Math.min(item.quantidade + qtd, limite)
      }
    } else {
      const limite = estoqueConhecido(novo.estoqueDisponivel)

      if (limite !== null && limite < 1) {
        return
      }

      const quantidadeFinal = limite === null ? qtd : Math.min(qtd, limite)
      carrinho.value.itens.push({ ...novo, quantidade: quantidadeFinal })
    }

    persistir()
  }

  function remover(varianteId: number): void {
    carrinho.value.itens = carrinho.value.itens.filter((item) => item.varianteId !== varianteId)
    persistir()
  }

  function aumentar(varianteId: number): void {
    const item = encontrar(varianteId)

    if (!item) {
      return
    }

    const limite = estoqueConhecido(item.estoqueDisponivel)

    if (limite !== null && item.quantidade >= limite) {
      return
    }

    item.quantidade += 1
    persistir()
  }

  function diminuir(varianteId: number): void {
    const item = encontrar(varianteId)

    if (item) {
      item.quantidade = Math.max(1, item.quantidade - 1)
      persistir()
    }
  }

  function alterarQuantidade(varianteId: number, quantidade: number): void {
    const item = encontrar(varianteId)

    if (!item) {
      return
    }

    if (quantidade <= 0) {
      remover(varianteId)
      return
    }

    const desejada = normalizarQuantidade(quantidade)
    const limite = estoqueConhecido(item.estoqueDisponivel)

    if (limite === null) {
      item.quantidade = desejada
    } else if (limite >= 1) {
      item.quantidade = Math.min(desejada, limite)
    }

    persistir()
  }

  function definirEstoque(varianteId: number, estoque: number | null | undefined): void {
    const item = encontrar(varianteId)

    if (!item) {
      return
    }

    item.estoqueDisponivel = estoqueConhecido(estoque)
    persistir()
  }

  function limpar(): void {
    carrinho.value = { itens: [] }
    persistir()
  }

  function temItem(varianteId: number): boolean {
    return carrinho.value.itens.some((item) => item.varianteId === varianteId)
  }

  function estoqueMaximo(varianteId: number): number | null {
    const item = encontrar(varianteId)
    return item ? estoqueConhecido(item.estoqueDisponivel) : null
  }

  function podeAumentar(varianteId: number): boolean {
    const item = encontrar(varianteId)

    if (!item) {
      return false
    }

    const limite = estoqueConhecido(item.estoqueDisponivel)
    return limite === null || item.quantidade < limite
  }

  const itens = computed<ItemCarrinho[]>(() => carrinho.value.itens)

  const quantidadeTotal = computed<number>(() =>
    carrinho.value.itens.reduce((total, item) => total + item.quantidade, 0)
  )

  const subtotal = computed<number>(() =>
    carrinho.value.itens.reduce((total, item) => total + item.valor * item.quantidade, 0)
  )

  return {
    carrinho,
    itens,
    adicionar,
    remover,
    aumentar,
    diminuir,
    alterarQuantidade,
    definirEstoque,
    limpar,
    temItem,
    estoqueMaximo,
    podeAumentar,
    quantidadeTotal,
    subtotal
  }
}
