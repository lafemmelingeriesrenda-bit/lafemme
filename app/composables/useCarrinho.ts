import type { Carrinho, ItemCarrinho, NovoItemCarrinho } from '~/types/carrinho'

const CHAVE_LOCAL_STORAGE = 'la-femme:carrinho'

let inicializado = false

function carregarDoLocalStorage(): Carrinho | null {
  const salvo = window.localStorage.getItem(CHAVE_LOCAL_STORAGE)

  if (!salvo) {
    return null
  }

  try {
    const dado = JSON.parse(salvo) as Carrinho
    if (Array.isArray(dado.itens)) {
      return dado
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

  function adicionar(novo: NovoItemCarrinho, quantidade = 1): void {
    const qtd = Math.max(1, Math.floor(quantidade))
    const item = carrinho.value.itens.find((i) => i.varianteId === novo.varianteId)

    if (item) {
      item.quantidade += qtd
    } else {
      carrinho.value.itens.push({ ...novo, quantidade: qtd })
    }

    persistir()
  }

  function remover(varianteId: number): void {
    carrinho.value.itens = carrinho.value.itens.filter((i) => i.varianteId !== varianteId)
    persistir()
  }

  function aumentar(varianteId: number): void {
    const item = carrinho.value.itens.find((i) => i.varianteId === varianteId)

    if (item) {
      item.quantidade += 1
      persistir()
    }
  }

  function diminuir(varianteId: number): void {
    const item = carrinho.value.itens.find((i) => i.varianteId === varianteId)

    if (item) {
      item.quantidade = Math.max(1, item.quantidade - 1)
      persistir()
    }
  }

  function alterarQuantidade(varianteId: number, quantidade: number): void {
    const item = carrinho.value.itens.find((i) => i.varianteId === varianteId)

    if (!item) {
      return
    }

    if (quantidade <= 0) {
      remover(varianteId)
      return
    }

    item.quantidade = Math.floor(quantidade)
    persistir()
  }

  function limpar(): void {
    carrinho.value = { itens: [] }
    persistir()
  }

  function temItem(varianteId: number): boolean {
    return carrinho.value.itens.some((i) => i.varianteId === varianteId)
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
    limpar,
    temItem,
    quantidadeTotal,
    subtotal
  }
}