export function useMenuAdmin() {
  const aberto = useState<boolean>('admin-menu-aberto', () => false)

  function abrir() {
    aberto.value = true
  }

  function fechar() {
    aberto.value = false
  }

  function toggle() {
    aberto.value = !aberto.value
  }

  return { aberto, abrir, fechar, toggle }
}
