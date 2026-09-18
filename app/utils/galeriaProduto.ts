import type { FotoProdutoPublica } from '~/types/fotos-produto'

export function normalizarCor(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

export function mesmaCor(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizarCor(a) === normalizarCor(b)
}

/**
 * Monta a galeria da página pública para a cor selecionada:
 * - a capa (global do produto, quando existir) vem primeiro;
 * - em seguida, apenas as fotos complementares da mesma cor;
 * - duplicidades por URL são removidas, preservando a ordem de entrada.
 */
export function montarGaleria(
  capa: string | null | undefined,
  fotos: FotoProdutoPublica[],
  cor: string | null | undefined
): string[] {
  const galeria: string[] = []

  if (typeof capa === 'string' && capa.length > 0) {
    galeria.push(capa)
  }

  for (const foto of fotos) {
    if (!mesmaCor(foto.cor, cor)) {
      continue
    }

    if (typeof foto.url !== 'string' || foto.url.length === 0) {
      continue
    }

    if (!galeria.includes(foto.url)) {
      galeria.push(foto.url)
    }
  }

  return galeria
}
