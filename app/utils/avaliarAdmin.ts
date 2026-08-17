export type ResultadoAvaliacaoAdmin =
  | { tipo: 'sem_usuario' }
  | { tipo: 'nao_admin' }
  | { tipo: 'ok' }

export function avaliarAdmin(usuario: unknown, isAdmin: boolean): ResultadoAvaliacaoAdmin {
  if (!usuario) {
    return { tipo: 'sem_usuario' }
  }

  if (isAdmin !== true) {
    return { tipo: 'nao_admin' }
  }

  return { tipo: 'ok' }
}